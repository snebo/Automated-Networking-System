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
exports.BulkExtractionDto = exports.SearchInformationDto = exports.ExtractInformationDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class ExtractInformationDto {
}
exports.ExtractInformationDto = ExtractInformationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Call ID to extract information from',
        example: 'call-uuid-here'
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ExtractInformationDto.prototype, "callId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Business ID this call was made to',
        example: 'business-uuid-here'
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ExtractInformationDto.prototype, "businessId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Full call transcript to analyze',
        example: 'Hello, thank you for calling ABC Hospital. How can I help you today?'
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtractInformationDto.prototype, "transcript", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Target person that was being sought',
        example: 'head doctor',
        required: false
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ExtractInformationDto.prototype, "targetPerson", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Goal of the call',
        example: 'Schedule an appointment with a cardiologist',
        required: false
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ExtractInformationDto.prototype, "goal", void 0);
class DateRangeDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Start date for search range',
        example: '2024-01-01T00:00:00.000Z'
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DateRangeDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'End date for search range',
        example: '2024-12-31T23:59:59.999Z'
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DateRangeDto.prototype, "to", void 0);
class SearchInformationDto {
}
exports.SearchInformationDto = SearchInformationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search by specific business ID',
        example: 'business-uuid-here',
        required: false
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchInformationDto.prototype, "businessId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search by business name',
        example: 'ABC Hospital',
        required: false
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchInformationDto.prototype, "businessName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search for specific target person',
        example: 'Dr. Smith',
        required: false
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchInformationDto.prototype, "targetPerson", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filter by contact type',
        enum: ['phone', 'email', 'in-person'],
        required: false
    }),
    (0, class_validator_1.IsEnum)(['phone', 'email', 'in-person']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchInformationDto.prototype, "contactType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Date range for search',
        type: DateRangeDto,
        required: false
    }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DateRangeDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", DateRangeDto)
], SearchInformationDto.prototype, "dateRange", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Only return successful extractions',
        example: true,
        required: false
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], SearchInformationDto.prototype, "successfulOnly", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Only return extractions with contact information',
        example: true,
        required: false
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], SearchInformationDto.prototype, "hasContactInfo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search by department',
        example: 'cardiology',
        required: false
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchInformationDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search by business type',
        example: 'hospital',
        required: false
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchInformationDto.prototype, "businessType", void 0);
class BulkExtractionDto {
    constructor() {
        this.concurrent = false;
    }
}
exports.BulkExtractionDto = BulkExtractionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of call IDs to process',
        example: ['call-uuid-1', 'call-uuid-2']
    }),
    (0, class_validator_1.IsUUID)(undefined, { each: true }),
    __metadata("design:type", Array)
], BulkExtractionDto.prototype, "callIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Process extractions concurrently',
        example: false,
        default: false,
        required: false
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], BulkExtractionDto.prototype, "concurrent", void 0);
//# sourceMappingURL=information-extraction.dto.js.map