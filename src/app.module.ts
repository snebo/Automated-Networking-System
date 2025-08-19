import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { DatabaseModule } from './modules/database/database.module';
import { WebScraperModule } from './modules/web-scraper/web-scraper.module';
import { CallManagerModule } from './modules/call-manager/call-manager.module';
import { SpeechProcessorModule } from './modules/speech-processor/speech-processor.module';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { InformationExtractionModule } from './modules/information-extraction/information-extraction.module';
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
    DatabaseModule,
    TelephonyModule,
    WebScraperModule,
    CallManagerModule,
    SpeechProcessorModule,
    AiEngineModule,
    InformationExtractionModule,
    // IvrNavigatorModule,
    // ScriptManagerModule,
  ],
})
export class AppModule {}