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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InformationExtractionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const information_extraction_service_1 = require("./information-extraction.service");
const information_extraction_dto_1 = require("./dto/information-extraction.dto");
let InformationExtractionController = class InformationExtractionController {
    constructor(informationService) {
        this.informationService = informationService;
    }
    async extractInformation(dto) {
        try {
            return await this.informationService.extractAndStoreInformation(dto.callId, dto.businessId, dto.transcript, dto.targetPerson, dto.goal);
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to extract information: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async searchInformation(query) {
        const searchQuery = {
            businessId: query.businessId,
            businessName: query.businessName,
            targetPerson: query.targetPerson,
            contactType: query.contactType,
            dateRange: query.dateRange ? {
                from: new Date(query.dateRange.from),
                to: new Date(query.dateRange.to)
            } : undefined,
            successfulOnly: query.successfulOnly,
            hasContactInfo: query.hasContactInfo,
            department: query.department,
            businessType: query.businessType
        };
        return await this.informationService.searchExtractedInformation(searchQuery);
    }
    async getBusinessInformation(businessId) {
        return await this.informationService.getBusinessInformation(businessId);
    }
    async getStatistics() {
        return await this.informationService.getExtractionStatistics();
    }
    async searchEntities(entityType, entityValue, businessId) {
        return [];
    }
    async getRecentExtractions(limit = '10', successfulOnly) {
        const searchQuery = {
            successfulOnly: successfulOnly === 'true',
            dateRange: {
                from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                to: new Date()
            }
        };
        const results = await this.informationService.searchExtractedInformation(searchQuery);
        return results.slice(0, parseInt(limit));
    }
    async getContactSummary(businessId) {
        const extractions = await this.informationService.getBusinessInformation(businessId);
        const targetPersonsFound = extractions
            .filter(e => e.contactInfo.targetPerson?.found)
            .map(e => ({
            name: e.contactInfo.targetPerson.name,
            title: e.contactInfo.targetPerson.title,
            phone: e.contactInfo.targetPerson.directPhone,
            email: e.contactInfo.targetPerson.email
        }));
        const alternativeContacts = extractions
            .flatMap(e => e.contactInfo.alternativeContacts || [])
            .filter(c => c.name)
            .map(c => ({
            name: c.name,
            role: c.title,
            phone: c.phone,
            email: c.email
        }));
        const mainContacts = extractions.reduce((acc, e) => {
            if (e.contactInfo.mainReceptionPhone)
                acc.phone = e.contactInfo.mainReceptionPhone;
            if (e.contactInfo.mainEmail)
                acc.email = e.contactInfo.mainEmail;
            return acc;
        }, { phone: undefined, email: undefined });
        return {
            businessId,
            totalExtractions: extractions.length,
            targetPersonsFound: this.deduplicateContacts(targetPersonsFound),
            alternativeContacts: this.deduplicateContacts(alternativeContacts),
            mainContacts,
            lastUpdated: extractions.length > 0 ? extractions[0].extractedAt : new Date()
        };
    }
    deduplicateContacts(contacts) {
        const seen = new Set();
        return contacts.filter(contact => {
            const key = `${contact.name}-${contact.phone || ''}-${contact.email || ''}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
};
exports.InformationExtractionController = InformationExtractionController;
__decorate([
    (0, common_1.Post)('extract'),
    (0, swagger_1.ApiOperation)({
        summary: 'Extract information from call transcript',
        description: 'Uses AI to analyze a call transcript and extract structured contact and business information'
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Information extracted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Call or business not found' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [information_extraction_dto_1.ExtractInformationDto]),
    __metadata("design:returntype", Promise)
], InformationExtractionController.prototype, "extractInformation", null);
__decorate([
    (0, common_1.Post)('search'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search extracted information',
        description: 'Search through extracted call information with various filters'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Search results returned' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid search criteria' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [information_extraction_dto_1.SearchInformationDto]),
    __metadata("design:returntype", Promise)
], InformationExtractionController.prototype, "searchInformation", null);
__decorate([
    (0, common_1.Get)('business/:businessId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all extracted information for a business',
        description: 'Retrieve all call information extractions for a specific business'
    }),
    (0, swagger_1.ApiParam)({ name: 'businessId', description: 'UUID of the business' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Business information returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Business not found' }),
    __param(0, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InformationExtractionController.prototype, "getBusinessInformation", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get extraction statistics',
        description: 'Get overall statistics about information extraction performance'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistics returned' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InformationExtractionController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('search-entities'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search information entities',
        description: 'Search for specific entities (people, phones, emails, etc.) across all extractions'
    }),
    (0, swagger_1.ApiQuery)({ name: 'entityType', description: 'Type of entity to search for' }),
    (0, swagger_1.ApiQuery)({ name: 'entityValue', description: 'Value to search for', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'businessId', description: 'Limit search to specific business', required: false }),
    __param(0, (0, common_1.Query)('entityType')),
    __param(1, (0, common_1.Query)('entityValue')),
    __param(2, (0, common_1.Query)('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InformationExtractionController.prototype, "searchEntities", null);
__decorate([
    (0, common_1.Get)('recent'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get recent extractions',
        description: 'Get the most recently extracted information'
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', description: 'Number of results to return', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'successfulOnly', description: 'Only return successful extractions', required: false }),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('successfulOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InformationExtractionController.prototype, "getRecentExtractions", null);
__decorate([
    (0, common_1.Get)('contacts/:businessId/summary'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get contact summary for business',
        description: 'Get a summary of all contact information gathered for a specific business'
    }),
    (0, swagger_1.ApiParam)({ name: 'businessId', description: 'UUID of the business' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Contact summary returned' }),
    __param(0, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InformationExtractionController.prototype, "getContactSummary", null);
exports.InformationExtractionController = InformationExtractionController = __decorate([
    (0, swagger_1.ApiTags)('information-extraction'),
    (0, common_1.Controller)('information'),
    __metadata("design:paramtypes", [information_extraction_service_1.InformationExtractionService])
], InformationExtractionController);
//# sourceMappingURL=information-extraction.controller.js.map