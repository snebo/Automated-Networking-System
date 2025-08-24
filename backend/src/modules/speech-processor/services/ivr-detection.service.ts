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
  handleFinalTranscript(event: {
    callSid: string;
    transcript: string;
    confidence: number;
    timestamp: Date;
  }) {
    const { callSid, transcript, confidence, timestamp } = event;

    // First check if this is a voicemail prompt
    if (this.isVoicemailPrompt(transcript)) {
      this.eventEmitter.emit('ivr.voicemail_detected', {
        callSid,
        transcript,
        confidence,
        timestamp,
      });
      return; // Don't process as regular IVR menu
    }

    const detectedMenu = this.detectIVRMenu(callSid, transcript, confidence, timestamp);

    if (detectedMenu) {
      this.eventEmitter.emit('ivr.menu_detected', detectedMenu);

      // Emit each option separately for easier processing
      detectedMenu.options.forEach((option) => {
        this.eventEmitter.emit('ivr.option_detected', {
          callSid,
          key: option.key,
          description: option.description,
          confidence: option.confidence,
          timestamp,
        });
      });

      // Signal that IVR detection is complete with results
      this.eventEmitter.emit('ivr.detection_completed', {
        callSid,
        transcript,
        ivrDetected: true,
        confidence,
        timestamp,
      });
    } else {
      // Signal that IVR detection is complete without results
      this.eventEmitter.emit('ivr.detection_completed', {
        callSid,
        transcript,
        ivrDetected: false,
        confidence,
        timestamp,
      });
    }
  }

  private detectIVRMenu(
    callSid: string,
    transcript: string,
    confidence: number,
    timestamp: Date,
  ): DetectedMenu | null {
    // Normalize text: convert words to numbers/symbols and clean up
    const normalizedText = this.normalizeIVRText(transcript.toLowerCase());

    const options: IVROption[] = [];

    // Check if this looks like an IVR menu
    if (!this.isLikelyIVRMenu(normalizedText)) {
      return null;
    }

    // Enhanced pattern matching for complex IVR menus
    const ivrMatches = [
      // "press X for Y" or "press X to Y" - capture longer descriptions
      ...normalizedText.matchAll(/press\s+([0-9*#]+)\s+(?:for|to)\s+([^,.]+?(?:\s+\w+)*?)(?=\s*[.,]|\s+press|\s+if\s+you|\s+to\s+(?:schedule|register|receive)\s|\s*$)/gi),
      // "for Y press X" or "for Y, press X"  
      ...normalizedText.matchAll(/for\s+([^,.]+?(?:\s+\w+)*?),?\s+press\s+([0-9*#]+)/gi),
      // "to Y press X" or "to Y, press X"
      ...normalizedText.matchAll(/to\s+([^,.]+?(?:\s+\w+)*?),?\s+press\s+([0-9*#]+)/gi),
      // "if you are/want/need X, press Y" pattern (common in healthcare)
      ...normalizedText.matchAll(/if\s+you\s+(?:are|want|need|require)\s+([^,.]+?(?:\s+\w+)*?),?\s+press\s+([0-9*#]+)/gi),
      // "press X if you are/want/need Y"
      ...normalizedText.matchAll(/press\s+([0-9*#]+)\s+if\s+you\s+(?:are|want|need|require)\s+([^,.]+?(?:\s+\w+)*?)(?=\s*[.,]|\s+press|\s+if\s+you|\s*$)/gi),
    ];

    for (const match of ivrMatches) {
      let key: string;
      let description: string;

      // Determine pattern type and extract key/description accordingly
      if (match[0].startsWith('press') && /press\s+[0-9*#]+\s+(?:for|to)/.test(match[0])) {
        // "press X for/to Y" format: press [key] for/to [description]
        key = match[1];
        description = match[2];
      } else if (match[0].startsWith('press') && /press\s+[0-9*#]+\s+if\s+you/.test(match[0])) {
        // "press X if you Y" format: press [key] if you [description]
        key = match[1];
        description = match[2];
      } else if (/(?:for|to)\s+.+\s+press\s+[0-9*#]+/.test(match[0])) {
        // "for/to Y press X" format: for/to [description] press [key]
        key = match[2];
        description = match[1];
      } else if (match[0].startsWith('if you')) {
        // "if you Y, press X" format: if you [description], press [key]
        key = match[2];
        description = match[1];
      } else {
        // Default fallback - assume second capture is key, first is description
        key = match[2] || match[1];
        description = match[1] || match[2];
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

    if (options.length > 0) {
      // Remove duplicates
      const uniqueOptions = this.deduplicateOptions(options);

      return {
        callSid,
        options: uniqueOptions,
        fullText: transcript,
        timestamp,
        confidence: this.calculateMenuConfidence(uniqueOptions, normalizedText),
      };
    }

    return null;
  }

  private isVoicemailPrompt(transcript: string): boolean {
    const lowerTranscript = transcript.toLowerCase();

    // Strong voicemail indicators (single match is enough)
    const strongIndicators = [
      'record your message',
      'leave your message',
      'leave a message',
      'at the tone',
      'after the beep',
      'voicemail',
      'voice mail',
      'message after the tone'
    ];

    // Check for strong indicators first
    for (const indicator of strongIndicators) {
      if (lowerTranscript.includes(indicator)) {
        return true;
      }
    }

    // Voicemail recording control patterns (these indicate you're already in a voicemail system)
    const recordingControlPatterns = [
      /to save.*press.*2/i,
      /to re-?record.*press/i,
      /to delete.*recording.*press/i,
      /listen.*recording.*press.*1/i,
      /message saved/i,
      /recording.*saved/i
    ];

    for (const pattern of recordingControlPatterns) {
      if (pattern.test(transcript)) {
        return true;
      }
    }

    // Other voicemail keywords (need multiple matches)
    const weakIndicators = [
      'unavailable',
      'not available to take your call',
      'unable to take your call',
      'please state your name',
      'clearly state your name',
      'leave a callback number',
      'leave your name and number',
      'we will return your call',
      'call you back',
      'someone will return your call',
      'currently closed'
    ];

    // Check for multiple weak indicators
    let matches = 0;
    for (const keyword of weakIndicators) {
      if (lowerTranscript.includes(keyword)) {
        matches++;
      }
    }

    // If we have 2 or more weak indicators, it's likely a voicemail
    return matches >= 2;
  }

  private normalizeIVRText(text: string): string {
    let normalized = text;

    // Convert number words when they follow "press" or precede menu actions
    const numberWords: Record<string, string> = {
      zero: '0',
      oh: '0',
      one: '1',
      two: '2',
      three: '3',
      four: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      nine: '9',
    };

    // Convert number words after "press"
    for (const [word, digit] of Object.entries(numberWords)) {
      const regex = new RegExp(`press\\s+${word}\\b`, 'gi');
      normalized = normalized.replace(regex, `press ${digit}`);
    }

    // Convert symbol words
    normalized = normalized.replace(/\bpound(?:\s+key)?\b/gi, '#');
    normalized = normalized.replace(/\bhash(?:\s+key)?\b/gi, '#');
    normalized = normalized.replace(/\bstar\b/gi, '*');
    normalized = normalized.replace(/\basterisk\b/gi, '*');

    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  private isLikelyIVRMenu(text: string): boolean {
    // Check for common IVR indicators
    const indicators = [
      'press',
      'dial',
      'enter',
      'select',
      'for',
      'menu',
      'options',
      'department',
      'representative',
      'operator',
    ];

    const indicatorCount = indicators.filter((indicator) => text.includes(indicator)).length;

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

    const avgOptionConfidence =
      options.reduce((sum, opt) => sum + opt.confidence, 0) / options.length;

    // Bonus for multiple options
    const optionCountBonus = Math.min(options.length * 0.1, 0.3);

    // Bonus for standard IVR language
    const standardPhrases = ['thank you for calling', 'please listen carefully', 'menu options'];
    const phraseBonus = standardPhrases.some((phrase) => text.includes(phrase)) ? 0.2 : 0;

    return Math.min(avgOptionConfidence + optionCountBonus + phraseBonus, 1.0);
  }

  private deduplicateOptions(options: IVROption[]): IVROption[] {
    const keyMap = new Map<string, IVROption>();
    
    for (const option of options) {
      const existingOption = keyMap.get(option.key);
      
      if (!existingOption) {
        // First time seeing this key
        keyMap.set(option.key, option);
      } else {
        // Key already exists, keep the one with longer/better description
        const currentDesc = option.description.length;
        const existingDesc = existingOption.description.length;
        const currentConfidence = option.confidence;
        const existingConfidence = existingOption.confidence;
        
        // Prefer longer descriptions or higher confidence
        if (currentDesc > existingDesc || 
            (currentDesc === existingDesc && currentConfidence > existingConfidence)) {
          keyMap.set(option.key, option);
        }
      }
    }
    
    return Array.from(keyMap.values()).sort((a, b) => {
      // Sort by key numerically, then alphabetically
      const aKey = a.key;
      const bKey = b.key;
      
      if (!isNaN(Number(aKey)) && !isNaN(Number(bKey))) {
        return Number(aKey) - Number(bKey);
      }
      return aKey.localeCompare(bKey);
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
      if (keywords.some((keyword) => goalLower.includes(keyword))) {
        for (const option of options) {
          if (keywords.some((keyword) => option.description.includes(keyword))) {
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
