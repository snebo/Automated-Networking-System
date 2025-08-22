import { Module } from '@nestjs/common';
import { InformationExtractionService } from './information-extraction.service';
import { InformationExtractionController } from './information-extraction.controller';
import { DatabaseModule } from '../database/database.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [InformationExtractionService],
  controllers: [InformationExtractionController],
  exports: [InformationExtractionService],
})
export class InformationExtractionModule {}