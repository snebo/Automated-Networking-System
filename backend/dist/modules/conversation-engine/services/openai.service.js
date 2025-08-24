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
var OpenAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
let OpenAIService = OpenAIService_1 = class OpenAIService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(OpenAIService_1.name);
        this.openaiClient = null;
        this.isConfigured = false;
        this.initializeOpenAI();
    }
    initializeOpenAI() {
        const apiKey = this.configService.get('ai.openai.apiKey');
        if (!apiKey) {
            this.logger.warn('OpenAI API key not configured. AI decisions will not be available.');
            return;
        }
        try {
            this.openaiClient = new openai_1.default({
                apiKey: apiKey,
            });
            this.isConfigured = true;
            this.logger.log('OpenAI client initialized successfully for AI decisions');
        }
        catch (error) {
            this.logger.error(`Failed to initialize OpenAI: ${error.message}`);
            this.isConfigured = false;
        }
    }
    async makeIVRDecision(context) {
        if (!this.isConfigured || !this.openaiClient) {
            throw new Error('OpenAI is not configured. Cannot make AI decisions.');
        }
        try {
            const prompt = this.buildDecisionPrompt(context);
            this.logger.log(`Making AI decision for call ${context.callSid}`);
            this.logger.debug(`Goal: ${context.goal}`);
            this.logger.debug(`Available options: ${context.detectedMenu.options.length}`);
            const response = await this.openaiClient.chat.completions.create({
                model: this.configService.get('ai.openai.model', 'gpt-4-turbo-preview'),
                messages: [
                    {
                        role: 'system',
                        content: `You are an intelligent IVR navigation agent specialized in medical and healthcare facilities. Your job is to analyze phone menu options and navigate to reach the appropriate department or person to achieve the given goal.

MEDICAL CONTEXT PRIORITIES:
1. For general managers/administration: Look for "administration", "office", "management", "director", "CEO", "admin"
2. For doctors/specialists: Look for "physician", "doctor", "specialist", "medical staff", "provider", "practitioner"
3. For appointments: Look for "scheduling", "appointments", "new patient", "existing patient"
4. For emergency: Always avoid emergency options unless explicitly needed
5. For voicemail: If you detect this is a voicemail system (mentions recording, leaving message), consider leaving a professional message with callback number

NAVIGATION STRATEGY:
- Prefer human operators when available (press 0, operator, representative)
- For medical facilities, administrative staff often have manager contacts
- Billing departments often know administrative contacts
- Patient relations or customer service can redirect to appropriate departments

Always respond in the specified JSON format.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: 'json_object' }
            });
            const aiResponse = response.choices[0].message.content;
            if (!aiResponse) {
                throw new Error('No response content from OpenAI');
            }
            const decision = JSON.parse(aiResponse);
            this.logger.log(`AI Decision: Select option ${decision.selectedOption} - ${decision.reasoning}`);
            return decision;
        }
        catch (error) {
            this.logger.error(`Failed to make AI decision: ${error.message}`, error.stack);
            return this.makeHeuristicDecision(context);
        }
    }
    buildDecisionPrompt(context) {
        const optionsText = context.detectedMenu.options
            .map(opt => `${opt.key}: ${opt.description} (confidence: ${(opt.confidence * 100).toFixed(1)}%)`)
            .join('\n');
        const previousActionsText = context.previousActions.length > 0
            ? `Previous actions taken: ${context.previousActions.join(', ')}`
            : 'This is the first menu encountered.';
        return `
GOAL: ${context.goal}
COMPANY: ${context.companyName || 'Unknown company'}
PHONE NUMBER: ${context.phoneNumber}

DETECTED IVR MENU OPTIONS:
${optionsText}

FULL MENU TRANSCRIPT:
"${context.detectedMenu.fullText}"

CONTEXT:
${previousActionsText}

INSTRUCTIONS:
You are calling a healthcare facility/medical organization on behalf of a business development professional.
Your goal is: "${context.goal}"

DECISION PRIORITY RULES:
1. **PHYSICIAN RECRUITER/RECRUITMENT**: Look for "physician referral", "medical staff", "recruitment", "HR", "human resources", "administration", "business office"
2. **CONTACT SPECIFIC PERSON**: Look for "directory", "extension", "operator", "administration", "management", "office"  
3. **GENERAL INQUIRIES**: If unsure, select "operator", "general inquiries", "other inquiries", "main menu", "directory"
4. **AVOID**: Patient-specific options (unless they lead to admin), emergency lines, specific medical departments

KEYWORD MATCHING PRIORITY:
- "physician recruiter" or "physician referral" → PERFECT MATCH (high confidence)
- "human resources" or "HR" → EXCELLENT MATCH  
- "administration" or "business office" → VERY GOOD MATCH
- "operator" or "directory" → GOOD FALLBACK
- "other inquiries" or "general inquiries" → ACCEPTABLE FALLBACK
- Patient services, specific departments → AVOID unless no better option

Analyze each option carefully and score them based on how well they align with finding administrative/business contacts, not patient services.

Respond with a JSON object containing:
{
  "selectedOption": "the key to press (1, 2, 3, etc.)",
  "reasoning": "detailed explanation of why this option best matches the goal, including what keywords triggered the selection",
  "response": "",
  "confidence": 0.95,
  "nextAction": "press_key"
}

nextAction options:
- "press_key": Press the DTMF key and continue
- "hangup": End the call if no viable option exists

Choose the option most likely to help achieve: "${context.goal}"
`;
    }
    makeHeuristicDecision(context) {
        this.logger.warn('Falling back to heuristic decision making');
        const goal = context.goal.toLowerCase();
        const options = context.detectedMenu.options;
        const scoringKeywords = {
            perfect: ['physician referral', 'physician recruiter', 'recruitment', 'recruiting'],
            excellent: ['human resources', 'hr', 'administration', 'business office'],
            veryGood: ['admin', 'management', 'director', 'manager', 'office'],
            good: ['operator', 'directory', 'extension', 'main'],
            acceptable: ['general inquiries', 'other inquiries', 'information'],
            avoid: ['patient', 'appointment', 'billing', 'emergency', 'medical records']
        };
        let bestOption = options[0];
        let bestScore = -100;
        for (const option of options) {
            const description = option.description.toLowerCase();
            let score = 0;
            if (scoringKeywords.perfect.some(keyword => description.includes(keyword))) {
                score = 100;
            }
            else if (scoringKeywords.excellent.some(keyword => description.includes(keyword))) {
                score = 90;
            }
            else if (scoringKeywords.veryGood.some(keyword => description.includes(keyword))) {
                score = 80;
            }
            else if (scoringKeywords.good.some(keyword => description.includes(keyword))) {
                score = 70;
            }
            else if (scoringKeywords.acceptable.some(keyword => description.includes(keyword))) {
                score = 60;
            }
            else if (scoringKeywords.avoid.some(keyword => description.includes(keyword))) {
                score = -10;
            }
            else {
                score = 30;
            }
            score += option.confidence * 10;
            this.logger.log(`Option ${option.key}: "${description}" → Score: ${score}`);
            if (score > bestScore) {
                bestScore = score;
                bestOption = option;
            }
        }
        this.logger.log(`🎯 Heuristic selection: Option ${bestOption.key} with score ${bestScore}`);
        return {
            selectedOption: bestOption.key,
            reasoning: `Heuristic selection: "${bestOption.description}" scored ${bestScore} points for goal "${context.goal}"`,
            response: '',
            confidence: Math.min(0.9, bestScore / 100),
            nextAction: 'press_key'
        };
    }
    async generateContextualResponse(situation, context) {
        if (!this.isConfigured || !this.openaiClient) {
            return `I'm navigating the phone system to help you with ${context.goal}.`;
        }
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.configService.get('ai.openai.model', 'gpt-4-turbo-preview'),
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI assistant making phone calls. Respond conversationally and professionally. Keep responses brief and natural for phone conversations.'
                    },
                    {
                        role: 'user',
                        content: `Situation: ${situation}\nGoal: ${context.goal}\nCompany: ${context.companyName || 'the company'}\n\nGenerate a brief, natural response for this situation.`
                    }
                ],
                temperature: 0.7,
                max_tokens: 100,
            });
            return response.choices[0].message.content?.trim() || 'I\'m working on that for you.';
        }
        catch (error) {
            this.logger.error(`Failed to generate contextual response: ${error.message}`);
            return `I'm helping you with ${context.goal}. Please hold on.`;
        }
    }
    isAvailable() {
        return this.isConfigured;
    }
};
exports.OpenAIService = OpenAIService;
exports.OpenAIService = OpenAIService = OpenAIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenAIService);
//# sourceMappingURL=openai.service.js.map