import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

@Injectable()
export class DeepgramService {
  private readonly logger = new Logger(DeepgramService.name);
  private deepgramClient: any;
  private activeSessions = new Map<string, any>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDeepgram();
  }

  private initializeDeepgram() {
    const apiKey = this.configService.get<string>('speech.stt.deepgram.apiKey');
    
    if (!apiKey) {
      this.logger.warn('Deepgram API key not configured. STT will not be available.');
      return;
    }

    try {
      this.deepgramClient = createClient(apiKey);
      this.logger.log('Deepgram client initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Deepgram: ${error.message}`);
    }
  }

  async startSTTSession(callSid: string): Promise<void> {
    if (!this.deepgramClient) {
      this.logger.warn('Deepgram not available for STT session');
      return;
    }

    try {
      const dgConnection = this.deepgramClient.listen.live({
        model: 'nova-2-phonecall',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        diarize: false,
        encoding: 'mulaw',
        sample_rate: 8000,
        channels: 1,
        interim_results: true,
        endpointing: 300, // 300ms of silence to finalize
        vad_events: true,
      });

      // Set up event listeners
      dgConnection.addListener(LiveTranscriptionEvents.Open, () => {
        this.logger.log(`Deepgram STT session opened for call ${callSid}`);
      });

      dgConnection.addListener(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final;
        const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
        
        if (transcript && transcript.trim().length > 0) {
          if (isFinal) {
            this.logger.log(`\n🔊 DEEPGRAM FINAL TRANSCRIPT:`);
            this.logger.log(`   Call: ${callSid}`);
            this.logger.log(`   Text: "${transcript}"`);
            this.logger.log(`   Confidence: ${(confidence * 100).toFixed(1)}%\n`);
          } else {
            this.logger.debug(`   [interim]: "${transcript}"`);
          }
          
          this.eventEmitter.emit('stt.transcript', {
            callSid,
            transcript,
            isFinal,
            confidence,
            timestamp: new Date(),
          });

          // If final transcript, check for IVR patterns
          if (isFinal) {
            this.eventEmitter.emit('stt.final', {
              callSid,
              transcript,
              confidence,
              timestamp: new Date(),
            });
          }
        }
      });

      dgConnection.addListener(LiveTranscriptionEvents.Error, (error: any) => {
        this.logger.error(`Deepgram error for call ${callSid}:`, error);
      });

      dgConnection.addListener(LiveTranscriptionEvents.Close, () => {
        this.logger.log(`Deepgram STT session closed for call ${callSid}`);
      });

      this.activeSessions.set(callSid, {
        connection: dgConnection,
        startTime: new Date(),
        audioChunks: 0,
      });

      this.logger.log(`STT session started for call ${callSid}`);
      
    } catch (error) {
      this.logger.error(`Failed to start STT session for call ${callSid}: ${error.message}`);
    }
  }

  processAudioChunk(callSid: string, audioData: Buffer): void {
    const session = this.activeSessions.get(callSid);
    if (!session) {
      this.logger.warn(`No STT session found for call ${callSid}`);
      return;
    }

    try {
      // Send audio data to Deepgram
      if (session.connection && session.connection.getReadyState() === 1) {
        session.connection.send(audioData);
        session.audioChunks++;
      }
    } catch (error) {
      this.logger.error(`Error sending audio to Deepgram for call ${callSid}: ${error.message}`);
    }
  }

  async stopSTTSession(callSid: string): Promise<void> {
    const session = this.activeSessions.get(callSid);
    if (!session) {
      return;
    }

    try {
      if (session.connection) {
        session.connection.finish();
      }
      
      this.logger.log(`Stopped STT session for call ${callSid}. Processed ${session.audioChunks} audio chunks.`);
      this.activeSessions.delete(callSid);
      
    } catch (error) {
      this.logger.error(`Error stopping STT session for call ${callSid}: ${error.message}`);
    }
  }

  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  getSessionInfo(callSid: string): any {
    return this.activeSessions.get(callSid);
  }

  isAvailable(): boolean {
    return this.deepgramClient !== null;
  }
}