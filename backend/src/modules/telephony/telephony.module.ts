import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TelephonyService } from './telephony.service';
import { TelephonyController } from './telephony.controller';
import { TwilioService } from './twilio.service';
import { CallWebSocketGateway } from './call-websocket.gateway';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, EventEmitterModule, DatabaseModule],
  controllers: [TelephonyController],
  providers: [TelephonyService, TwilioService, CallWebSocketGateway],
  exports: [TelephonyService, TwilioService],
})
export class TelephonyModule {}