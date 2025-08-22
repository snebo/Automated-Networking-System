import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { OpenAIService, DecisionContext, AIDecision, IVRMenuOption } from './openai.service';

interface CallSession {
  callSid: string;
  phoneNumber: string;
  goal: string;
  companyName?: string;
  currentState: 'listening' | 'deciding' | 'acting' | 'waiting';
  actionHistory: string[];
  lastDecision?: AIDecision;
  startTime: Date;
}

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);
  private activeSessions = new Map<string, CallSession>();

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  startCallSession(callSid: string, phoneNumber: string, goal: string, companyName?: string, targetPerson?: string): void {
    const session: CallSession = {
      callSid,
      phoneNumber,
      goal,
      companyName,
      currentState: 'listening',
      actionHistory: [],
      startTime: new Date(),
    };

    this.activeSessions.set(callSid, session);
    
    this.logger.log(`Started AI decision session for call ${callSid}`);
    this.logger.log(`Goal: ${goal}`);
    this.logger.log(`Target Person: ${targetPerson || 'Not specified'}`);
    this.logger.log(`Company: ${companyName || 'Unknown'}`);

    // Emit session started event for both IVR navigation and human conversation
    this.eventEmitter.emit('ai.session_started', {
      callSid,
      phoneNumber,
      goal,
      targetPerson: targetPerson || this.extractTargetPersonFromGoal(goal),
      companyName,
      response: `Hello! I'm calling to help you with ${goal}. Let me navigate the phone system for you.`
    });
  }

  @OnEvent('call.initiated')
  handleCallInitiated(event: { callSid: string; phoneNumber: string; scriptId: string; goal: string; companyName?: string }) {
    this.logger.log(`🚀 Call initiated event received for ${event.callSid}`);
    this.startCallSession(event.callSid, event.phoneNumber, event.goal, event.companyName);
  }

  @OnEvent('ai.start_session')
  handleStartSession(event: { callSid: string; phoneNumber: string; goal: string; companyName?: string; targetPerson?: string }) {
    this.startCallSession(event.callSid, event.phoneNumber, event.goal, event.companyName, event.targetPerson);
  }

  @OnEvent('ai.session_ended')
  handleSessionEnded(event: { callSid: string }) {
    this.handleCallCompleted(event.callSid);
  }

  @OnEvent('ai.entering_wait_state')
  handleEnteringWaitState(event: { callSid: string; action: string; key: string }) {
    const session = this.activeSessions.get(event.callSid);
    if (!session) return;

    console.log(`⏳ Entering WAIT state after ${event.action} [${event.key}]`);
    session.currentState = 'waiting';
    
    this.logger.log(`Session ${event.callSid} entering wait state after ${event.action}`);
  }

  @OnEvent('ai.human_reached')
  handleHumanReached(event: { callSid: string; transcript: string }) {
    const session = this.activeSessions.get(event.callSid);
    if (!session) return;

    console.log(`🎉 Human reached - exiting wait state`);
    session.currentState = 'listening';
    session.actionHistory.push(`Reached human: "${event.transcript}"`);
    
    this.logger.log(`Session ${event.callSid} reached human, exiting wait state`);
  }

  @OnEvent('ivr.menu_detected')
  async handleIVRMenuDetected(event: {
    callSid: string;
    options: IVRMenuOption[];
    fullText: string;
    confidence: number;
  }) {
    const session = this.activeSessions.get(event.callSid);
    if (!session) {
      this.logger.warn(`No active session for call ${event.callSid}`);
      return;
    }

    // Don't process IVR menus while waiting for response
    if (session.currentState === 'waiting') {
      console.log(`⏸️  Ignoring IVR menu - currently waiting for response to previous action`);
      this.logger.debug(`Ignoring IVR menu for ${event.callSid} - session in waiting state`);
      return;
    }

    // Clean console output for AI decision making
    console.log('\n🤖 AI ANALYZING IVR MENU');
    console.log('='.repeat(50));
    console.log(`📞 Call: ${event.callSid.slice(-8)}`);
    console.log(`🎯 Goal: ${session.goal}`);
    console.log(`📋 Available Options:`);
    event.options.forEach((option, index) => {
      console.log(`   ${index + 1}. Press [${option.key}] → ${option.description}`);
    });
    console.log('='.repeat(50));
    
    session.currentState = 'deciding';

    try {
      const context: DecisionContext = {
        callSid: event.callSid,
        phoneNumber: session.phoneNumber,
        goal: session.goal,
        companyName: session.companyName,
        previousActions: session.actionHistory,
        detectedMenu: {
          options: event.options,
          fullText: event.fullText,
        },
      };

      const decision = await this.openaiService.makeIVRDecision(context);
      session.lastDecision = decision;

      // Clean console output for AI decision
      console.log('\n🎯 AI DECISION MADE');
      console.log('-'.repeat(50));
      console.log(`✅ Selected: Press [${decision.selectedOption}]`);
      console.log(`🧠 Reasoning: ${decision.reasoning}`);
      console.log(`📊 Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      console.log(`🎬 Action: ${decision.nextAction}`);
      console.log('-'.repeat(50));
      console.log('');
      
      // Structured log for monitoring
      this.logger.log(`AI decision: press ${decision.selectedOption} for ${event.callSid}`);

      // Record the action
      session.actionHistory.push(`Selected option ${decision.selectedOption}: ${event.options.find(o => o.key === decision.selectedOption)?.description || 'unknown'}`);
      session.currentState = 'acting';

      // Emit decision for other services to act on
      this.eventEmitter.emit('ai.decision_made', {
        callSid: event.callSid,
        decision,
        session: {
          goal: session.goal,
          actionHistory: session.actionHistory,
        },
      });

    } catch (error) {
      this.logger.error(`Failed to make AI decision for call ${event.callSid}: ${error.message}`);
      
      // Emit fallback decision
      this.eventEmitter.emit('ai.decision_failed', {
        callSid: event.callSid,
        error: error.message,
      });
    }
  }

  async handleCallCompleted(callSid: string): Promise<void> {
    const session = this.activeSessions.get(callSid);
    if (!session) return;

    const duration = Date.now() - session.startTime.getTime();
    
    this.logger.log(`\n📋 CALL SESSION COMPLETED:`);
    this.logger.log(`   Call: ${callSid}`);
    this.logger.log(`   Goal: ${session.goal}`);
    this.logger.log(`   Duration: ${Math.round(duration / 1000)}s`);
    this.logger.log(`   Actions taken: ${session.actionHistory.length}`);
    
    if (session.actionHistory.length > 0) {
      this.logger.log(`   📝 Action History:`);
      session.actionHistory.forEach((action, index) => {
        this.logger.log(`      ${index + 1}. ${action}`);
      });
    }

    // Generate summary
    if (this.openaiService.isAvailable() && session.actionHistory.length > 0) {
      try {
        const summary = await this.generateCallSummary(session);
        this.logger.log(`   📊 AI Summary: ${summary}`);
        
        this.eventEmitter.emit('ai.call_summary', {
          callSid,
          summary,
          session: {
            goal: session.goal,
            duration: Math.round(duration / 1000),
            actionsCount: session.actionHistory.length,
            actionHistory: session.actionHistory,
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to generate call summary: ${error.message}`);
      }
    }

    this.activeSessions.delete(callSid);
  }

  private async generateCallSummary(session: CallSession): Promise<string> {
    const context: DecisionContext = {
      callSid: session.callSid,
      phoneNumber: session.phoneNumber,
      goal: session.goal,
      companyName: session.companyName,
      previousActions: session.actionHistory,
      detectedMenu: { options: [], fullText: '' }, // Not needed for summary
    };

    const summary = await this.openaiService.generateContextualResponse(
      `Call completed. Actions taken: ${session.actionHistory.join(', ')}. Assess if the goal was likely achieved.`,
      context
    );

    return summary;
  }

  // Get current session info
  getActiveSession(callSid: string): CallSession | undefined {
    return this.activeSessions.get(callSid);
  }

  // Get all active sessions
  getActiveSessions(): CallSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Manual override for testing
  async makeManualDecision(
    callSid: string, 
    menuOptions: IVRMenuOption[], 
    fullText: string
  ): Promise<AIDecision | null> {
    const session = this.activeSessions.get(callSid);
    if (!session) return null;

    const context: DecisionContext = {
      callSid,
      phoneNumber: session.phoneNumber,
      goal: session.goal,
      companyName: session.companyName,
      previousActions: session.actionHistory,
      detectedMenu: {
        options: menuOptions,
        fullText,
      },
    };

    return await this.openaiService.makeIVRDecision(context);
  }

  private extractTargetPersonFromGoal(goal: string): string {
    const goalLower = goal.toLowerCase();
    
    // Extract target person from common goal patterns
    if (goalLower.includes('head doctor') || goalLower.includes('chief medical')) {
      return 'head doctor';
    } else if (goalLower.includes('er doctor') || goalLower.includes('emergency')) {
      return 'er doctor';
    } else if (goalLower.includes('cardiologist') || goalLower.includes('heart')) {
      return 'cardiologist';
    } else if (goalLower.includes('brain surgeon') || goalLower.includes('neurosurgeon')) {
      return 'brain surgeon';
    } else if (goalLower.includes('manager')) {
      return 'manager';
    } else if (goalLower.includes('owner')) {
      return 'owner';
    } else if (goalLower.includes('customer service')) {
      return 'customer service';
    } else if (goalLower.includes('billing') || goalLower.includes('accounts')) {
      return 'billing';
    } else if (goalLower.includes('appointment') || goalLower.includes('scheduling')) {
      return 'appointment scheduler';
    } else if (goalLower.includes('technical support')) {
      return 'technical support';
    } else {
      return 'appropriate person';
    }
  }
}