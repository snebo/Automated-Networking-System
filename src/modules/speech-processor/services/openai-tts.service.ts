import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
  model?: 'tts-1' | 'tts-1-hd';
}

@Injectable()
export class OpenAITTSService {
  private readonly logger = new Logger(OpenAITTSService.name);
  private openaiClient: OpenAI | null = null;
  private isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeOpenAI();
  }

  private initializeOpenAI() {
    const apiKey = this.configService.get<string>('speech.tts.openai.apiKey') || this.configService.get<string>('ai.openai.apiKey');
    
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured. TTS will not be available.');
      return;
    }

    try {
      this.openaiClient = new OpenAI({
        apiKey: apiKey,
      });
      this.isConfigured = true;
      this.logger.log('OpenAI TTS client initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize OpenAI TTS: ${error.message}`);
      this.isConfigured = false;
    }
  }

  async generateSpeech(text: string, options?: TTSOptions): Promise<Buffer> {
    if (!this.isConfigured || !this.openaiClient) {
      throw new Error('OpenAI TTS is not configured. Please set OPENAI_API_KEY environment variable.');
    }

    try {
      const voice = options?.voice || this.configService.get<string>('speech.tts.openai.voice', 'fable');
      const speed = options?.speed || this.configService.get<number>('speech.tts.openai.speed', 1.0);
      const model = options?.model || this.configService.get<string>('speech.tts.openai.model', 'tts-1');

      this.logger.log(`Generating speech for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      this.logger.debug(`Using voice: ${voice}, speed: ${speed}, model: ${model}`);

      const response = await this.openaiClient.audio.speech.create({
        model: model as 'tts-1' | 'tts-1-hd',
        voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
        speed: speed,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      
      this.logger.log(`Generated ${buffer.length} bytes of audio data`);
      
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to generate speech: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateSpeechToFile(text: string, filePath: string, options?: TTSOptions): Promise<string> {
    const audioBuffer = await this.generateSpeech(text, options);
    
    try {
      writeFileSync(filePath, audioBuffer);
      this.logger.log(`Audio saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logger.error(`Failed to save audio file: ${error.message}`);
      throw error;
    }
  }

  async generateSpeechStream(text: string, options?: TTSOptions): Promise<ReadableStream<Uint8Array> | null> {
    if (!this.isConfigured || !this.openaiClient) {
      throw new Error('OpenAI TTS is not configured. Please set OPENAI_API_KEY environment variable.');
    }

    try {
      const voice = options?.voice || this.configService.get<string>('speech.tts.openai.voice', 'fable');
      const speed = options?.speed || this.configService.get<number>('speech.tts.openai.speed', 1.0);
      const model = options?.model || this.configService.get<string>('speech.tts.openai.model', 'tts-1');

      this.logger.log(`Generating speech stream for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      const response = await this.openaiClient.audio.speech.create({
        model: model as 'tts-1' | 'tts-1-hd',
        voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
        speed: speed,
        response_format: 'mp3',
      });

      return response.body;
    } catch (error) {
      this.logger.error(`Failed to generate speech stream: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Get service status
  isAvailable(): boolean {
    return this.isConfigured;
  }

  // Cleanup method for temporary files
  cleanupFile(filePath: string): void {
    try {
      unlinkSync(filePath);
      this.logger.debug(`Cleaned up temporary file: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
    }
  }
}