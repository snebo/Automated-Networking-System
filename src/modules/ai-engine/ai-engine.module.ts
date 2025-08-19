import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiEngineService } from './ai-engine.service';
import { OpenAIService } from './services/openai.service';
import { DecisionEngineService } from './services/decision-engine.service';
import { IVRNavigationService } from './services/ivr-navigation.service';

@Module({
  imports: [ConfigModule],
  providers: [
    AiEngineService,
    OpenAIService,
    DecisionEngineService,
    IVRNavigationService,
  ],
  exports: [
    AiEngineService,
    OpenAIService,
    DecisionEngineService,
    IVRNavigationService,
  ],
})
export class AiEngineModule {}