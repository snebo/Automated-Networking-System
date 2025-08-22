import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScriptManagerService } from './script-manager.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [ScriptManagerService],
  exports: [ScriptManagerService],
})
export class ScriptManagerModule {}