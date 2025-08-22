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
var TwilioService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Twilio = require("twilio");
let TwilioService = TwilioService_1 = class TwilioService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(TwilioService_1.name);
        this.twilioClient = null;
        this.isConfigured = false;
        this.accountSid = this.configService.get('telephony.twilio.accountSid') || '';
        this.authToken = this.configService.get('telephony.twilio.authToken') || '';
        this.phoneNumber = this.configService.get('telephony.twilio.phoneNumber') || '';
        if (!this.accountSid || !this.authToken || !this.phoneNumber) {
            this.logger.warn('Twilio credentials not configured. Running in mock mode.');
            this.isConfigured = false;
        }
        else {
            try {
                this.twilioClient = Twilio(this.accountSid, this.authToken);
                this.isConfigured = true;
                this.logger.log('Twilio client initialized successfully');
            }
            catch (error) {
                this.logger.error(`Failed to initialize Twilio client: ${error.message}`);
                this.isConfigured = false;
            }
        }
    }
    ensureConfigured(operation) {
        if (!this.isConfigured || !this.twilioClient) {
            throw new Error(`Cannot perform ${operation}: Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.`);
        }
    }
    async makeCall(to) {
        this.ensureConfigured('makeCall');
        try {
            const baseUrl = this.configService.get('app.url') || process.env.APP_URL || 'http://localhost:3000';
            this.logger.log(`Making call to ${to} from ${this.phoneNumber}`);
            const webhookUrl = `${baseUrl}/telephony/webhook`;
            const callParams = {
                to,
                from: this.phoneNumber,
                url: webhookUrl,
                machineDetection: 'Disable',
                statusCallback: `${baseUrl}/telephony/webhook/status`,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            };
            const call = await this.twilioClient.calls.create(callParams);
            this.logger.log(`Call initiated: ${call.sid}`);
            return call;
        }
        catch (error) {
            this.logger.error(`Failed to make call: ${error.message}`, error.stack);
            throw error;
        }
    }
    async endCall(callSid) {
        this.ensureConfigured('endCall');
        try {
            await this.twilioClient.calls(callSid).update({
                status: 'completed',
            });
            this.logger.log(`Call ended: ${callSid}`);
        }
        catch (error) {
            this.logger.error(`Failed to end call: ${error.message}`, error.stack);
            throw error;
        }
    }
    async sendDTMF(callSid, digits) {
        this.ensureConfigured('sendDTMF');
        try {
            const baseUrl = this.configService.get('app.url') || process.env.APP_URL || 'http://localhost:3000';
            await this.twilioClient.calls(callSid).update({
                twiml: `<Response>
          <Play digits="${digits}"/>
          <Redirect>${baseUrl}/telephony/webhook</Redirect>
        </Response>`,
            });
            this.logger.log(`DTMF sent to ${callSid}: ${digits}`);
        }
        catch (error) {
            this.logger.error(`Failed to send DTMF: ${error.message}`, error.stack);
            throw error;
        }
    }
    async updateCallWithTwiML(callSid, twiml) {
        this.ensureConfigured('updateCallWithTwiML');
        try {
            await this.twilioClient.calls(callSid).update({
                twiml: twiml,
            });
            this.logger.log(`Updated call ${callSid} with custom TwiML`);
        }
        catch (error) {
            this.logger.error(`Failed to update call with TwiML: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getCallStatus(callSid) {
        this.ensureConfigured('getCallStatus');
        try {
            const call = await this.twilioClient.calls(callSid).fetch();
            return call;
        }
        catch (error) {
            this.logger.error(`Failed to get call status: ${error.message}`, error.stack);
            throw error;
        }
    }
    generateTwiML(text) {
        const response = new Twilio.twiml.VoiceResponse();
        response.say({ voice: 'alice' }, text);
        return response.toString();
    }
    generateStreamTwiML(streamUrl) {
        const response = new Twilio.twiml.VoiceResponse();
        const connect = response.connect();
        connect.stream({
            url: streamUrl,
            name: 'voice-stream',
        });
        return response.toString();
    }
    generateInitialTwiML() {
        const response = new Twilio.twiml.VoiceResponse();
        response.record({
            action: `${this.configService.get('telephony.twilio.webhookUrl')}/recording`,
            transcribe: true,
            transcribeCallback: `${this.configService.get('telephony.twilio.webhookUrl')}/transcription`,
        });
        const streamUrl = this.configService.get('telephony.twilio.streamUrl') ||
            `wss://${process.env.HOST || 'localhost'}/call-events`;
        const connect = response.connect();
        connect.stream({
            url: streamUrl,
            name: 'ai-voice-stream',
        });
        return response.toString();
    }
    generateGatherTwiML(prompt, numDigits, timeout) {
        const response = new Twilio.twiml.VoiceResponse();
        const gather = response.gather({
            numDigits: numDigits || 1,
            timeout: timeout || 5,
            action: `${this.configService.get('telephony.twilio.webhookUrl')}/gather`,
        });
        gather.say({ voice: 'alice' }, prompt);
        response.say({ voice: 'alice' }, 'I did not receive any input. Goodbye.');
        response.hangup();
        return response.toString();
    }
    generatePlayTwiML(audioUrl) {
        const response = new Twilio.twiml.VoiceResponse();
        response.play(audioUrl);
        return response.toString();
    }
    generateHangupTwiML(message) {
        const response = new Twilio.twiml.VoiceResponse();
        if (message) {
            response.say({ voice: 'alice' }, message);
        }
        response.hangup();
        return response.toString();
    }
    isReady() {
        return this.isConfigured;
    }
};
exports.TwilioService = TwilioService;
exports.TwilioService = TwilioService = TwilioService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TwilioService);
//# sourceMappingURL=twilio.service.js.map