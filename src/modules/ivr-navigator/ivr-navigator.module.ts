import { Module } from '@nestjs/common';
import { IvrNavigatorService } from './ivr-navigator.service';

@Module({
  providers: [IvrNavigatorService],
  exports: [IvrNavigatorService],
})
export class IvrNavigatorModule {}