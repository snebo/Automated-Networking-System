import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SpeechProcessorService {
  private readonly logger = new Logger(SpeechProcessorService.name);
  private activeStreams = new Map<string, any>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  startAudioStream(callSid: string, streamSid: string): void {
    this.logger.log(`Starting audio stream for call ${callSid}, stream ${streamSid}`);
    
    this.activeStreams.set(callSid, {
      streamSid,
      startTime: new Date(),
      audioChunks: [],
      transcriptBuffer: '',
    });

    this.eventEmitter.emit('stream.started', { callSid, streamSid });
  }

  processAudioChunk(callSid: string, audioData: Buffer): void {
    const stream = this.activeStreams.get(callSid);
    if (!stream) {
      this.logger.warn(`No active stream found for call ${callSid}`);
      return;
    }

    // Add audio chunk to buffer
    stream.audioChunks.push({
      timestamp: new Date(),
      data: audioData,
    });

    // Emit for STT processing
    this.eventEmitter.emit('audio.chunk', {
      callSid,
      audioData,
      timestamp: new Date(),
    });
  }

  stopAudioStream(callSid: string): void {
    const stream = this.activeStreams.get(callSid);
    if (stream) {
      this.logger.log(`Stopping audio stream for call ${callSid}`);
      
      this.eventEmitter.emit('stream.stopped', {
        callSid,
        streamSid: stream.streamSid,
        duration: Date.now() - stream.startTime.getTime(),
        totalChunks: stream.audioChunks.length,
      });

      this.activeStreams.delete(callSid);
    }
  }

  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  getStreamInfo(callSid: string): any {
    return this.activeStreams.get(callSid);
  }
}