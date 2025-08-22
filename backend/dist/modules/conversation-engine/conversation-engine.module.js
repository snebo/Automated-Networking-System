"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationEngineModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const conversation_engine_service_1 = require("./conversation-engine.service");
const conversation_engine_controller_1 = require("./conversation-engine.controller");
const openai_service_1 = require("./services/openai.service");
const decision_engine_service_1 = require("./services/decision-engine.service");
const human_conversation_service_1 = require("./services/human-conversation.service");
const database_module_1 = require("../database/database.module");
const ivr_navigator_module_1 = require("../ivr-navigator/ivr-navigator.module");
let ConversationEngineModule = class ConversationEngineModule {
};
exports.ConversationEngineModule = ConversationEngineModule;
exports.ConversationEngineModule = ConversationEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, database_module_1.DatabaseModule, ivr_navigator_module_1.IvrNavigatorModule],
        controllers: [conversation_engine_controller_1.ConversationEngineController],
        providers: [
            conversation_engine_service_1.ConversationEngineService,
            openai_service_1.OpenAIService,
            decision_engine_service_1.DecisionEngineService,
            human_conversation_service_1.HumanConversationService,
        ],
        exports: [
            conversation_engine_service_1.ConversationEngineService,
            openai_service_1.OpenAIService,
            decision_engine_service_1.DecisionEngineService,
            human_conversation_service_1.HumanConversationService,
        ],
    })
], ConversationEngineModule);
//# sourceMappingURL=conversation-engine.module.js.map