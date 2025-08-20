import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { DatabaseModule } from './modules/database/database.module';
import { WebScraperModule } from './modules/web-scraper/web-scraper.module';
import { CallManagerModule } from './modules/call-manager/call-manager.module';
import { SpeechProcessorModule } from './modules/speech-processor/speech-processor.module';
import { ConversationEngineModule } from './modules/conversation-engine/conversation-engine.module';
import { InformationExtractionModule } from './modules/information-extraction/information-extraction.module';
import { IvrNavigatorModule } from './modules/ivr-navigator/ivr-navigator.module';
import { ScriptManagerModule } from './modules/script-manager/script-manager.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    // Core Infrastructure
    DatabaseModule,
    TelephonyModule,
    
    // Feature 1: Business Discovery & Data Collection
    WebScraperModule,
    ScriptManagerModule,
    
    // Feature 2: Call Management & Speech Processing  
    CallManagerModule,
    SpeechProcessorModule,
    
    // Feature 3: AI Navigation & Conversation
    IvrNavigatorModule,
    ConversationEngineModule,
    
    // Feature 4: Information Extraction & Storage
    InformationExtractionModule,
  ],
})
export class AppModule {}