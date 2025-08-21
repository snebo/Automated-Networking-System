import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { WebScraperService } from './web-scraper.service';
import { WebScraperController } from './web-scraper.controller';
import { DatabaseModule } from '../database/database.module';
import { TelephonyModule } from '../telephony/telephony.module';
import { ScriptManagerModule } from '../script-manager/script-manager.module';
import { CallManagerModule } from '../call-manager/call-manager.module';
import { InformationExtractionModule } from '../information-extraction/information-extraction.module';

@Module({
  imports: [
    ConfigModule, 
    HttpModule, 
    DatabaseModule,
    TelephonyModule,
    ScriptManagerModule,
    CallManagerModule,
    InformationExtractionModule,
  ],
  controllers: [WebScraperController],
  providers: [WebScraperService],
  exports: [WebScraperService],
})
export class WebScraperModule {}