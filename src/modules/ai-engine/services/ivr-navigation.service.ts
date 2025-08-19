import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AIDecision } from './openai.service';

@Injectable()
export class IVRNavigationService {
  private readonly logger = new Logger(IVRNavigationService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('ai.decision_made')
  async executeDecision(event: {
    callSid: string;
    decision: AIDecision;
    session: {
      goal: string;
      actionHistory: string[];
    };
  }) {
    const { callSid, decision, session } = event;
    
    this.logger.log(`\n🎬 EXECUTING AI DECISION for call ${callSid}:`);
    this.logger.log(`   Action: ${decision.nextAction}`);
    this.logger.log(`   Option: ${decision.selectedOption}`);

    switch (decision.nextAction) {
      case 'press_key':
        await this.handleKeyPress(callSid, decision);
        break;
        
      case 'speak':
        await this.handleSpeak(callSid, decision);
        break;
        
      case 'wait':
        await this.handleWait(callSid, decision);
        break;
        
      case 'hangup':
        await this.handleHangup(callSid, decision);
        break;
        
      default:
        this.logger.warn(`Unknown action: ${decision.nextAction}`);
        break;
    }

    // Emit navigation action completed
    this.eventEmitter.emit('ai.navigation_completed', {
      callSid,
      action: decision.nextAction,
      selectedOption: decision.selectedOption,
    });
  }

  private async handleKeyPress(callSid: string, decision: AIDecision): Promise<void> {
    this.logger.log(`   🔢 Pressing DTMF key: ${decision.selectedOption}`);
    
    // First, speak the response if provided
    if (decision.response && decision.response.trim()) {
      this.eventEmitter.emit('ai.speak', {
        callSid,
        text: decision.response,
        action: 'before_keypress',
      });
      
      // Wait a moment for the speech to complete before pressing key
      await this.delay(3000);
    }

    // Send DTMF tone
    this.eventEmitter.emit('ai.send_dtmf', {
      callSid,
      digits: decision.selectedOption,
      reasoning: decision.reasoning,
    });

    this.logger.log(`   ✅ DTMF key ${decision.selectedOption} sent`);
  }

  private async handleSpeak(callSid: string, decision: AIDecision): Promise<void> {
    this.logger.log(`   🎤 Speaking to operator`);
    
    this.eventEmitter.emit('ai.speak', {
      callSid,
      text: decision.response,
      action: 'speak_to_human',
    });

    this.logger.log(`   ✅ Speech response sent`);
  }

  private async handleWait(callSid: string, decision: AIDecision): Promise<void> {
    this.logger.log(`   ⏳ Waiting for more information`);
    
    if (decision.response && decision.response.trim()) {
      this.eventEmitter.emit('ai.speak', {
        callSid,
        text: decision.response,
        action: 'waiting',
      });
    }

    // Set up a timeout to re-evaluate if nothing happens
    setTimeout(() => {
      this.eventEmitter.emit('ai.timeout', {
        callSid,
        reason: 'Waited too long for next menu',
      });
    }, 15000); // 15 second timeout

    this.logger.log(`   ✅ Waiting with 15s timeout`);
  }

  private async handleHangup(callSid: string, decision: AIDecision): Promise<void> {
    this.logger.log(`   📞 Hanging up call`);
    
    if (decision.response && decision.response.trim()) {
      this.eventEmitter.emit('ai.speak', {
        callSid,
        text: decision.response,
        action: 'before_hangup',
      });
      
      // Wait for speech to complete before hanging up
      await this.delay(4000);
    }

    this.eventEmitter.emit('ai.hangup', {
      callSid,
      reason: decision.reasoning,
    });

    this.logger.log(`   ✅ Hangup initiated`);
  }

  // Manual navigation actions for testing
  async pressDTMF(callSid: string, digits: string): Promise<void> {
    this.logger.log(`Manual DTMF: Pressing ${digits} for call ${callSid}`);
    
    this.eventEmitter.emit('ai.send_dtmf', {
      callSid,
      digits,
      reasoning: 'Manual override',
    });
  }

  async speakToCall(callSid: string, text: string): Promise<void> {
    this.logger.log(`Manual speech: "${text}" for call ${callSid}`);
    
    this.eventEmitter.emit('ai.speak', {
      callSid,
      text,
      action: 'manual',
    });
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get navigation statistics
  getNavigationStats() {
    // This could be expanded to track navigation success rates, common paths, etc.
    return {
      message: 'Navigation service is active and ready',
      timestamp: new Date().toISOString(),
    };
  }
}