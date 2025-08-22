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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationEngineController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const event_emitter_1 = require("@nestjs/event-emitter");
const decision_engine_service_1 = require("./services/decision-engine.service");
const human_conversation_service_1 = require("./services/human-conversation.service");
let ConversationEngineController = class ConversationEngineController {
    constructor(decisionEngine, humanConversation, eventEmitter) {
        this.decisionEngine = decisionEngine;
        this.humanConversation = humanConversation;
        this.eventEmitter = eventEmitter;
    }
    async testHumanConversation(body) {
        const callSid = body.callSid || `test-call-${Date.now()}`;
        await this.humanConversation.handleSessionStarted({
            callSid,
            goal: body.goal,
            targetPerson: body.targetPerson,
            companyName: body.businessName
        });
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
    async simulateHumanResponse(body) {
        const event = {
            callSid: body.callSid,
            transcript: body.transcript,
            confidence: body.confidence || 0.9,
            timestamp: new Date(),
        };
        this.eventEmitter.emit('ivr.detection_completed', {
            callSid: event.callSid,
            transcript: event.transcript,
            ivrDetected: false,
            confidence: event.confidence,
            timestamp: event.timestamp,
        });
        return {
            message: 'Human response processed',
            callSid: body.callSid,
            transcript: body.transcript,
        };
    }
    getConversationStatus(callSid) {
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
    simulateHumanGreeting(callSid) {
        const humanGreetings = [
            "Hello, thank you for calling ABC Hospital, how can I help you today?",
            "Good morning, this is Sarah from customer service, how may I assist you?",
            "Hi there! You've reached our main office, what can I do for you?"
        ];
        const greeting = humanGreetings[Math.floor(Math.random() * humanGreetings.length)];
        this.eventEmitter.emit('ivr.detection_completed', {
            callSid,
            transcript: greeting,
            ivrDetected: false,
            confidence: 0.95,
            timestamp: new Date(),
        });
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
                ivrDetected: false,
                confidence: 0.90,
                timestamp: new Date(),
            });
        }, 8000);
    }
};
exports.ConversationEngineController = ConversationEngineController;
__decorate([
    (0, common_1.Post)('test-human-conversation'),
    (0, swagger_1.ApiOperation)({
        summary: 'Test simplified human conversation',
        description: 'Test the simple flow: IVR → Human → Ask Question → Save Response'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Simple conversation test started' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConversationEngineController.prototype, "testHumanConversation", null);
__decorate([
    (0, common_1.Post)('simulate-human-response'),
    (0, swagger_1.ApiOperation)({
        summary: 'Simulate human response',
        description: 'Send a simulated human response to test conversation handling'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConversationEngineController.prototype, "simulateHumanResponse", null);
__decorate([
    (0, common_1.Get)('conversation-status/:callSid'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get simple conversation status',
        description: 'Get the current status of a simple human conversation session'
    }),
    __param(0, (0, common_1.Param)('callSid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConversationEngineController.prototype, "getConversationStatus", null);
__decorate([
    (0, common_1.Get)('active-conversations'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all active simple conversations',
        description: 'List all currently active simple human conversation sessions'
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConversationEngineController.prototype, "getActiveConversations", null);
exports.ConversationEngineController = ConversationEngineController = __decorate([
    (0, swagger_1.ApiTags)('conversation-engine'),
    (0, common_1.Controller)('conversation'),
    __metadata("design:paramtypes", [decision_engine_service_1.DecisionEngineService,
        human_conversation_service_1.HumanConversationService,
        event_emitter_1.EventEmitter2])
], ConversationEngineController);
//# sourceMappingURL=conversation-engine.controller.js.map