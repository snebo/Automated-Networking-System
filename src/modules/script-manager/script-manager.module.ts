import { Module } from '@nestjs/common';
import { ScriptManagerService } from './script-manager.service';

@Module({
  providers: [ScriptManagerService],
  exports: [ScriptManagerService],
})
export class ScriptManagerModule {}