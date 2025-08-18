import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiEngineService } from './ai-engine.service';

@Module({
  imports: [ConfigModule],
  providers: [AiEngineService],
  exports: [AiEngineService],
})
export class AiEngineModule {}