import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';

interface SimpleHumanSession {
  callSid: string;
  goal: string;
  targetPerson: string;
  businessName?: string;
  hasReachedHuman: boolean;
  hasAskedQuestion: boolean;
  questionAsked?: string;
  humanResponse?: string;
  startTime: Date;
}

@Injectable()
export class HumanConversationService {
  private readonly logger = new Logger(HumanConversationService.name);
  private activeSessions = new Map<string, SimpleHumanSession>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('ai.session_started')
  handleSessionStarted(event: {
    callSid: string;
    goal: string;
    targetPerson?: string;
    companyName?: string;
  }) {
    const session: SimpleHumanSession = {
      callSid: event.callSid,
      goal: event.goal,
      targetPerson: event.targetPerson || 'manager',
      businessName: event.companyName,
      hasReachedHuman: false,
      hasAskedQuestion: false,
      startTime: new Date(),
    };

    this.activeSessions.set(event.callSid, session);
    this.logger.log(`Started simple human session for call ${event.callSid} - Goal: ${event.goal}`);
  }

  @OnEvent('stt.final')
  async handleTranscript(event: {
    callSid: string;
    transcript: string;
    confidence: number;
    timestamp: Date;
  }) {
    const session = this.activeSessions.get(event.callSid);
    if (!session) return;

    const transcript = event.transcript.trim().toLowerCase();

    // Step 1: Detect if we've reached a human (post-IVR)
    if (!session.hasReachedHuman && this.isHumanSpeech(transcript)) {
      session.hasReachedHuman = true;
      this.logger.log(`🤝 HUMAN DETECTED for call ${session.callSid}: "${event.transcript}"`);

      // Wait a moment, then ask our question
      setTimeout(() => {
        this.askSimpleQuestion(session);
      }, 2000);
    }

    // Step 2: If we've asked our question, save their response
    else if (session.hasAskedQuestion) {
      session.humanResponse = event.transcript;
      await this.saveResponseAndEnd(session);
    }
  }

  private isHumanSpeech(transcript: string): boolean {
    // Simple indicators that we're talking to a person, not an IVR
    const humanIndicators = [
      'hello',
      'hi',
      'good morning',
      'good afternoon',
      'how can i help',
      'how may i help',
      'what can i do',
      'thank you for calling',
      'this is',
      'speaking',
    ];

    return humanIndicators.some((indicator) => transcript.includes(indicator));
  }

  private askSimpleQuestion(session: SimpleHumanSession): void {
    if (session.hasAskedQuestion) return;

    // Create simple question: "Hello, I read about you online and saw that you provide [service], can I get the contact information for [target person] at this facility?"
    const question = `Hello, I read about you online and saw that you provide ${this.extractService(session.goal)}, can I get the contact information for ${session.targetPerson} at this facility?`;

    session.questionAsked = question;
    session.hasAskedQuestion = true;

    this.logger.log(`🗣️ ASKING SIMPLE QUESTION for call ${session.callSid}: "${question}"`);

    // Send to TTS
    this.eventEmitter.emit('tts.speak', {
      callSid: session.callSid,
      text: question,
      voice: 'fable',
      priority: 'high',
    });
  }

  private extractService(goal: string): string {
    // Extract service from goal for the question
    const goalLower = goal
      ? goal.toLowerCase()
      : 'get direct contact information about the business';

    if (goalLower.includes('emergency') || goalLower.includes('er')) {
      return 'emergency services';
    } else if (goalLower.includes('cardiac') || goalLower.includes('heart')) {
      return 'cardiac care';
    } else if (goalLower.includes('brain') || goalLower.includes('neuro')) {
      return 'neurological services';
    } else if (goalLower.includes('medical') || goalLower.includes('doctor')) {
      return 'medical services';
    } else if (goalLower.includes('restaurant') || goalLower.includes('food')) {
      return 'dining services';
    } else if (goalLower.includes('customer service')) {
      return 'customer support';
    } else {
      return 'services'; // generic fallback
    }
  }

  private async saveResponseAndEnd(session: SimpleHumanSession): Promise<void> {
    this.logger.log(`✅ SAVING HUMAN RESPONSE for call ${session.callSid}:`);
    this.logger.log(`   Question: "${session.questionAsked}"`);
    this.logger.log(`   Response: "${session.humanResponse}"`);

    try {
      // Find the call session to get business ID
      const callSession = await this.prisma.callSession.findUnique({
        where: { callSid: session.callSid },
      });

      if (callSession) {
        // Store as transcript entry
        await this.prisma.transcript.create({
          data: {
            callId: callSession.id,
            timestamp: new Date(),
            speaker: 'human',
            text: session.humanResponse || '',
            confidence: 0.9,
            metadata: {
              questionAsked: session.questionAsked,
              goal: session.goal,
              targetPerson: session.targetPerson,
              conversationType: 'simple_inquiry',
            } as any,
          },
        });

        this.logger.log(`📋 Saved response to database for call ${session.callSid}`);
      }
    } catch (error) {
      this.logger.error(`Failed to save response: ${error.message}`);
    }

    // Say thank you
    this.eventEmitter.emit('tts.speak', {
      callSid: session.callSid,
      text: 'Thank you very much for your help. Have a great day!',
      voice: 'fable',
      priority: 'high',
    });

    // Clean up session
    this.activeSessions.delete(session.callSid);
  }

  // Simple public methods
  getActiveSession(callSid: string): SimpleHumanSession | undefined {
    return this.activeSessions.get(callSid);
  }

  getActiveSessions(): SimpleHumanSession[] {
    return Array.from(this.activeSessions.values());
  }

  @OnEvent('call.ended')
  handleCallEnded(event: { callSid: string }) {
    this.activeSessions.delete(event.callSid);
  }
}
