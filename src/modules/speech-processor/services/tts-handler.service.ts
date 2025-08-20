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
    const request: TTSRequest = {
      callSid: event.callSid,
      text: event.text,
      priority: event.priority || 'medium',
      voice: event.voice,
      timestamp: new Date(),
    };

    this.logger.log(`\n🗣️ TTS REQUEST for call ${event.callSid}:`);
    this.logger.log(`   Text: "${event.text}"`);
    this.logger.log(`   Priority: ${request.priority}`);
    this.logger.log(`   Voice: ${request.voice || 'default'}\n`);

    await this.queueTTSRequest(request);
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
      this.logger.log(`🎵 GENERATING SPEECH for call ${request.callSid}:`);
      this.logger.log(`   Text: "${request.text}"`);

      // Check if TTS is available
      if (!this.openaiTTS.isAvailable()) {
        this.logger.warn(`OpenAI TTS not available for call ${request.callSid}. Skipping speech generation.`);
        await this.finishCurrentRequest(session);
        return;
      }

      // Generate speech audio
      const defaultVoice = this.configService.get<string>('speech.tts.voice', 'fable') as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      const audioBuffer = await this.openaiTTS.generateSpeech(request.text, {
        voice: request.voice || defaultVoice,
        speed: this.configService.get<number>('speech.tts.speed', 1.0),
        model: 'tts-1'
      });

      this.logger.log(`✅ Generated ${audioBuffer.length} bytes of speech audio`);

      // Play audio through Twilio call
      await this.playAudioOnCall(request.callSid, audioBuffer);

      this.logger.log(`🔊 Speech playback completed for call ${request.callSid}`);

    } catch (error) {
      this.logger.error(`Failed to generate/play speech for call ${request.callSid}: ${error.message}`);
    }

    await this.finishCurrentRequest(session);
  }

  private async playAudioOnCall(callSid: string, audioBuffer: Buffer): Promise<void> {
    try {
      // For now, we'll log that we would play the audio
      // In a full implementation, this would stream audio to the Twilio call
      this.logger.log(`🔊 PLAYING AUDIO on call ${callSid} (${audioBuffer.length} bytes)`);
      
      // Simulate audio playback time based on text length and speech rate
      // Approximate: 150 words per minute, average 5 characters per word
      const estimatedDuration = Math.max(2000, audioBuffer.length / 1000); // At least 2 seconds
      
      // TODO: Implement actual Twilio audio streaming
      // This would involve using Twilio's Media Streams API to inject audio
      // await this.twilioService.playAudio(callSid, audioBuffer);
      
      // For now, simulate the playback duration
      await new Promise(resolve => setTimeout(resolve, estimatedDuration));
      
    } catch (error) {
      this.logger.error(`Failed to play audio on call ${callSid}: ${error.message}`);
      throw error;
    }
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