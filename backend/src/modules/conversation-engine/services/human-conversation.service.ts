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

  @OnEvent('ivr.voicemail_detected')
  async handleVoicemailDetected(event: {
    callSid: string;
    transcript: string;
    confidence: number;
    timestamp: Date;
  }) {
    const session = this.activeSessions.get(event.callSid);
    if (!session) return;

    this.logger.log(`📬 Voicemail detected for call ${event.callSid}`);
    
    // Generate a professional voicemail message based on the goal
    const voicemailMessage = this.generateVoicemailMessage(session);
    
    // Save the voicemail status to database
    await this.saveVoicemailStatus(session, voicemailMessage);
    
    // Mark the voicemail message in session for tracking
    session.hasAskedQuestion = true;
    session.questionAsked = 'voicemail';
    session.humanResponse = voicemailMessage;
    
    // Speak the voicemail message
    this.eventEmitter.emit('tts.generate', {
      callSid: event.callSid,
      text: voicemailMessage,
      priority: 'high',
      context: 'voicemail',
    });
    
    // Don't schedule hangup here - wait for TTS completion event
  }
  
  @OnEvent('tts.completed')
  async handleTTSCompleted(event: {
    callSid: string;
    context?: string;
  }) {
    // If this was a voicemail message, hang up shortly after
    if (event.context === 'voicemail') {
      const session = this.activeSessions.get(event.callSid);
      if (session && session.questionAsked === 'voicemail') {
        // Wait 2 seconds after TTS completes, then hang up
        setTimeout(() => {
          this.logger.log(`📞 Hanging up after voicemail completion for ${event.callSid}`);
          this.eventEmitter.emit('ai.hangup', {
            callSid: event.callSid,
            reason: 'Voicemail message completed'
          });
        }, 2000);
      }
    }
  }
  
  private async saveVoicemailStatus(session: SimpleHumanSession, voicemailMessage: string): Promise<void> {
    this.logger.log(`💾 Saving voicemail status for call ${session.callSid}`);
    
    try {
      // Find the call session
      const callSession = await this.prisma.callSession.findUnique({
        where: { callSid: session.callSid },
      });
      
      if (callSession) {
        // Update call outcome to indicate voicemail was left
        await this.prisma.callSession.update({
          where: { id: callSession.id },
          data: {
            outcome: {
              status: 'voicemail_left',
              message: voicemailMessage,
              timestamp: new Date(),
            }
          }
        });
        
        // Store the voicemail message as a transcript
        await this.prisma.transcript.create({
          data: {
            callId: callSession.id,
            timestamp: new Date(),
            speaker: 'agent',
            text: `[VOICEMAIL] ${voicemailMessage}`,
            confidence: 1.0,
            metadata: {
              type: 'voicemail',
              goal: session.goal,
            }
          }
        });
        
        // Update business call status if available
        const business = await this.prisma.business.findFirst({
          where: { phoneNumber: callSession.phoneNumber }
        });
        
        if (business) {
          await this.prisma.business.update({
            where: { id: business.id },
            data: {
              callStatus: 'voicemail_left',
              lastCalled: new Date(),
              callOutcomes: {
                ...(business.callOutcomes as any || {}),
                lastVoicemail: {
                  date: new Date(),
                  message: voicemailMessage,
                }
              }
            }
          });
        }
        
        this.logger.log(`✅ Voicemail status saved for business`);
      }
    } catch (error) {
      this.logger.error(`Failed to save voicemail status: ${error.message}`, error.stack);
    }
  }

  private generateVoicemailMessage(session: SimpleHumanSession): string {
    // Extract key information from the goal
    const callerInfo = this.extractCallerInfo(session.goal);
    const purposeInfo = this.extractPurposeInfo(session.goal);
    
    let message = `Hello, this is ${callerInfo.name || 'a representative'}`;
    
    if (callerInfo.company) {
      message += ` from ${callerInfo.company}`;
    }
    
    message += `. I'm calling regarding ${purposeInfo.purpose || 'a business inquiry'}`;
    
    if (purposeInfo.details) {
      message += `. ${purposeInfo.details}`;
    }
    
    // Add contact info if available
    if (callerInfo.contactInfo) {
      message += `. Please call me back at ${callerInfo.contactInfo}`;
    } else {
      message += `. Please call me back at your earliest convenience`;
    }
    
    message += `. Thank you.`;
    
    return message;
  }

  private extractCallerInfo(goal: string): { name?: string; company?: string; contactInfo?: string } {
    const info: any = {};
    
    // Extract name (e.g., "Sarah from...")
    const nameMatch = goal.match(/(\w+)\s+from\s+([^:,]+)/i);
    if (nameMatch) {
      info.name = nameMatch[1];
      info.company = nameMatch[2].trim();
    }
    
    // Extract contact info (email or phone)
    const emailMatch = goal.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      info.contactInfo = emailMatch[0];
    }
    
    const phoneMatch = goal.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      info.contactInfo = phoneMatch[0];
    }
    
    return info;
  }

  private extractPurposeInfo(goal: string): { purpose?: string; details?: string } {
    const info: any = {};
    
    // Look for common purpose patterns
    if (goal.includes('catering')) {
      info.purpose = 'catering services';
      
      const peopleMatch = goal.match(/(\d+)\s+people/i);
      if (peopleMatch) {
        info.details = `We need catering for ${peopleMatch[0]}`;
      }
      
      const eventMatch = goal.match(/(?:for|regarding)\s+(?:a\s+)?([^.]+event[^.]*)/i);
      if (eventMatch) {
        info.details = (info.details ? info.details + ' for ' : 'We need services for ') + eventMatch[1];
      }
    } else if (goal.includes('information')) {
      info.purpose = 'gathering information about your services';
    } else if (goal.includes('pricing')) {
      info.purpose = 'inquiring about pricing and availability';
    } else {
      // Generic fallback
      const discussMatch = goal.match(/discuss\s+([^.]+)/i);
      if (discussMatch) {
        info.purpose = discussMatch[1];
      }
    }
    
    // Extract "Gather:" information if present
    const gatherMatch = goal.match(/gather:\s*([^.]+)/i);
    if (gatherMatch) {
      info.details = `Specifically, I'm interested in ${gatherMatch[1]}`;
    }
    
    return info;
  }

  @OnEvent('ivr.detection_completed')
  async handleIVRDetectionCompleted(event: {
    callSid: string;
    transcript: string;
    ivrDetected: boolean;
    confidence: number;
    timestamp: Date;
  }) {
    const session = this.activeSessions.get(event.callSid);
    if (!session) return;

    // Only process for human conversation if no IVR was detected
    if (!event.ivrDetected) {
      this.processTranscriptForHuman(event, session);
    }
  }

  private async processTranscriptForHuman(event: any, session: any) {
    const transcript = event.transcript.trim().toLowerCase();

    // Step 1: Detect if we've reached a human (post-IVR)
    if (!session.hasReachedHuman && this.isHumanSpeech(transcript)) {
      session.hasReachedHuman = true;
      console.log(`\n👨‍💼 HUMAN DETECTED`);
      console.log(`📞 Call: ${session.callSid.slice(-8)}`);
      console.log(`💬 Human said: "${event.transcript}"`);
      console.log(`🤝 Responding to human's greeting...`);
      console.log('');

      // Notify that we've reached a human (exits waiting state)
      this.eventEmitter.emit('ai.human_reached', {
        callSid: session.callSid,
        transcript: event.transcript,
      });

      // Respond immediately to what the human just said (don't wait 2 seconds)
      this.respondToHuman(session, event.transcript);
    }

    // Step 2: If we've asked our question, analyze their response intelligently
    else if (session.hasAskedQuestion) {
      console.log(`\n🧠 ANALYZING HUMAN RESPONSE`);
      console.log(`💬 Human said: "${event.transcript}"`);
      
      const responseAnalysis = this.analyzeResponse(event.transcript, session);
      
      if (responseAnalysis.hasContactInfo) {
        console.log(`✅ CONTACT INFO RECEIVED - Ending call`);
        session.humanResponse = event.transcript;
        await this.saveResponseAndEnd(session);
      } else if (responseAnalysis.isQuestion) {
        console.log(`❓ HUMAN ASKED QUESTION - Providing clarification`);
        this.handleHumanQuestion(session, event.transcript);
      } else {
        console.log(`🔄 INCOMPLETE INFO - Asking follow-up`);
        this.askFollowUpQuestion(session, event.transcript);
      }
    }
  }

  private isHumanSpeech(transcript: string): boolean {
    const text = transcript.toLowerCase();
    
    // Check for voicemail confirmation messages (NOT human)
    const voicemailConfirmations = [
      'message saved',
      'message recorded',
      'recording saved',
      'thank you for your message',
      'your message has been',
      'goodbye',
      'good bye',
      'thank you goodbye',
    ];
    
    if (voicemailConfirmations.some(indicator => text.includes(indicator))) {
      console.log('📧 VOICEMAIL CONFIRMATION DETECTED - Not human speech');
      return false;
    }
    
    // First check if this is a hold/wait message (NOT human)
    const holdIndicators = [
      'please hold',
      'please wait',
      'hold while',
      'wait while',
      'connecting you',
      'try to connect',
      'transferring',
      'one moment please',
      'just a moment',
      'hold on',
    ];
    
    if (holdIndicators.some(indicator => text.includes(indicator))) {
      console.log('📞 HOLD MESSAGE DETECTED - Not human speech');
      return false; // This is an automated hold message
    }
    
    // Check for obvious IVR/automated messages (NOT human)
    const automatedIndicators = [
      'press',
      'dial',
      'menu',
      'directory',
      'extension',
      'repeat this menu',
      'thank you for calling',
    ];
    
    if (automatedIndicators.some(indicator => text.includes(indicator))) {
      console.log('🤖 AUTOMATED MESSAGE DETECTED - Not human speech');
      return false; // This is an automated system message
    }
    
    // More inclusive human detection - if it's NOT a hold/automated message, assume it's human
    // This is better for real conversations where humans say unpredictable things
    const minLength = 3; // At least 3 characters
    const hasWords = text.trim().split(/\s+/).length >= 1; // At least 1 word
    
    const isLikelyHuman = hasWords && text.length >= minLength;
    
    if (isLikelyHuman) {
      console.log('👨‍💼 HUMAN SPEECH DETECTED (anything not automated)');
      console.log(`   Text: "${transcript}"`);
    }
    
    return isLikelyHuman;
  }

  private respondToHuman(session: SimpleHumanSession, humanSpeech: string): void {
    if (session.hasAskedQuestion) return;

    // Respond naturally to what the human said, then ask our question
    let response = "Hello, thank you for taking my call.";
    
    // Customize response based on what they said
    const speech = humanSpeech.toLowerCase();
    if (speech.includes('help') || speech.includes('assist')) {
      response = "Hello, yes I could use your help with something.";
    } else if (speech.includes('speaking') || speech.includes('this is')) {
      response = "Hello, thank you for taking my call.";  
    } else if (speech.includes('how are you') || speech.includes('how can i')) {
      response = "Hello, I'm doing well thank you.";
    }

    // Add our actual request
    const service = this.extractService(session.goal);
    const fullRequest = `${response} I'm hoping you can provide me with contact information for ${service} at your facility. I'm looking to ${session.goal.toLowerCase()}.`;

    console.log(`🗣️  RESPONDING TO HUMAN: "${fullRequest}"`);

    session.hasAskedQuestion = true;
    session.questionAsked = fullRequest;

    // Generate and send TTS
    this.eventEmitter.emit('tts.speak', {
      callSid: session.callSid,
      text: fullRequest,
      priority: 'high',
    });

    this.logger.log(`✅ Responded to human for call ${session.callSid}: "${fullRequest}"`);
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
      priority: 'high',
    });
  }

  private analyzeResponse(humanResponse: string, session: SimpleHumanSession): {
    hasContactInfo: boolean;
    isQuestion: boolean;
    needsFollowUp: boolean;
  } {
    const text = humanResponse.toLowerCase();
    
    // Check if response contains contact information
    const hasPhoneNumber = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text);
    const hasEmail = /@/.test(text);
    const hasExtension = /ext|extension|x\d+/.test(text);
    
    // Check if response mentions a doctor/specialist name (indicates they're providing specific info)
    const hasDoctorTitle = /dr\.|doctor|specialist|cardiologist|physician/.test(text);
    const hasProperName = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(humanResponse); // Checks for capitalized names
    const hasName = hasDoctorTitle || hasProperName;
    
    // Has contact info if: phone number, email, or extension with a name/department
    const hasContactInfo = hasPhoneNumber || hasEmail || (hasExtension && hasName);
    
    // Check if it's a question
    const questionWords = ['what', 'which', 'who', 'where', 'when', 'how', 'why', 'can you', 'could you', 'would you', 'do you'];
    const isQuestion = questionWords.some(word => text.includes(word)) || text.includes('?');
    
    return {
      hasContactInfo,
      isQuestion,
      needsFollowUp: !hasContactInfo && !isQuestion
    };
  }

  private handleHumanQuestion(session: SimpleHumanSession, humanQuestion: string): void {
    const text = humanQuestion.toLowerCase();
    let response = '';
    
    if (text.includes('which') && text.includes('cardiologist')) {
      response = "I'm looking for any cardiologist who can help with a heart condition consultation. Could you provide me with the contact information for your cardiology department or a specific cardiologist's office number?";
    } else if (text.includes('what') && text.includes('kind')) {
      response = "I need to schedule a consultation for heart-related concerns. Could you give me the direct phone number or extension for your cardiology department?";
    } else if (text.includes('who') && text.includes('doctor')) {
      response = "Any cardiologist at your facility would be great. Could you provide me with their contact details - phone number, extension, or email?";
    } else {
      response = "I'm calling to get contact information for a cardiologist at your facility - specifically their direct phone number or extension so I can schedule an appointment. Can you help me with that?";
    }
    
    console.log(`🗣️  CLARIFYING TO HUMAN: "${response}"`);
    
    this.eventEmitter.emit('tts.speak', {
      callSid: session.callSid,
      text: response,
      priority: 'high',
    });
  }

  private askFollowUpQuestion(session: SimpleHumanSession, humanResponse: string): void {
    const followUps = [
      "That's helpful, but could you also provide me with a direct phone number or extension for the cardiology department?",
      "Great, and what would be the best number to reach them at?",
      "Thank you. Could you give me their contact information so I can call them directly?",
      "I appreciate that. What's their direct line or extension number?"
    ];
    
    const response = followUps[Math.floor(Math.random() * followUps.length)];
    
    console.log(`🗣️  FOLLOW-UP QUESTION: "${response}"`);
    
    this.eventEmitter.emit('tts.speak', {
      callSid: session.callSid,
      text: response,
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
