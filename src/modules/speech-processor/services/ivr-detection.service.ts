import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

interface IVROption {
  key: string;
  description: string;
  confidence: number;
}

interface DetectedMenu {
  callSid: string;
  options: IVROption[];
  fullText: string;
  timestamp: Date;
  confidence: number;
}

@Injectable()
export class IVRDetectionService {
  private readonly logger = new Logger(IVRDetectionService.name);
  
  // Common IVR patterns to detect
  private readonly ivrPatterns = [
    // Standard menu patterns - "press X for Y"
    /press\s+(\d+|\*|\#)\s+for\s+([^.,]+?)(?=\.|\,|press|to\s+\w+|\s*$)/gi,
    // "for X, press Y" 
    /for\s+([^.,]+?),?\s+press\s+(\d+|\*|\#)/gi,
    // "to X, press Y"
    /to\s+([^.,]+?),?\s+press\s+(\d+|\*|\#)/gi,
    // "dial X for Y"
    /dial\s+(\d+|\*|\#)\s+for\s+([^.,]+?)(?=\.|\,|dial|press|\s*$)/gi,
    
    // Menu confirmation patterns
    /you\s+have\s+reached/i,
    /thank\s+you\s+for\s+calling/i,
    /please\s+listen\s+carefully/i,
    /menu\s+options\s+have\s+changed/i,
  ];

  // Keywords that indicate different types of departments/services
  private readonly departmentKeywords = {
    sales: ['sales', 'new customer', 'purchase', 'buy', 'quote'],
    support: ['support', 'help', 'technical', 'problem', 'issue', 'troubleshoot'],
    billing: ['billing', 'payment', 'account', 'invoice', 'charge'],
    emergency: ['emergency', 'urgent', 'immediate', '911', 'crisis'],
    directory: ['directory', 'extension', 'operator', 'representative'],
    hours: ['hours', 'location', 'address', 'directions'],
  };

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('stt.final')
  handleFinalTranscript(event: { callSid: string; transcript: string; confidence: number; timestamp: Date }) {
    const { callSid, transcript, confidence, timestamp } = event;
    
    this.logger.log(`\n🎤 STT TRANSCRIPT RECEIVED for call ${callSid}:`);
    this.logger.log(`   📝 Text: "${transcript}"`);
    this.logger.log(`   📊 Confidence: ${(confidence * 100).toFixed(1)}%`);
    
    const detectedMenu = this.detectIVRMenu(callSid, transcript, confidence, timestamp);
    
    if (detectedMenu) {
      this.logger.log(`\n🎯 IVR MENU DETECTED! Found ${detectedMenu.options.length} options:`);
      this.logger.log('   =====================================');
      
      detectedMenu.options.forEach((option, index) => {
        this.logger.log(`   ${index + 1}. Press [${option.key}] → ${option.description}`);
        this.logger.log(`      Confidence: ${(option.confidence * 100).toFixed(1)}%`);
      });
      
      this.logger.log('   =====================================\n');
      
      this.eventEmitter.emit('ivr.menu_detected', detectedMenu);
      
      // Emit each option separately for easier processing
      detectedMenu.options.forEach(option => {
        this.eventEmitter.emit('ivr.option_detected', {
          callSid,
          key: option.key,
          description: option.description,
          confidence: option.confidence,
          timestamp,
        });
      });
    } else {
      this.logger.log(`   ❌ No IVR menu patterns detected in this transcript\n`);
    }
  }

  private detectIVRMenu(callSid: string, transcript: string, confidence: number, timestamp: Date): DetectedMenu | null {
    const text = transcript.toLowerCase();
    const options: IVROption[] = [];
    
    // Check if this looks like an IVR menu
    if (!this.isLikelyIVRMenu(text)) {
      return null;
    }

    // Extract menu options using different patterns
    for (const pattern of this.ivrPatterns) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        let key: string;
        let description: string;
        
        // Handle different capture group orders based on pattern
        if (pattern.source.includes('press\\s+(\\d+|\\*|\\#)\\s+for')) {
          // "press X for Y" pattern
          key = match[1];
          description = match[2];
        } else if (pattern.source.includes('for\\s+([^.,]+?),?\\s+press') || 
                   pattern.source.includes('to\\s+([^.,]+?),?\\s+press')) {
          // "for Y, press X" or "to Y, press X" pattern  
          key = match[2];
          description = match[1];
        } else if (pattern.source.includes('dial\\s+(\\d+|\\*|\\#)\\s+for')) {
          // "dial X for Y" pattern
          key = match[1];
          description = match[2];
        } else {
          continue;
        }

        if (key && description) {
          const cleanDescription = this.cleanDescription(description);
          const optionConfidence = this.calculateOptionConfidence(cleanDescription);
          
          options.push({
            key: key.trim(),
            description: cleanDescription,
            confidence: Math.min(confidence, optionConfidence),
          });
        }
      }
    }

    if (options.length > 0) {
      // Remove duplicates
      const uniqueOptions = this.deduplicateOptions(options);
      
      return {
        callSid,
        options: uniqueOptions,
        fullText: transcript,
        timestamp,
        confidence: this.calculateMenuConfidence(uniqueOptions, text),
      };
    }

    return null;
  }

  private isLikelyIVRMenu(text: string): boolean {
    // Check for common IVR indicators
    const indicators = [
      'press', 'dial', 'enter', 'select',
      'for', 'menu', 'options', 'department',
      'representative', 'operator'
    ];
    
    const indicatorCount = indicators.filter(indicator => text.includes(indicator)).length;
    
    // Also check for number patterns
    const hasNumbers = /\b\d+\b/.test(text);
    
    return indicatorCount >= 2 || (indicatorCount >= 1 && hasNumbers);
  }

  private cleanDescription(description: string): string {
    return description
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[,\.]+$/, '') // Remove trailing punctuation
      .toLowerCase();
  }

  private calculateOptionConfidence(description: string): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for known department keywords
    for (const [category, keywords] of Object.entries(this.departmentKeywords)) {
      for (const keyword of keywords) {
        if (description.includes(keyword)) {
          confidence += 0.2;
          break;
        }
      }
    }
    
    // Common business terms
    const businessTerms = ['customer', 'service', 'information', 'hours', 'location'];
    for (const term of businessTerms) {
      if (description.includes(term)) {
        confidence += 0.1;
      }
    }
    
    return Math.min(confidence, 1.0);
  }

  private calculateMenuConfidence(options: IVROption[], text: string): number {
    if (options.length === 0) return 0;
    
    const avgOptionConfidence = options.reduce((sum, opt) => sum + opt.confidence, 0) / options.length;
    
    // Bonus for multiple options
    const optionCountBonus = Math.min(options.length * 0.1, 0.3);
    
    // Bonus for standard IVR language
    const standardPhrases = ['thank you for calling', 'please listen carefully', 'menu options'];
    const phraseBonus = standardPhrases.some(phrase => text.includes(phrase)) ? 0.2 : 0;
    
    return Math.min(avgOptionConfidence + optionCountBonus + phraseBonus, 1.0);
  }

  private deduplicateOptions(options: IVROption[]): IVROption[] {
    const seen = new Set<string>();
    return options.filter(option => {
      const key = option.key + ':' + option.description;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Method to suggest which option to select based on a goal
  suggestOption(options: IVROption[], goal: string): IVROption | null {
    const goalLower = goal.toLowerCase();
    
    // Direct keyword matching
    for (const option of options) {
      if (option.description.includes(goalLower)) {
        return option;
      }
    }
    
    // Category-based matching
    for (const [category, keywords] of Object.entries(this.departmentKeywords)) {
      if (keywords.some(keyword => goalLower.includes(keyword))) {
        for (const option of options) {
          if (keywords.some(keyword => option.description.includes(keyword))) {
            return option;
          }
        }
      }
    }
    
    return null;
  }

  // Get statistics about IVR detection
  getDetectionStats(): any {
    return {
      patterns: this.ivrPatterns.length,
      departmentCategories: Object.keys(this.departmentKeywords).length,
      totalKeywords: Object.values(this.departmentKeywords).flat().length,
    };
  }
}