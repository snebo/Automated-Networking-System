import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AIDecision } from '../conversation-engine/services/openai.service';

@Injectable()
export class IvrNavigatorService {
  private readonly logger = new Logger(IvrNavigatorService.name);

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
    
    console.log('\n🎬 EXECUTING AI DECISION');
    console.log(`🔧 Action: ${decision.nextAction}`);
    console.log(`⌨️  Key: ${decision.selectedOption}`);
    
    // Structured log for monitoring
    this.logger.log(`Executing decision: ${decision.nextAction} option ${decision.selectedOption} for ${callSid}`);

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
    
    // Skip automated speech - just press key silently for natural IVR navigation
    console.log(`🤫 Pressing key silently (no announcement)`);

    // Send DTMF tone
    this.eventEmitter.emit('ai.send_dtmf', {
      callSid,
      digits: decision.selectedOption,
      reasoning: decision.reasoning,
    });

    console.log(`✅ Sent DTMF: [${decision.selectedOption}]`);
    
    // Notify that we're now waiting for response
    this.eventEmitter.emit('ai.entering_wait_state', {
      callSid,
      action: 'pressed_key',
      key: decision.selectedOption,
    });
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