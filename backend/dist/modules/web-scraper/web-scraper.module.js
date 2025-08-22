"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebScraperModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const web_scraper_service_1 = require("./web-scraper.service");
const web_scraper_controller_1 = require("./web-scraper.controller");
const database_module_1 = require("../database/database.module");
const telephony_module_1 = require("../telephony/telephony.module");
const script_manager_module_1 = require("../script-manager/script-manager.module");
const call_manager_module_1 = require("../call-manager/call-manager.module");
const information_extraction_module_1 = require("../information-extraction/information-extraction.module");
let WebScraperModule = class WebScraperModule {
};
exports.WebScraperModule = WebScraperModule;
exports.WebScraperModule = WebScraperModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            axios_1.HttpModule,
            database_module_1.DatabaseModule,
            telephony_module_1.TelephonyModule,
            script_manager_module_1.ScriptManagerModule,
            call_manager_module_1.CallManagerModule,
            information_extraction_module_1.InformationExtractionModule,
        ],
        controllers: [web_scraper_controller_1.WebScraperController],
        providers: [web_scraper_service_1.WebScraperService],
        exports: [web_scraper_service_1.WebScraperService],
    })
], WebScraperModule);
//# sourceMappingURL=web-scraper.module.js.map