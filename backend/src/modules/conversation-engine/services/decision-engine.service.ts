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

    session.currentState = 'waiting';
  }

  @OnEvent('ai.human_reached')
  handleHumanReached(event: { callSid: string; transcript: string }) {
    const session = this.activeSessions.get(event.callSid);
    if (!session) return;

    session.currentState = 'listening';
    session.actionHistory.push(`Reached human: "${event.transcript}"`);
  }

  @OnEvent('stt.final')
  handleTranscriptReceived(event: {
    callSid: string;
    transcript: string;
    confidence: number;
    timestamp: Date;
  }) {
    const session = this.activeSessions.get(event.callSid);
    if (!session) {
      return; // No active session, let other handlers process
    }

    // Check if we should terminate the call based on any transcript
    if (this.shouldTerminateCall(event.transcript)) {
      this.logger.log(`🔴 TERMINATING CALL ${event.callSid.slice(-8)} - Business closed or no viable options detected`);
      this.logger.log(`📝 Termination trigger: "${event.transcript.substring(0, 100)}${event.transcript.length > 100 ? '...' : ''}"`);
      
      this.eventEmitter.emit('ai.hangup', {
        callSid: event.callSid,
        reason: 'Business closed - detected from transcript'
      });
      
      this.activeSessions.delete(event.callSid);
      return;
    }
  }

  @OnEvent('call.ended')
  handleCallEnded(event: { callSid: string }) {
    // Clean up active session when call ends to prevent race conditions
    if (this.activeSessions.has(event.callSid)) {
      this.logger.log(`🔴 Call ended - cleaning up AI session for ${event.callSid.slice(-8)}`);
      this.activeSessions.delete(event.callSid);
    }
  }

  @OnEvent('call.terminated')  
  handleCallTerminated(event: { callSid: string }) {
    // Clean up active session when call is terminated
    if (this.activeSessions.has(event.callSid)) {
      this.logger.log(`🔴 Call terminated - cleaning up AI session for ${event.callSid.slice(-8)}`);
      this.activeSessions.delete(event.callSid);
    }
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
      return;
    }
    
    // Additional check - if we somehow got here but should terminate, still do it
    if (this.shouldTerminateCall(event.fullText)) {
      this.logger.log(`🔴 TERMINATING CALL ${event.callSid.slice(-8)} - Business closed or no viable options (IVR handler)`);
      this.eventEmitter.emit('ai.hangup', {
        callSid: event.callSid,
        reason: 'Business closed or no viable navigation path'
      });
      this.activeSessions.delete(event.callSid);
      return;
    }
    
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

      // Add timeout for AI decision making (15 seconds)
      const decisionPromise = this.openaiService.makeIVRDecision(context);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI decision timeout')), 15000);
      });

      const decision = await Promise.race([decisionPromise, timeoutPromise]);
      
      // Double-check call is still active before proceeding
      if (!this.activeSessions.has(event.callSid)) {
        this.logger.warn(`🔴 Call ${event.callSid.slice(-8)} ended during AI decision making - canceling decision`);
        return;
      }
      
      session.lastDecision = decision;

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

  private shouldTerminateCall(fullText: string): boolean {
    const text = fullText.toLowerCase();
    
    // Strong indicators that business is closed (immediate termination)
    const strongClosedIndicators = [
      'we are closed',
      'we are currently closed',
      'currently closed',
      'office is closed',
      'we\'re closed',
      'closed for the day',
      'closed today',
      'closed now',
      'not open',
      'after hours',
      'outside business hours',
      'outside of business hours',
      'call back during regular business hours',
      'call back during business hours',
      'please call back during',
      'try your call again at a later time',
      'we are currently unavailable',
      'currently unavailable to take your call'
    ];

    // Check for strong indicators first
    const hasStrongIndicator = strongClosedIndicators.some(indicator => text.includes(indicator));
    
    if (hasStrongIndicator) {
      return true;
    }

    // Pattern-based detection for business hours mentions
    const businessHoursPatterns = [
      /hours of operation are .* to .*/i,
      /our hours are .* to .*/i,
      /business hours .* to .*/i,
      /open .* to .* monday/i,
      /monday through friday .* to .*/i
    ];

    const hasClosure = businessHoursPatterns.some(pattern => pattern.test(text)) && 
                      (text.includes('closed') || text.includes('call back'));

    if (hasClosure) {
      return true;
    }

    // Disconnect/service issues
    const serviceIssues = [
      'no longer in service',
      'disconnected',
      'not in service',
      'number cannot be completed',
      'number you have dialed is not',
      'this number is not in service'
    ];

    const hasServiceIssue = serviceIssues.some(indicator => text.includes(indicator));
    
    if (hasServiceIssue) {
      return true;
    }
    
    // Check if there's no menu options but long message (likely informational/closed)
    const hasNoOptions = !text.includes('press') && 
                        !text.includes('dial') && 
                        !text.includes('say') &&
                        !text.includes('for ') && // generic "for assistance" type phrases
                        text.length > 100; // Longer threshold

    const hasGoodbyeOrEnd = text.includes('goodbye') || 
                           text.includes('thank you') ||
                           text.includes('have a') ||
                           text.includes('try again later');
    
    return hasNoOptions && hasGoodbyeOrEnd;
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