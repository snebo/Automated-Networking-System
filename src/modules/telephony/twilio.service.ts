import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private twilioClient: Twilio.Twilio | null = null;
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('telephony.twilio.accountSid') || '';
    this.authToken = this.configService.get<string>('telephony.twilio.authToken') || '';
    this.phoneNumber = this.configService.get<string>('telephony.twilio.phoneNumber') || '';
    
    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      this.logger.warn('Twilio credentials not configured. Running in mock mode.');
      this.isConfigured = false;
    } else {
      try {
        this.twilioClient = Twilio(this.accountSid, this.authToken);
        this.isConfigured = true;
        this.logger.log('Twilio client initialized successfully');
      } catch (error) {
        this.logger.error(`Failed to initialize Twilio client: ${error.message}`);
        this.isConfigured = false;
      }
    }
  }

  private ensureConfigured(operation: string): void {
    if (!this.isConfigured || !this.twilioClient) {
      throw new Error(`Cannot perform ${operation}: Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.`);
    }
  }

  // ===== PHASE 2: AUDIO STREAMING METHODS (CURRENTLY ACTIVE) =====
  
  async makeCall(to: string): Promise<any> {
    this.ensureConfigured('makeCall');
    
    try {
      const baseUrl = this.configService.get('app.url') || process.env.APP_URL || 'http://localhost:3000';
      
      this.logger.log(`Making call to ${to} from ${this.phoneNumber}`);
      
      // Phase 2: Using webhook with media streaming
      const webhookUrl = `${baseUrl}/telephony/webhook`;
      
      const callParams = {
        to,
        from: this.phoneNumber,
        url: webhookUrl, // Use webhook for media streaming TwiML
        machineDetection: 'Disable', // Prevents silent calls on trial accounts
        statusCallback: `${baseUrl}/telephony/webhook/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      };
      
      const call = await this.twilioClient!.calls.create(callParams);

      this.logger.log(`Call initiated: ${call.sid}`);
      return call;
    } catch (error) {
      this.logger.error(`Failed to make call: ${error.message}`, error.stack);
      throw error;
    }
  }

  async endCall(callSid: string): Promise<void> {
    this.ensureConfigured('endCall');
    
    try {
      await this.twilioClient!.calls(callSid).update({
        status: 'completed',
      });
      this.logger.log(`Call ended: ${callSid}`);
    } catch (error) {
      this.logger.error(`Failed to end call: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendDTMF(callSid: string, digits: string): Promise<void> {
    this.ensureConfigured('sendDTMF');
    
    try {
      const baseUrl = this.configService.get('app.url') || process.env.APP_URL || 'http://localhost:3000';
      
      // Send DTMF but keep call alive by redirecting back to webhook with extended timeout
      await this.twilioClient!.calls(callSid).update({
        twiml: `<Response>
          <Play digits="${digits}"/>
          <Redirect>${baseUrl}/telephony/webhook</Redirect>
        </Response>`,
      });
      this.logger.log(`DTMF sent to ${callSid}: ${digits}`);
    } catch (error) {
      this.logger.error(`Failed to send DTMF: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateCallWithTwiML(callSid: string, twiml: string): Promise<void> {
    this.ensureConfigured('updateCallWithTwiML');
    
    try {
      await this.twilioClient!.calls(callSid).update({
        twiml: twiml,
      });
      this.logger.log(`Updated call ${callSid} with custom TwiML`);
    } catch (error) {
      this.logger.error(`Failed to update call with TwiML: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCallStatus(callSid: string): Promise<any> {
    this.ensureConfigured('getCallStatus');
    
    try {
      const call = await this.twilioClient!.calls(callSid).fetch();
      return call;
    } catch (error) {
      this.logger.error(`Failed to get call status: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===== PHASE 2: TWIML GENERATION METHODS (FOR FUTURE USE) =====

  generateTwiML(text: string): string {
    const response = new Twilio.twiml.VoiceResponse();
    response.say({ voice: 'alice' }, text);
    return response.toString();
  }

  generateStreamTwiML(streamUrl: string): string {
    const response = new Twilio.twiml.VoiceResponse();
    const connect = response.connect();
    connect.stream({
      url: streamUrl,
      name: 'voice-stream',
    });
    return response.toString();
  }

  generateInitialTwiML(): string {
    // Initial TwiML for new calls - connects to stream and starts recording
    const response = new Twilio.twiml.VoiceResponse();
    
    // Start recording for transcript purposes
    response.record({
      action: `${this.configService.get('telephony.twilio.webhookUrl')}/recording`,
      transcribe: true,
      transcribeCallback: `${this.configService.get('telephony.twilio.webhookUrl')}/transcription`,
    });
    
    // Connect to WebSocket stream for real-time processing
    const streamUrl = this.configService.get('telephony.twilio.streamUrl') || 
                     `wss://${process.env.HOST || 'localhost'}/call-events`;
    
    const connect = response.connect();
    connect.stream({
      url: streamUrl,
      name: 'ai-voice-stream',
    });
    
    return response.toString();
  }

  generateGatherTwiML(prompt: string, numDigits?: number, timeout?: number): string {
    const response = new Twilio.twiml.VoiceResponse();
    
    const gather = response.gather({
      numDigits: numDigits || 1,
      timeout: timeout || 5,
      action: `${this.configService.get('telephony.twilio.webhookUrl')}/gather`,
    });
    
    gather.say({ voice: 'alice' }, prompt);
    
    // Fallback if no input received
    response.say({ voice: 'alice' }, 'I did not receive any input. Goodbye.');
    response.hangup();
    
    return response.toString();
  }

  generatePlayTwiML(audioUrl: string): string {
    const response = new Twilio.twiml.VoiceResponse();
    response.play(audioUrl);
    return response.toString();
  }

  generateHangupTwiML(message?: string): string {
    const response = new Twilio.twiml.VoiceResponse();
    if (message) {
      response.say({ voice: 'alice' }, message);
    }
    response.hangup();
    return response.toString();
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}