"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InformationExtractionModule = void 0;
const common_1 = require("@nestjs/common");
const information_extraction_service_1 = require("./information-extraction.service");
const information_extraction_controller_1 = require("./information-extraction.controller");
const database_module_1 = require("../database/database.module");
const config_1 = require("@nestjs/config");
let InformationExtractionModule = class InformationExtractionModule {
};
exports.InformationExtractionModule = InformationExtractionModule;
exports.InformationExtractionModule = InformationExtractionModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, config_1.ConfigModule],
        providers: [information_extraction_service_1.InformationExtractionService],
        controllers: [information_extraction_controller_1.InformationExtractionController],
        exports: [information_extraction_service_1.InformationExtractionService],
    })
], InformationExtractionModule);
//# sourceMappingURL=information-extraction.module.js.map