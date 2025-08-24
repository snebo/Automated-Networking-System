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
exports.InitiateCallDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class InitiateCallDto {
}
exports.InitiateCallDto = InitiateCallDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The phone number to call',
        example: '+14155552671',
        required: true,
    }),
    (0, class_validator_1.IsPhoneNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InitiateCallDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the script to use for this call',
        example: 'script-123e4567-e89b-12d3-a456-426614174000',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], InitiateCallDto.prototype, "scriptId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The goal for this call - what the AI should try to achieve',
        example: 'I need to find a cardiologist for an appointment',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], InitiateCallDto.prototype, "goal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The name of the company/facility being called',
        example: 'Memorial Hospital',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], InitiateCallDto.prototype, "companyName", void 0);
//# sourceMappingURL=initiate-call.dto.js.map