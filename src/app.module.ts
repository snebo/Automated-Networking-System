import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { IvrNavigatorModule } from './modules/ivr-navigator/ivr-navigator.module';
import { CallManagerModule } from './modules/call-manager/call-manager.module';
import { ScriptManagerModule } from './modules/script-manager/script-manager.module';
import { DatabaseModule } from './modules/database/database.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    DatabaseModule,
    TelephonyModule,
    AiEngineModule,
    IvrNavigatorModule,
    CallManagerModule,
    ScriptManagerModule,
  ],
})
export class AppModule {}