import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OpenAITTSService } from './openai-tts.service';
import { TwilioService } from '../../telephony/twilio.service';
import { ConfigService } from '@nestjs/config';

interface TTSRequest {
  callSid: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  timestamp: Date;
}

interface ActiveTTSSession {
  callSid: string;
  isPlaying: boolean;
  queuedRequests: TTSRequest[];
  currentRequest?: TTSRequest;
}

@Injectable()
export class TTSHandlerService {
  private readonly logger = new Logger(TTSHandlerService.name);
  private activeSessions = new Map<string, ActiveTTSSession>();

  constructor(
    private readonly openaiTTS: OpenAITTSService,
    private readonly twilioService: TwilioService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('tts.speak')
  async handleSpeakRequest(event: {
    callSid: string;
    text: string;
    priority?: 'low' | 'medium' | 'high';
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  }) {
    try {
      const request: TTSRequest = {
        callSid: event.callSid,
        text: event.text,
        priority: event.priority || 'medium',
        voice: event.voice,
        timestamp: new Date(),
      };

      this.logger.log(`🗣️ TTS REQUEST for call ${event.callSid}: "${event.text.substring(0, 50)}..."`);

      await this.queueTTSRequest(request);
    } catch (error) {
      this.logger.error(`TTS handler error: ${error.message}`, error.stack);
    }
  }

  private async queueTTSRequest(request: TTSRequest): Promise<void> {
    let session = this.activeSessions.get(request.callSid);
    
    if (!session) {
      session = {
        callSid: request.callSid,
        isPlaying: false,
        queuedRequests: [],
      };
      this.activeSessions.set(request.callSid, session);
    }

    // Add request to queue based on priority
    if (request.priority === 'high') {
      session.queuedRequests.unshift(request); // High priority goes to front
    } else {
      session.queuedRequests.push(request);
    }

    // Process queue if not currently playing
    if (!session.isPlaying) {
      await this.processNextTTSRequest(session);
    }
  }

  private async processNextTTSRequest(session: ActiveTTSSession): Promise<void> {
    if (session.queuedRequests.length === 0) {
      return;
    }

    session.isPlaying = true;
    session.currentRequest = session.queuedRequests.shift();

    if (!session.currentRequest) {
      session.isPlaying = false;
      return;
    }

    const request = session.currentRequest;

    try {
      this.logger.log(`🎵 SPEAKING TEXT DIRECTLY via TwiML for call ${request.callSid}:`);
      this.logger.log(`   Text: "${request.text}"`);

      // Send the response immediately - NO FILLER (it was killing calls)
      await this.playAudioOnCall(request.callSid, Buffer.from(''), request.text);

      this.logger.log(`🔊 Speech playback completed for call ${request.callSid}`);

    } catch (error) {
      this.logger.error(`Failed to generate/play speech for call ${request.callSid}: ${error.message}`);
    }

    await this.finishCurrentRequest(session);
  }

  private async playAudioOnCall(callSid: string, audioBuffer: Buffer, text: string): Promise<void> {
    try {
      this.logger.log(`🔊 PLAYING AUDIO on call ${callSid} (${audioBuffer.length} bytes)`);
      
      // Use TwiML to speak the text immediately on the active call
      // This replaces the current TwiML with speech + redirect back to listening
      const baseUrl = this.configService.get('app.url') || process.env.APP_URL || 'http://localhost:3000';
      
      const speechTwiML = `<Response>
        <Say voice="alice">${this.escapeForTwiML(text)}</Say>
        <Redirect>${baseUrl}/telephony/webhook</Redirect>
      </Response>`;
      
      // Update the call with speech TwiML using existing method
      await this.twilioService.updateCallWithTwiML(callSid, speechTwiML);
      
      // No artificial delay needed - TwiML executes immediately
      
    } catch (error) {
      this.logger.error(`Failed to play audio on call ${callSid}: ${error.message}`);
      throw error;
    }
  }

  private escapeForTwiML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async finishCurrentRequest(session: ActiveTTSSession): Promise<void> {
    session.isPlaying = false;
    session.currentRequest = undefined;

    // Process next request in queue
    if (session.queuedRequests.length > 0) {
      await this.processNextTTSRequest(session);
    }
  }

  @OnEvent('call.ended')
  handleCallEnded(event: { callSid: string }) {
    const session = this.activeSessions.get(event.callSid);
    if (session) {
      this.logger.log(`Cleaning up TTS session for ended call ${event.callSid}`);
      this.activeSessions.delete(event.callSid);
    }
  }

  // Utility method to interrupt current speech and clear queue
  @OnEvent('tts.interrupt')
  handleInterrupt(event: { callSid: string }) {
    const session = this.activeSessions.get(event.callSid);
    if (session) {
      this.logger.log(`Interrupting TTS for call ${event.callSid}`);
      session.queuedRequests = [];
      // Current request will finish naturally
    }
  }

  // Method to check if TTS is currently playing
  isTTSActive(callSid: string): boolean {
    const session = this.activeSessions.get(callSid);
    return session ? session.isPlaying : false;
  }

  // Method to get queue status
  getTTSStatus(callSid: string): {
    isPlaying: boolean;
    queueLength: number;
    currentText?: string;
  } {
    const session = this.activeSessions.get(callSid);
    
    if (!session) {
      return {
        isPlaying: false,
        queueLength: 0,
      };
    }

    return {
      isPlaying: session.isPlaying,
      queueLength: session.queuedRequests.length,
      currentText: session.currentRequest?.text,
    };
  }

  // Get all active sessions
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }
}