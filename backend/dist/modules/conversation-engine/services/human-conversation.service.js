"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HumanConversationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanConversationService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../database/prisma.service");
let HumanConversationService = HumanConversationService_1 = class HumanConversationService {
    constructor(eventEmitter, prisma) {
        this.eventEmitter = eventEmitter;
        this.prisma = prisma;
        this.logger = new common_1.Logger(HumanConversationService_1.name);
        this.activeSessions = new Map();
    }
    handleSessionStarted(event) {
        const session = {
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
    async handleVoicemailDetected(event) {
        const session = this.activeSessions.get(event.callSid);
        if (!session)
            return;
        this.logger.log(`📬 Voicemail detected for call ${event.callSid}`);
        const voicemailMessage = this.generateVoicemailMessage(session);
        await this.saveVoicemailStatus(session, voicemailMessage);
        session.hasAskedQuestion = true;
        session.questionAsked = 'voicemail';
        session.humanResponse = voicemailMessage;
        this.eventEmitter.emit('tts.generate', {
            callSid: event.callSid,
            text: voicemailMessage,
            priority: 'high',
            context: 'voicemail',
        });
    }
    async handleTTSCompleted(event) {
        if (event.context === 'voicemail') {
            const session = this.activeSessions.get(event.callSid);
            if (session && session.questionAsked === 'voicemail') {
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
    async saveVoicemailStatus(session, voicemailMessage) {
        this.logger.log(`💾 Saving voicemail status for call ${session.callSid}`);
        try {
            const callSession = await this.prisma.callSession.findUnique({
                where: { callSid: session.callSid },
            });
            if (callSession) {
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
                                ...(business.callOutcomes || {}),
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
        }
        catch (error) {
            this.logger.error(`Failed to save voicemail status: ${error.message}`, error.stack);
        }
    }
    generateVoicemailMessage(session) {
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
        if (callerInfo.contactInfo) {
            message += `. Please call me back at ${callerInfo.contactInfo}`;
        }
        else {
            message += `. Please call me back at your earliest convenience`;
        }
        message += `. Thank you.`;
        return message;
    }
    extractCallerInfo(goal) {
        const info = {};
        const nameMatch = goal.match(/(\w+)\s+from\s+([^:,]+)/i);
        if (nameMatch) {
            info.name = nameMatch[1];
            info.company = nameMatch[2].trim();
        }
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
    extractPurposeInfo(goal) {
        const info = {};
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
        }
        else if (goal.includes('information')) {
            info.purpose = 'gathering information about your services';
        }
        else if (goal.includes('pricing')) {
            info.purpose = 'inquiring about pricing and availability';
        }
        else {
            const discussMatch = goal.match(/discuss\s+([^.]+)/i);
            if (discussMatch) {
                info.purpose = discussMatch[1];
            }
        }
        const gatherMatch = goal.match(/gather:\s*([^.]+)/i);
        if (gatherMatch) {
            info.details = `Specifically, I'm interested in ${gatherMatch[1]}`;
        }
        return info;
    }
    async handleIVRDetectionCompleted(event) {
        const session = this.activeSessions.get(event.callSid);
        if (!session)
            return;
        if (!event.ivrDetected) {
            this.processTranscriptForHuman(event, session);
        }
    }
    async processTranscriptForHuman(event, session) {
        const transcript = event.transcript.trim().toLowerCase();
        if (!session.hasReachedHuman && this.isHumanSpeech(transcript)) {
            session.hasReachedHuman = true;
            console.log(`\n👨‍💼 HUMAN DETECTED`);
            console.log(`📞 Call: ${session.callSid.slice(-8)}`);
            console.log(`💬 Human said: "${event.transcript}"`);
            console.log(`🤝 Responding to human's greeting...`);
            console.log('');
            this.eventEmitter.emit('ai.human_reached', {
                callSid: session.callSid,
                transcript: event.transcript,
            });
            this.respondToHuman(session, event.transcript);
        }
        else if (session.hasAskedQuestion) {
            console.log(`\n🧠 ANALYZING HUMAN RESPONSE`);
            console.log(`💬 Human said: "${event.transcript}"`);
            const responseAnalysis = this.analyzeResponse(event.transcript, session);
            if (responseAnalysis.hasContactInfo) {
                console.log(`✅ CONTACT INFO RECEIVED - Ending call`);
                session.humanResponse = event.transcript;
                await this.saveResponseAndEnd(session);
            }
            else if (responseAnalysis.isQuestion) {
                console.log(`❓ HUMAN ASKED QUESTION - Providing clarification`);
                this.handleHumanQuestion(session, event.transcript);
            }
            else {
                console.log(`🔄 INCOMPLETE INFO - Asking follow-up`);
                this.askFollowUpQuestion(session, event.transcript);
            }
        }
    }
    isHumanSpeech(transcript) {
        const text = transcript.toLowerCase();
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
            return false;
        }
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
            return false;
        }
        const minLength = 3;
        const hasWords = text.trim().split(/\s+/).length >= 1;
        const isLikelyHuman = hasWords && text.length >= minLength;
        if (isLikelyHuman) {
            console.log('👨‍💼 HUMAN SPEECH DETECTED (anything not automated)');
            console.log(`   Text: "${transcript}"`);
        }
        return isLikelyHuman;
    }
    respondToHuman(session, humanSpeech) {
        if (session.hasAskedQuestion)
            return;
        let response = "Hello, thank you for taking my call.";
        const speech = humanSpeech.toLowerCase();
        if (speech.includes('help') || speech.includes('assist')) {
            response = "Hello, yes I could use your help with something.";
        }
        else if (speech.includes('speaking') || speech.includes('this is')) {
            response = "Hello, thank you for taking my call.";
        }
        else if (speech.includes('how are you') || speech.includes('how can i')) {
            response = "Hello, I'm doing well thank you.";
        }
        const service = this.extractService(session.goal);
        const fullRequest = `${response} I'm hoping you can provide me with contact information for ${service} at your facility. I'm looking to ${session.goal.toLowerCase()}.`;
        console.log(`🗣️  RESPONDING TO HUMAN: "${fullRequest}"`);
        session.hasAskedQuestion = true;
        session.questionAsked = fullRequest;
        this.eventEmitter.emit('tts.speak', {
            callSid: session.callSid,
            text: fullRequest,
            priority: 'high',
        });
        this.logger.log(`✅ Responded to human for call ${session.callSid}: "${fullRequest}"`);
    }
    askSimpleQuestion(session) {
        if (session.hasAskedQuestion)
            return;
        const question = `Hello, I read about you online and saw that you provide ${this.extractService(session.goal)}, can I get the contact information for ${session.targetPerson} at this facility?`;
        session.questionAsked = question;
        session.hasAskedQuestion = true;
        this.logger.log(`🗣️ ASKING SIMPLE QUESTION for call ${session.callSid}: "${question}"`);
        this.eventEmitter.emit('tts.speak', {
            callSid: session.callSid,
            text: question,
            priority: 'high',
        });
    }
    analyzeResponse(humanResponse, session) {
        const text = humanResponse.toLowerCase();
        const hasPhoneNumber = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text);
        const hasEmail = /@/.test(text);
        const hasExtension = /ext|extension|x\d+/.test(text);
        const hasDoctorTitle = /dr\.|doctor|specialist|cardiologist|physician/.test(text);
        const hasProperName = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(humanResponse);
        const hasName = hasDoctorTitle || hasProperName;
        const hasContactInfo = hasPhoneNumber || hasEmail || (hasExtension && hasName);
        const questionWords = ['what', 'which', 'who', 'where', 'when', 'how', 'why', 'can you', 'could you', 'would you', 'do you'];
        const isQuestion = questionWords.some(word => text.includes(word)) || text.includes('?');
        return {
            hasContactInfo,
            isQuestion,
            needsFollowUp: !hasContactInfo && !isQuestion
        };
    }
    handleHumanQuestion(session, humanQuestion) {
        const text = humanQuestion.toLowerCase();
        let response = '';
        if (text.includes('which') && text.includes('cardiologist')) {
            response = "I'm looking for any cardiologist who can help with a heart condition consultation. Could you provide me with the contact information for your cardiology department or a specific cardiologist's office number?";
        }
        else if (text.includes('what') && text.includes('kind')) {
            response = "I need to schedule a consultation for heart-related concerns. Could you give me the direct phone number or extension for your cardiology department?";
        }
        else if (text.includes('who') && text.includes('doctor')) {
            response = "Any cardiologist at your facility would be great. Could you provide me with their contact details - phone number, extension, or email?";
        }
        else {
            response = "I'm calling to get contact information for a cardiologist at your facility - specifically their direct phone number or extension so I can schedule an appointment. Can you help me with that?";
        }
        console.log(`🗣️  CLARIFYING TO HUMAN: "${response}"`);
        this.eventEmitter.emit('tts.speak', {
            callSid: session.callSid,
            text: response,
            priority: 'high',
        });
    }
    askFollowUpQuestion(session, humanResponse) {
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
    extractService(goal) {
        const goalLower = goal
            ? goal.toLowerCase()
            : 'get direct contact information about the business';
        if (goalLower.includes('emergency') || goalLower.includes('er')) {
            return 'emergency services';
        }
        else if (goalLower.includes('cardiac') || goalLower.includes('heart')) {
            return 'cardiac care';
        }
        else if (goalLower.includes('brain') || goalLower.includes('neuro')) {
            return 'neurological services';
        }
        else if (goalLower.includes('medical') || goalLower.includes('doctor')) {
            return 'medical services';
        }
        else if (goalLower.includes('restaurant') || goalLower.includes('food')) {
            return 'dining services';
        }
        else if (goalLower.includes('customer service')) {
            return 'customer support';
        }
        else {
            return 'services';
        }
    }
    async saveResponseAndEnd(session) {
        this.logger.log(`✅ SAVING HUMAN RESPONSE for call ${session.callSid}:`);
        this.logger.log(`   Question: "${session.questionAsked}"`);
        this.logger.log(`   Response: "${session.humanResponse}"`);
        try {
            const callSession = await this.prisma.callSession.findUnique({
                where: { callSid: session.callSid },
            });
            if (callSession) {
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
                        },
                    },
                });
                this.logger.log(`📋 Saved response to database for call ${session.callSid}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to save response: ${error.message}`);
        }
        this.eventEmitter.emit('tts.speak', {
            callSid: session.callSid,
            text: 'Thank you very much for your help. Have a great day!',
            priority: 'high',
        });
        this.activeSessions.delete(session.callSid);
    }
    getActiveSession(callSid) {
        return this.activeSessions.get(callSid);
    }
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    handleCallEnded(event) {
        this.activeSessions.delete(event.callSid);
    }
};
exports.HumanConversationService = HumanConversationService;
__decorate([
    (0, event_emitter_1.OnEvent)('ai.session_started'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HumanConversationService.prototype, "handleSessionStarted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ivr.voicemail_detected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HumanConversationService.prototype, "handleVoicemailDetected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('tts.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HumanConversationService.prototype, "handleTTSCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ivr.detection_completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HumanConversationService.prototype, "handleIVRDetectionCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.ended'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HumanConversationService.prototype, "handleCallEnded", null);
exports.HumanConversationService = HumanConversationService = HumanConversationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        prisma_service_1.PrismaService])
], HumanConversationService);
//# sourceMappingURL=human-conversation.service.js.map