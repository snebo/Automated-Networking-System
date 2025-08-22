"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkCallDto = exports.AssignScriptDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class AssignScriptDto {
}
exports.AssignScriptDto = AssignScriptDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Script ID to assign to the business',
        example: 'script-uuid-here',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignScriptDto.prototype, "scriptId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Custom goal to override the script default goal',
        example: 'I need to schedule an appointment with a cardiologist',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssignScriptDto.prototype, "customGoal", void 0);
class BulkCallDto {
    constructor() {
        this.concurrent = false;
    }
}
exports.BulkCallDto = BulkCallDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of business IDs to call',
        example: ['business-uuid-1', 'business-uuid-2'],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], BulkCallDto.prototype, "businessIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Script ID to use for all calls (optional if businesses have assigned scripts)',
        example: 'script-uuid-here',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkCallDto.prototype, "overrideScriptId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Custom goal to use for all calls',
        example: 'I need technical support',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkCallDto.prototype, "overrideGoal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether to call businesses concurrently or sequentially',
        example: false,
        default: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], BulkCallDto.prototype, "concurrent", void 0);
//# sourceMappingURL=business-script.dto.js.map