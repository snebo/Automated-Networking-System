"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechProcessorModule = void 0;
const common_1 = require("@nestjs/common");
const speech_processor_service_1 = require("./speech-processor.service");
const audio_stream_gateway_1 = require("./audio-stream.gateway");
const deepgram_service_1 = require("./services/deepgram.service");
const ivr_detection_service_1 = require("./services/ivr-detection.service");
const openai_tts_service_1 = require("./services/openai-tts.service");
const tts_handler_service_1 = require("./services/tts-handler.service");
const telephony_module_1 = require("../telephony/telephony.module");
let SpeechProcessorModule = class SpeechProcessorModule {
};
exports.SpeechProcessorModule = SpeechProcessorModule;
exports.SpeechProcessorModule = SpeechProcessorModule = __decorate([
    (0, common_1.Module)({
        imports: [telephony_module_1.TelephonyModule],
        providers: [
            speech_processor_service_1.SpeechProcessorService,
            audio_stream_gateway_1.AudioStreamGateway,
            deepgram_service_1.DeepgramService,
            ivr_detection_service_1.IVRDetectionService,
            openai_tts_service_1.OpenAITTSService,
            tts_handler_service_1.TTSHandlerService,
        ],
        exports: [
            speech_processor_service_1.SpeechProcessorService,
            audio_stream_gateway_1.AudioStreamGateway,
            deepgram_service_1.DeepgramService,
            ivr_detection_service_1.IVRDetectionService,
            openai_tts_service_1.OpenAITTSService,
            tts_handler_service_1.TTSHandlerService,
        ],
    })
], SpeechProcessorModule);
//# sourceMappingURL=speech-processor.module.js.map