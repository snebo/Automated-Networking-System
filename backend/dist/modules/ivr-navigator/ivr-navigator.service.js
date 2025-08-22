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
var IvrNavigatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IvrNavigatorService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
let IvrNavigatorService = IvrNavigatorService_1 = class IvrNavigatorService {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(IvrNavigatorService_1.name);
    }
    async executeDecision(event) {
        const { callSid, decision, session } = event;
        console.log('\n🎬 EXECUTING AI DECISION');
        console.log(`🔧 Action: ${decision.nextAction}`);
        console.log(`⌨️  Key: ${decision.selectedOption}`);
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
        this.eventEmitter.emit('ai.navigation_completed', {
            callSid,
            action: decision.nextAction,
            selectedOption: decision.selectedOption,
        });
    }
    async handleKeyPress(callSid, decision) {
        this.logger.log(`   🔢 Pressing DTMF key: ${decision.selectedOption}`);
        console.log(`🤫 Pressing key silently (no announcement)`);
        this.eventEmitter.emit('ai.send_dtmf', {
            callSid,
            digits: decision.selectedOption,
            reasoning: decision.reasoning,
        });
        console.log(`✅ Sent DTMF: [${decision.selectedOption}]`);
        this.eventEmitter.emit('ai.entering_wait_state', {
            callSid,
            action: 'pressed_key',
            key: decision.selectedOption,
        });
    }
    async handleSpeak(callSid, decision) {
        this.logger.log(`   🎤 Speaking to operator`);
        this.eventEmitter.emit('ai.speak', {
            callSid,
            text: decision.response,
            action: 'speak_to_human',
        });
        this.logger.log(`   ✅ Speech response sent`);
    }
    async handleWait(callSid, decision) {
        this.logger.log(`   ⏳ Waiting for more information`);
        if (decision.response && decision.response.trim()) {
            this.eventEmitter.emit('ai.speak', {
                callSid,
                text: decision.response,
                action: 'waiting',
            });
        }
        setTimeout(() => {
            this.eventEmitter.emit('ai.timeout', {
                callSid,
                reason: 'Waited too long for next menu',
            });
        }, 15000);
        this.logger.log(`   ✅ Waiting with 15s timeout`);
    }
    async handleHangup(callSid, decision) {
        this.logger.log(`   📞 Hanging up call`);
        if (decision.response && decision.response.trim()) {
            this.eventEmitter.emit('ai.speak', {
                callSid,
                text: decision.response,
                action: 'before_hangup',
            });
            await this.delay(4000);
        }
        this.eventEmitter.emit('ai.hangup', {
            callSid,
            reason: decision.reasoning,
        });
        this.logger.log(`   ✅ Hangup initiated`);
    }
    async pressDTMF(callSid, digits) {
        this.logger.log(`Manual DTMF: Pressing ${digits} for call ${callSid}`);
        this.eventEmitter.emit('ai.send_dtmf', {
            callSid,
            digits,
            reasoning: 'Manual override',
        });
    }
    async speakToCall(callSid, text) {
        this.logger.log(`Manual speech: "${text}" for call ${callSid}`);
        this.eventEmitter.emit('ai.speak', {
            callSid,
            text,
            action: 'manual',
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getNavigationStats() {
        return {
            message: 'Navigation service is active and ready',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.IvrNavigatorService = IvrNavigatorService;
__decorate([
    (0, event_emitter_1.OnEvent)('ai.decision_made'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IvrNavigatorService.prototype, "executeDecision", null);
exports.IvrNavigatorService = IvrNavigatorService = IvrNavigatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], IvrNavigatorService);
//# sourceMappingURL=ivr-navigator.service.js.map