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

  async makeCall(to: string): Promise<any> {
    this.ensureConfigured('makeCall');
    
    try {
      const webhookUrl = this.configService.get('telephony.twilio.webhookUrl') || 
                        `${process.env.APP_URL}/telephony/webhook`;
      
      const call = await this.twilioClient!.calls.create({
        to,
        from: this.phoneNumber,
        url: webhookUrl,
        statusCallback: `${webhookUrl}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
        recordingStatusCallback: `${webhookUrl}/recording`,
        machineDetection: 'Enable',
        machineDetectionTimeout: 5000,
      });

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
      await this.twilioClient!.calls(callSid).update({
        twiml: `<Response><Play digits="${digits}"/></Response>`,
      });
      this.logger.log(`DTMF sent to ${callSid}: ${digits}`);
    } catch (error) {
      this.logger.error(`Failed to send DTMF: ${error.message}`, error.stack);
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

  generateTwiML(text: string): string {
    // TwiML generation doesn't require active client
    const response = new Twilio.twiml.VoiceResponse();
    response.say({ voice: 'alice' }, text);
    return response.toString();
  }

  generateStreamTwiML(streamUrl: string): string {
    // TwiML generation doesn't require active client
    const response = new Twilio.twiml.VoiceResponse();
    const connect = response.connect();
    connect.stream({
      url: streamUrl,
    });
    return response.toString();
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}