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
exports.UnifiedWorkflowDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const scraper_interface_1 = require("../interfaces/scraper.interface");
class UnifiedWorkflowDto {
}
exports.UnifiedWorkflowDto = UnifiedWorkflowDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Industry or business category to search for',
        example: 'restaurants',
        required: true,
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "industry", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Geographic location to search in',
        example: 'New York, NY',
        required: true,
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Specific business type or subcategory',
        example: 'italian restaurants',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "businessType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Keywords to include in search',
        example: ['delivery', 'catering', 'organic'],
        required: false,
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UnifiedWorkflowDto.prototype, "keywords", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Maximum number of businesses to find',
        example: 20,
        minimum: 1,
        maximum: 100,
        required: false,
        default: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UnifiedWorkflowDto.prototype, "maxBusinesses", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Only include businesses with phone numbers',
        example: true,
        required: false,
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UnifiedWorkflowDto.prototype, "requirePhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Only include businesses with physical addresses',
        example: true,
        required: false,
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UnifiedWorkflowDto.prototype, "requireAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Content types to exclude from search results',
        enum: scraper_interface_1.ContentType,
        enumName: 'ContentType',
        example: [scraper_interface_1.ContentType.BLOG_ARTICLES, scraper_interface_1.ContentType.TOP_LISTS],
        required: false,
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(scraper_interface_1.ContentType, { each: true }),
    __metadata("design:type", Array)
], UnifiedWorkflowDto.prototype, "excludeContentTypes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Target person to find during the call',
        example: 'manager',
        required: true,
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "targetPerson", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Primary goal/purpose for calling these businesses',
        example: 'Discuss catering services for corporate events',
        required: true,
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "callingGoal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Specific information to gather from each business',
        example: ['menu pricing', 'catering capacity', 'delivery areas', 'contact information'],
        required: false,
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UnifiedWorkflowDto.prototype, "informationToGather", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Start calling immediately after scraping',
        example: true,
        required: false,
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UnifiedWorkflowDto.prototype, "startCallingImmediately", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Delay between calls in seconds',
        example: 30,
        minimum: 10,
        maximum: 300,
        required: false,
        default: 30,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(10),
    (0, class_validator_1.Max)(300),
    __metadata("design:type", Number)
], UnifiedWorkflowDto.prototype, "callDelay", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Maximum concurrent calls',
        example: 1,
        minimum: 1,
        maximum: 5,
        required: false,
        default: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], UnifiedWorkflowDto.prototype, "maxConcurrentCalls", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Workflow priority level',
        enum: ['low', 'normal', 'high', 'urgent'],
        example: 'normal',
        required: false,
        default: 'normal',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Your name/company for introductions',
        example: 'John Smith from ABC Catering Solutions',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "callerIdentity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Your contact information to share if requested',
        example: 'john@abccatering.com or (555) 123-4567',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "contactInfo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Email to notify when workflow completes',
        example: 'user@company.com',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnifiedWorkflowDto.prototype, "notificationEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Send progress updates during execution',
        example: false,
        required: false,
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UnifiedWorkflowDto.prototype, "sendProgressUpdates", void 0);
//# sourceMappingURL=unified-workflow.dto.js.map