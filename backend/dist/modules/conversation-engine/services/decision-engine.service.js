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
var DecisionEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionEngineService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const openai_service_1 = require("./openai.service");
let DecisionEngineService = DecisionEngineService_1 = class DecisionEngineService {
    constructor(openaiService, eventEmitter) {
        this.openaiService = openaiService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(DecisionEngineService_1.name);
        this.activeSessions = new Map();
    }
    startCallSession(callSid, phoneNumber, goal, companyName, targetPerson) {
        const session = {
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
        this.eventEmitter.emit('ai.session_started', {
            callSid,
            phoneNumber,
            goal,
            targetPerson: targetPerson || this.extractTargetPersonFromGoal(goal),
            companyName,
            response: `Hello! I'm calling to help you with ${goal}. Let me navigate the phone system for you.`
        });
    }
    handleCallInitiated(event) {
        this.logger.log(`🚀 Call initiated event received for ${event.callSid}`);
        this.startCallSession(event.callSid, event.phoneNumber, event.goal, event.companyName);
    }
    handleStartSession(event) {
        this.startCallSession(event.callSid, event.phoneNumber, event.goal, event.companyName, event.targetPerson);
    }
    handleSessionEnded(event) {
        this.handleCallCompleted(event.callSid);
    }
    handleEnteringWaitState(event) {
        const session = this.activeSessions.get(event.callSid);
        if (!session)
            return;
        session.currentState = 'waiting';
    }
    handleHumanReached(event) {
        const session = this.activeSessions.get(event.callSid);
        if (!session)
            return;
        session.currentState = 'listening';
        session.actionHistory.push(`Reached human: "${event.transcript}"`);
    }
    handleTranscriptReceived(event) {
        const session = this.activeSessions.get(event.callSid);
        if (!session) {
            return;
        }
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
    handleCallEnded(event) {
        if (this.activeSessions.has(event.callSid)) {
            this.logger.log(`🔴 Call ended - cleaning up AI session for ${event.callSid.slice(-8)}`);
            this.activeSessions.delete(event.callSid);
        }
    }
    handleCallTerminated(event) {
        if (this.activeSessions.has(event.callSid)) {
            this.logger.log(`🔴 Call terminated - cleaning up AI session for ${event.callSid.slice(-8)}`);
            this.activeSessions.delete(event.callSid);
        }
    }
    async handleIVRMenuDetected(event) {
        const session = this.activeSessions.get(event.callSid);
        if (!session) {
            this.logger.warn(`No active session for call ${event.callSid}`);
            return;
        }
        if (session.currentState === 'waiting') {
            return;
        }
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
            const context = {
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
            const decisionPromise = this.openaiService.makeIVRDecision(context);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('AI decision timeout')), 15000);
            });
            const decision = await Promise.race([decisionPromise, timeoutPromise]);
            if (!this.activeSessions.has(event.callSid)) {
                this.logger.warn(`🔴 Call ${event.callSid.slice(-8)} ended during AI decision making - canceling decision`);
                return;
            }
            session.lastDecision = decision;
            session.actionHistory.push(`Selected option ${decision.selectedOption}: ${event.options.find(o => o.key === decision.selectedOption)?.description || 'unknown'}`);
            session.currentState = 'acting';
            this.eventEmitter.emit('ai.decision_made', {
                callSid: event.callSid,
                decision,
                session: {
                    goal: session.goal,
                    actionHistory: session.actionHistory,
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to make AI decision for call ${event.callSid}: ${error.message}`);
            this.eventEmitter.emit('ai.decision_failed', {
                callSid: event.callSid,
                error: error.message,
            });
        }
    }
    async handleCallCompleted(callSid) {
        const session = this.activeSessions.get(callSid);
        if (!session)
            return;
        const duration = Date.now() - session.startTime.getTime();
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
            }
            catch (error) {
                this.logger.warn(`Failed to generate call summary: ${error.message}`);
            }
        }
        this.activeSessions.delete(callSid);
    }
    shouldTerminateCall(fullText) {
        const text = fullText.toLowerCase();
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
        const hasStrongIndicator = strongClosedIndicators.some(indicator => text.includes(indicator));
        if (hasStrongIndicator) {
            return true;
        }
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
        const hasNoOptions = !text.includes('press') &&
            !text.includes('dial') &&
            !text.includes('say') &&
            !text.includes('for ') &&
            text.length > 100;
        const hasGoodbyeOrEnd = text.includes('goodbye') ||
            text.includes('thank you') ||
            text.includes('have a') ||
            text.includes('try again later');
        return hasNoOptions && hasGoodbyeOrEnd;
    }
    async generateCallSummary(session) {
        const context = {
            callSid: session.callSid,
            phoneNumber: session.phoneNumber,
            goal: session.goal,
            companyName: session.companyName,
            previousActions: session.actionHistory,
            detectedMenu: { options: [], fullText: '' },
        };
        const summary = await this.openaiService.generateContextualResponse(`Call completed. Actions taken: ${session.actionHistory.join(', ')}. Assess if the goal was likely achieved.`, context);
        return summary;
    }
    getActiveSession(callSid) {
        return this.activeSessions.get(callSid);
    }
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    async makeManualDecision(callSid, menuOptions, fullText) {
        const session = this.activeSessions.get(callSid);
        if (!session)
            return null;
        const context = {
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
    extractTargetPersonFromGoal(goal) {
        const goalLower = goal.toLowerCase();
        if (goalLower.includes('head doctor') || goalLower.includes('chief medical')) {
            return 'head doctor';
        }
        else if (goalLower.includes('er doctor') || goalLower.includes('emergency')) {
            return 'er doctor';
        }
        else if (goalLower.includes('cardiologist') || goalLower.includes('heart')) {
            return 'cardiologist';
        }
        else if (goalLower.includes('brain surgeon') || goalLower.includes('neurosurgeon')) {
            return 'brain surgeon';
        }
        else if (goalLower.includes('manager')) {
            return 'manager';
        }
        else if (goalLower.includes('owner')) {
            return 'owner';
        }
        else if (goalLower.includes('customer service')) {
            return 'customer service';
        }
        else if (goalLower.includes('billing') || goalLower.includes('accounts')) {
            return 'billing';
        }
        else if (goalLower.includes('appointment') || goalLower.includes('scheduling')) {
            return 'appointment scheduler';
        }
        else if (goalLower.includes('technical support')) {
            return 'technical support';
        }
        else {
            return 'appropriate person';
        }
    }
};
exports.DecisionEngineService = DecisionEngineService;
__decorate([
    (0, event_emitter_1.OnEvent)('call.initiated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DecisionEngineService.prototype, "handleCallInitiated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.start_session'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DecisionEngineService.prototype, "handleStartSession", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.session_ended'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DecisionEngineService.prototype, "handleSessionEnded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.entering_wait_state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DecisionEngineService.prototype, "handleEnteringWaitState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.human_reached'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DecisionEngineService.prototype, "handleHumanReached", null);
__decorate([
    (0, event_emitter_1.OnEvent)('stt.final'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DecisionEngineService.prototype, "handleTranscriptReceived", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.ended'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DecisionEngineService.prototype, "handleCallEnded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.terminated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DecisionEngineService.prototype, "handleCallTerminated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ivr.menu_detected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DecisionEngineService.prototype, "handleIVRMenuDetected", null);
exports.DecisionEngineService = DecisionEngineService = DecisionEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenAIService,
        event_emitter_1.EventEmitter2])
], DecisionEngineService);
//# sourceMappingURL=decision-engine.service.js.map