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
var OpenAITTSService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAITTSService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
const fs_1 = require("fs");
let OpenAITTSService = OpenAITTSService_1 = class OpenAITTSService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(OpenAITTSService_1.name);
        this.openaiClient = null;
        this.isConfigured = false;
        this.initializeOpenAI();
    }
    initializeOpenAI() {
        const apiKey = this.configService.get('speech.tts.openai.apiKey') || this.configService.get('ai.openai.apiKey');
        if (!apiKey) {
            this.logger.warn('OpenAI API key not configured. TTS will not be available.');
            return;
        }
        try {
            this.openaiClient = new openai_1.default({
                apiKey: apiKey,
            });
            this.isConfigured = true;
            this.logger.log('OpenAI TTS client initialized successfully');
        }
        catch (error) {
            this.logger.error(`Failed to initialize OpenAI TTS: ${error.message}`);
            this.isConfigured = false;
        }
    }
    async generateSpeech(text, options) {
        if (!this.isConfigured || !this.openaiClient) {
            throw new Error('OpenAI TTS is not configured. Please set OPENAI_API_KEY environment variable.');
        }
        try {
            const voice = options?.voice || this.configService.get('speech.tts.openai.voice', 'fable');
            const speed = options?.speed || this.configService.get('speech.tts.openai.speed', 1.0);
            const model = options?.model || this.configService.get('speech.tts.openai.model', 'tts-1');
            this.logger.log(`Generating speech for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            this.logger.debug(`Using voice: ${voice}, speed: ${speed}, model: ${model}`);
            const response = await this.openaiClient.audio.speech.create({
                model: model,
                voice: voice,
                input: text,
                speed: speed,
                response_format: 'mp3',
            });
            const buffer = Buffer.from(await response.arrayBuffer());
            this.logger.log(`Generated ${buffer.length} bytes of audio data`);
            return buffer;
        }
        catch (error) {
            this.logger.error(`Failed to generate speech: ${error.message}`, error.stack);
            throw error;
        }
    }
    async generateSpeechToFile(text, filePath, options) {
        const audioBuffer = await this.generateSpeech(text, options);
        try {
            (0, fs_1.writeFileSync)(filePath, audioBuffer);
            this.logger.log(`Audio saved to: ${filePath}`);
            return filePath;
        }
        catch (error) {
            this.logger.error(`Failed to save audio file: ${error.message}`);
            throw error;
        }
    }
    async generateSpeechStream(text, options) {
        if (!this.isConfigured || !this.openaiClient) {
            throw new Error('OpenAI TTS is not configured. Please set OPENAI_API_KEY environment variable.');
        }
        try {
            const voice = options?.voice || this.configService.get('speech.tts.openai.voice', 'fable');
            const speed = options?.speed || this.configService.get('speech.tts.openai.speed', 1.0);
            const model = options?.model || this.configService.get('speech.tts.openai.model', 'tts-1');
            this.logger.log(`Generating speech stream for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            const response = await this.openaiClient.audio.speech.create({
                model: model,
                voice: voice,
                input: text,
                speed: speed,
                response_format: 'mp3',
            });
            return response.body;
        }
        catch (error) {
            this.logger.error(`Failed to generate speech stream: ${error.message}`, error.stack);
            throw error;
        }
    }
    isAvailable() {
        return this.isConfigured;
    }
    cleanupFile(filePath) {
        try {
            (0, fs_1.unlinkSync)(filePath);
            this.logger.debug(`Cleaned up temporary file: ${filePath}`);
        }
        catch (error) {
            this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
        }
    }
};
exports.OpenAITTSService = OpenAITTSService;
exports.OpenAITTSService = OpenAITTSService = OpenAITTSService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenAITTSService);
//# sourceMappingURL=openai-tts.service.js.map