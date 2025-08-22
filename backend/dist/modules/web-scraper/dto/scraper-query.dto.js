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
exports.ScraperQueryDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const scraper_interface_1 = require("../interfaces/scraper.interface");
class ScraperQueryDto {
}
exports.ScraperQueryDto = ScraperQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Industry or business category to search for',
        example: 'restaurants',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScraperQueryDto.prototype, "industry", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Geographic location to search in',
        example: 'New York, NY',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScraperQueryDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Specific business type',
        example: 'pizza restaurant',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScraperQueryDto.prototype, "businessType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Keywords to search for',
        example: ['pizza', 'delivery', 'italian'],
        required: false,
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ScraperQueryDto.prototype, "keywords", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Maximum number of results to return',
        example: 50,
        minimum: 1,
        maximum: 500,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Number)
], ScraperQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Data sources to scrape from',
        enum: scraper_interface_1.DataSource,
        enumName: 'DataSource',
        example: [scraper_interface_1.DataSource.GOOGLE_SEARCH, scraper_interface_1.DataSource.DUCKDUCKGO],
        required: false,
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(scraper_interface_1.DataSource, { each: true }),
    __metadata("design:type", Array)
], ScraperQueryDto.prototype, "sources", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Target person to find (e.g., head doctor, manager, owner)',
        example: 'head doctor',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScraperQueryDto.prototype, "targetPerson", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Specific goal for calling these businesses',
        example: 'Schedule cardiology appointment',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScraperQueryDto.prototype, "specificGoal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Minimum business rating (1-5)',
        example: 4,
        minimum: 1,
        maximum: 5,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], ScraperQueryDto.prototype, "minRating", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Business size filter',
        enum: ['small', 'medium', 'large', 'enterprise'],
        example: 'medium',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScraperQueryDto.prototype, "businessSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Only include businesses with websites',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScraperQueryDto.prototype, "hasWebsite", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Only include businesses with phone numbers',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScraperQueryDto.prototype, "hasPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Only businesses established since this year',
        example: 2010,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ScraperQueryDto.prototype, "establishedSince", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Content types to exclude from results',
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
], ScraperQueryDto.prototype, "excludeContentTypes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Only return actual business listings (excludes blog articles, news, etc.)',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScraperQueryDto.prototype, "onlyBusinessListings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Require businesses to have a physical location/address',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScraperQueryDto.prototype, "requirePhysicalLocation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable two-phase verification workflow (verify number then gather info)',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScraperQueryDto.prototype, "enableVerificationWorkflow", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Automatically generate tailored scripts for each business',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScraperQueryDto.prototype, "autoGenerateScripts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Priority for processing these businesses',
        enum: ['low', 'normal', 'high', 'urgent'],
        example: 'normal',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScraperQueryDto.prototype, "priority", void 0);
//# sourceMappingURL=scraper-query.dto.js.map