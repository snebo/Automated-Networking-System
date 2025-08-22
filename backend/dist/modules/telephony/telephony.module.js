"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelephonyModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const telephony_service_1 = require("./telephony.service");
const telephony_controller_1 = require("./telephony.controller");
const twilio_service_1 = require("./twilio.service");
const call_websocket_gateway_1 = require("./call-websocket.gateway");
let TelephonyModule = class TelephonyModule {
};
exports.TelephonyModule = TelephonyModule;
exports.TelephonyModule = TelephonyModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, event_emitter_1.EventEmitterModule],
        controllers: [telephony_controller_1.TelephonyController],
        providers: [telephony_service_1.TelephonyService, twilio_service_1.TwilioService, call_websocket_gateway_1.CallWebSocketGateway],
        exports: [telephony_service_1.TelephonyService, twilio_service_1.TwilioService],
    })
], TelephonyModule);
//# sourceMappingURL=telephony.module.js.map