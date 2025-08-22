"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bull_1 = require("@nestjs/bull");
const event_emitter_1 = require("@nestjs/event-emitter");
const telephony_module_1 = require("./modules/telephony/telephony.module");
const database_module_1 = require("./modules/database/database.module");
const web_scraper_module_1 = require("./modules/web-scraper/web-scraper.module");
const call_manager_module_1 = require("./modules/call-manager/call-manager.module");
const speech_processor_module_1 = require("./modules/speech-processor/speech-processor.module");
const conversation_engine_module_1 = require("./modules/conversation-engine/conversation-engine.module");
const information_extraction_module_1 = require("./modules/information-extraction/information-extraction.module");
const ivr_navigator_module_1 = require("./modules/ivr-navigator/ivr-navigator.module");
const script_manager_module_1 = require("./modules/script-manager/script-manager.module");
const configuration_1 = require("./config/configuration");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
                envFilePath: [
                    `.env.${process.env.NODE_ENV || 'development'}`,
                    '.env',
                ],
            }),
            event_emitter_1.EventEmitterModule.forRoot(),
            bull_1.BullModule.forRoot({
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            database_module_1.DatabaseModule,
            telephony_module_1.TelephonyModule,
            web_scraper_module_1.WebScraperModule,
            script_manager_module_1.ScriptManagerModule,
            call_manager_module_1.CallManagerModule,
            speech_processor_module_1.SpeechProcessorModule,
            ivr_navigator_module_1.IvrNavigatorModule,
            conversation_engine_module_1.ConversationEngineModule,
            information_extraction_module_1.InformationExtractionModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map