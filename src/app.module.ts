import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { DatabaseModule } from './modules/database/database.module';
import { WebScraperModule } from './modules/web-scraper/web-scraper.module';
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
    // AiEngineModule,
    // IvrNavigatorModule,
    // CallManagerModule,
    // ScriptManagerModule,
  ],
})
export class AppModule {}