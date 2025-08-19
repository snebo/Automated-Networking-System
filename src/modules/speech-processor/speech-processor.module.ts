import { Module } from '@nestjs/common';
import { SpeechProcessorService } from './speech-processor.service';
import { AudioStreamGateway } from './audio-stream.gateway';
import { DeepgramService } from './services/deepgram.service';
import { IVRDetectionService } from './services/ivr-detection.service';
import { OpenAITTSService } from './services/openai-tts.service';

@Module({
  providers: [
    SpeechProcessorService,
    AudioStreamGateway,
    DeepgramService,
    IVRDetectionService,
    OpenAITTSService,
  ],
  exports: [
    SpeechProcessorService,
    AudioStreamGateway,
    DeepgramService,
    IVRDetectionService,
    OpenAITTSService,
  ],
})
export class SpeechProcessorModule {}