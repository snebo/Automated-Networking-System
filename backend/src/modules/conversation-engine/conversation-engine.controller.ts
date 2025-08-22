import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DecisionEngineService } from './services/decision-engine.service';
import { HumanConversationService } from './services/human-conversation.service';

@ApiTags('conversation-engine')
@Controller('conversation')
export class ConversationEngineController {
  constructor(
    private readonly decisionEngine: DecisionEngineService,
    private readonly humanConversation: HumanConversationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('test-human-conversation')
  @ApiOperation({ 
    summary: 'Test simplified human conversation',
    description: 'Test the simple flow: IVR → Human → Ask Question → Save Response'
  })
  @ApiResponse({ status: 200, description: 'Simple conversation test started' })
  async testHumanConversation(
    @Body() body: {
      callSid?: string;
      goal: string;
      targetPerson?: string;
      businessName?: string;
    }
  ) {
    const callSid = body.callSid || `test-call-${Date.now()}`;
    
    // Simulate session start
    await this.humanConversation.handleSessionStarted({
      callSid,
      goal: body.goal,
      targetPerson: body.targetPerson,
      companyName: body.businessName
    });

    // Simulate human detection after 2 seconds
    setTimeout(() => {
      this.simulateHumanGreeting(callSid);
    }, 2000);

    return {
      callSid,
      message: 'Simple human conversation test started',
      goal: body.goal,
      targetPerson: body.targetPerson || 'manager',
      businessName: body.businessName,
      instructions: 'Check logs - will detect human, ask simple question, save response'
    };
  }

  @Post('simulate-human-response')
  @ApiOperation({ 
    summary: 'Simulate human response',
    description: 'Send a simulated human response to test conversation handling'
  })
  async simulateHumanResponse(
    @Body() body: {
      callSid: string;
      transcript: string;
      confidence?: number;
    }
  ) {
    // Emit the transcript event as if it came from speech recognition
    const event = {
      callSid: body.callSid,
      transcript: body.transcript,
      confidence: body.confidence || 0.9,
      timestamp: new Date(),
    };

    // Emit the IVR detection completed event to trigger human conversation processing
    this.eventEmitter.emit('ivr.detection_completed', {
      callSid: event.callSid,
      transcript: event.transcript,
      ivrDetected: false, // Assume no IVR for simulation
      confidence: event.confidence,
      timestamp: event.timestamp,
    });

    return {
      message: 'Human response processed',
      callSid: body.callSid,
      transcript: body.transcript,
    };
  }

  @Get('conversation-status/:callSid')
  @ApiOperation({ 
    summary: 'Get simple conversation status',
    description: 'Get the current status of a simple human conversation session'
  })
  getConversationStatus(@Param('callSid') callSid: string) {
    const session = this.humanConversation.getActiveSession(callSid);
    
    if (!session) {
      return {
        callSid,
        status: 'not_found',
        message: 'No active conversation session found'
      };
    }

    return {
      callSid,
      status: 'active',
      hasReachedHuman: session.hasReachedHuman,
      hasAskedQuestion: session.hasAskedQuestion,
      questionAsked: session.questionAsked,
      humanResponse: session.humanResponse,
      goal: session.goal,
      targetPerson: session.targetPerson,
      businessName: session.businessName,
      duration: Date.now() - session.startTime.getTime()
    };
  }

  @Get('active-conversations')
  @ApiOperation({ 
    summary: 'Get all active simple conversations',
    description: 'List all currently active simple human conversation sessions'
  })
  getActiveConversations() {
    const sessions = this.humanConversation.getActiveSessions();
    
    return {
      count: sessions.length,
      sessions: sessions.map(session => ({
        callSid: session.callSid,
        goal: session.goal,
        targetPerson: session.targetPerson,
        businessName: session.businessName,
        hasReachedHuman: session.hasReachedHuman,
        hasAskedQuestion: session.hasAskedQuestion,
        hasResponse: !!session.humanResponse,
        duration: Date.now() - session.startTime.getTime()
      }))
    };
  }

  private simulateHumanGreeting(callSid: string) {
    const humanGreetings = [
      "Hello, thank you for calling ABC Hospital, how can I help you today?",
      "Good morning, this is Sarah from customer service, how may I assist you?",
      "Hi there! You've reached our main office, what can I do for you?"
    ];

    const greeting = humanGreetings[Math.floor(Math.random() * humanGreetings.length)];

    // Simulate the STT event - human detection
    this.eventEmitter.emit('ivr.detection_completed', {
      callSid,
      transcript: greeting,
      ivrDetected: false, // Simulate human detection
      confidence: 0.95,
      timestamp: new Date(),
    });

    // Simulate a response to our question after 8 seconds
    setTimeout(() => {
      const responses = [
        "Sure, Dr. Martinez is our head of emergency medicine. His direct line is 555-0123 extension 456. He's usually available between 9 AM and 5 PM.",
        "You can reach our customer service manager Janet Smith at janet.smith@company.com or call her directly at 555-0198.",
        "Our billing department head is Tom Wilson. You can contact him at 555-0175 or email billing@facility.com"
      ];
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      this.eventEmitter.emit('ivr.detection_completed', {
        callSid,
        transcript: response,
        ivrDetected: false, // Simulate human response
        confidence: 0.90,
        timestamp: new Date(),
      });
    }, 8000); // 8 second delay for response
  }
}