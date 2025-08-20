import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { IvrNavigatorService } from './ivr-navigator.service';

@Module({
  imports: [EventEmitterModule],
  providers: [IvrNavigatorService],
  exports: [IvrNavigatorService],
})
export class IvrNavigatorModule {}