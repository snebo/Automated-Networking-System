import { Module } from '@nestjs/common';
import { SpeechProcessorService } from './speech-processor.service';
import { AudioStreamGateway } from './audio-stream.gateway';
import { DeepgramService } from './services/deepgram.service';
import { IVRDetectionService } from './services/ivr-detection.service';
import { OpenAITTSService } from './services/openai-tts.service';
import { TTSHandlerService } from './services/tts-handler.service';
import { TelephonyModule } from '../telephony/telephony.module';

@Module({
  imports: [TelephonyModule],
  providers: [
    SpeechProcessorService,
    AudioStreamGateway,
    DeepgramService,
    IVRDetectionService,
    OpenAITTSService,
    TTSHandlerService,
  ],
  exports: [
    SpeechProcessorService,
    AudioStreamGateway,
    DeepgramService,
    IVRDetectionService,
    OpenAITTSService,
    TTSHandlerService,
  ],
})
export class SpeechProcessorModule {}