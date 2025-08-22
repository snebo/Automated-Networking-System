"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallManagerModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const call_manager_service_1 = require("./call-manager.service");
const call_processor_1 = require("./call.processor");
const verification_workflow_service_1 = require("./verification-workflow.service");
const telephony_module_1 = require("../telephony/telephony.module");
const information_extraction_module_1 = require("../information-extraction/information-extraction.module");
const script_manager_module_1 = require("../script-manager/script-manager.module");
const database_module_1 = require("../database/database.module");
let CallManagerModule = class CallManagerModule {
};
exports.CallManagerModule = CallManagerModule;
exports.CallManagerModule = CallManagerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bull_1.BullModule.registerQueue({
                name: 'call-queue',
            }),
            bull_1.BullModule.registerQueue({
                name: 'verification-queue',
            }),
            database_module_1.DatabaseModule,
            telephony_module_1.TelephonyModule,
            information_extraction_module_1.InformationExtractionModule,
            script_manager_module_1.ScriptManagerModule,
        ],
        providers: [call_manager_service_1.CallManagerService, call_processor_1.CallProcessor, verification_workflow_service_1.VerificationWorkflowService],
        exports: [call_manager_service_1.CallManagerService, verification_workflow_service_1.VerificationWorkflowService],
    })
], CallManagerModule);
//# sourceMappingURL=call-manager.module.js.map