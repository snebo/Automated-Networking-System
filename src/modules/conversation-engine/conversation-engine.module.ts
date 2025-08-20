import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationEngineService } from './conversation-engine.service';
import { ConversationEngineController } from './conversation-engine.controller';
import { OpenAIService } from './services/openai.service';
import { DecisionEngineService } from './services/decision-engine.service';
import { IvrNavigatorService } from '../ivr-navigator/ivr-navigator.service';
import { HumanConversationService } from './services/human-conversation.service';
import { DatabaseModule } from '../database/database.module';
import { TelephonyModule } from '../telephony/telephony.module';
import { IvrNavigatorModule } from '../ivr-navigator/ivr-navigator.module';

@Module({
  imports: [ConfigModule, DatabaseModule, IvrNavigatorModule],
  controllers: [ConversationEngineController],
  providers: [
    ConversationEngineService,
    OpenAIService,
    DecisionEngineService,
    IvrNavigatorService,
    HumanConversationService,
  ],
  exports: [
    ConversationEngineService,
    OpenAIService,
    DecisionEngineService,
    IvrNavigatorService,
    HumanConversationService,
  ],
})
export class ConversationEngineModule {}