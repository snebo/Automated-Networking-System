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
Analyze the IVR menu options and select the best option to achieve the goal "${context.goal}".
Consider the option descriptions, confidence levels, and how they align with the stated goal.

Respond with a JSON object containing:
{
  "selectedOption": "the key to press (1, 2, 3, etc.)",
  "reasoning": "brief explanation of why this option was chosen",
  "response": "what the AI should say before/after making the selection",
  "confidence": 0.95,
  "nextAction": "press_key"
}

nextAction options:
- "press_key": Press the DTMF key and continue
- "speak": Speak to a human operator  
- "wait": Wait for more information
- "hangup": End the call (if no suitable option)

Choose the option most likely to help achieve: "${context.goal}"
`;
    }
    makeHeuristicDecision(context) {
        this.logger.warn('Falling back to heuristic decision making');
        const goal = context.goal.toLowerCase();
        const options = context.detectedMenu.options;
        const goalKeywords = {
            manager: ['administration', 'admin', 'office', 'management', 'director', 'manager', 'ceo', 'executive'],
            doctor: ['physician', 'doctor', 'medical', 'provider', 'specialist', 'practitioner', 'clinic'],
            appointment: ['appointment', 'scheduling', 'schedule', 'new patient', 'existing patient'],
            billing: ['billing', 'payment', 'insurance', 'financial', 'account'],
            operator: ['operator', 'representative', 'agent', 'person', 'human', 'speak', 'customer service', 'patient relations'],
            emergency: ['emergency', 'urgent', '911']
        };
        let bestOption = options[0];
        let bestScore = 0;
        for (const option of options) {
            const description = option.description.toLowerCase();
            let score = 0;
            for (const [category, keywords] of Object.entries(goalKeywords)) {
                if (goal.includes(category)) {
                    for (const keyword of keywords) {
                        if (description.includes(keyword)) {
                            score += 1;
                            break;
                        }
                    }
                }
            }
            score += option.confidence * 0.5;
            if (score > bestScore) {
                bestScore = score;
                bestOption = option;
            }
        }
        return {
            selectedOption: bestOption.key,
            reasoning: `Heuristic selection based on keyword matching for goal: ${context.goal}`,
            response: `I've selected option ${bestOption.key} for ${bestOption.description} to help with ${context.goal}.`,
            confidence: 0.7,
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