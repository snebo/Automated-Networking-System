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
var IVRDetectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IVRDetectionService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
let IVRDetectionService = IVRDetectionService_1 = class IVRDetectionService {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(IVRDetectionService_1.name);
        this.ivrPatterns = [
            /press\s+(\d+|\*|\#)\s+for\s+([^.,]+?)(?=\.|\,|press|to\s+\w+|\s*$)/gi,
            /for\s+([^.,]+?),?\s+press\s+(\d+|\*|\#)/gi,
            /to\s+([^.,]+?),?\s+press\s+(\d+|\*|\#)/gi,
            /dial\s+(\d+|\*|\#)\s+for\s+([^.,]+?)(?=\.|\,|dial|press|\s*$)/gi,
            /you\s+have\s+reached/i,
            /thank\s+you\s+for\s+calling/i,
            /please\s+listen\s+carefully/i,
            /menu\s+options\s+have\s+changed/i,
        ];
        this.departmentKeywords = {
            sales: ['sales', 'new customer', 'purchase', 'buy', 'quote'],
            support: ['support', 'help', 'technical', 'problem', 'issue', 'troubleshoot'],
            billing: ['billing', 'payment', 'account', 'invoice', 'charge'],
            emergency: ['emergency', 'urgent', 'immediate', '911', 'crisis'],
            directory: ['directory', 'extension', 'operator', 'representative'],
            hours: ['hours', 'location', 'address', 'directions'],
        };
    }
    handleFinalTranscript(event) {
        const { callSid, transcript, confidence, timestamp } = event;
        if (this.isVoicemailPrompt(transcript)) {
            this.eventEmitter.emit('ivr.voicemail_detected', {
                callSid,
                transcript,
                confidence,
                timestamp,
            });
            return;
        }
        const detectedMenu = this.detectIVRMenu(callSid, transcript, confidence, timestamp);
        if (detectedMenu) {
            this.eventEmitter.emit('ivr.menu_detected', detectedMenu);
            detectedMenu.options.forEach((option) => {
                this.eventEmitter.emit('ivr.option_detected', {
                    callSid,
                    key: option.key,
                    description: option.description,
                    confidence: option.confidence,
                    timestamp,
                });
            });
            this.eventEmitter.emit('ivr.detection_completed', {
                callSid,
                transcript,
                ivrDetected: true,
                confidence,
                timestamp,
            });
        }
        else {
            this.eventEmitter.emit('ivr.detection_completed', {
                callSid,
                transcript,
                ivrDetected: false,
                confidence,
                timestamp,
            });
        }
    }
    detectIVRMenu(callSid, transcript, confidence, timestamp) {
        const normalizedText = this.normalizeIVRText(transcript.toLowerCase());
        const options = [];
        if (!this.isLikelyIVRMenu(normalizedText)) {
            return null;
        }
        const ivrMatches = [
            ...normalizedText.matchAll(/press\s+([0-9*#]+)\s+(?:for|to)\s+([^,.]+?)(?=\.|,|press|$)/gi),
            ...normalizedText.matchAll(/for\s+([^,.]+?),?\s+press\s+([0-9*#]+)/gi),
            ...normalizedText.matchAll(/to\s+([^,.]+?),?\s+press\s+([0-9*#]+)/gi),
        ];
        for (const match of ivrMatches) {
            let key;
            let description;
            if (match[0].startsWith('press') && /press\s+[0-9*#]+\s+(?:for|to)/.test(match[0])) {
                key = match[1];
                description = match[2];
            }
            else if (/(?:for|to)\s+.+\s+press\s+[0-9*#]+/.test(match[0])) {
                key = match[2];
                description = match[1];
            }
            else {
                key = match[2];
                description = match[1];
            }
            if (key && description) {
                const cleanDescription = this.cleanDescription(description);
                const optionConfidence = this.calculateOptionConfidence(cleanDescription);
                options.push({
                    key: key.trim(),
                    description: cleanDescription,
                    confidence: Math.min(confidence, optionConfidence),
                });
            }
        }
        if (options.length > 0) {
            const uniqueOptions = this.deduplicateOptions(options);
            return {
                callSid,
                options: uniqueOptions,
                fullText: transcript,
                timestamp,
                confidence: this.calculateMenuConfidence(uniqueOptions, normalizedText),
            };
        }
        return null;
    }
    isVoicemailPrompt(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        const strongIndicators = [
            'record your message',
            'leave your message',
            'leave a message',
            'at the tone',
            'after the beep',
            'voicemail',
            'voice mail',
            'message after the tone'
        ];
        for (const indicator of strongIndicators) {
            if (lowerTranscript.includes(indicator)) {
                return true;
            }
        }
        const recordingControlPatterns = [
            /to save.*press.*2/i,
            /to re-?record.*press/i,
            /to delete.*recording.*press/i,
            /listen.*recording.*press.*1/i,
            /message saved/i,
            /recording.*saved/i
        ];
        for (const pattern of recordingControlPatterns) {
            if (pattern.test(transcript)) {
                return true;
            }
        }
        const weakIndicators = [
            'unavailable',
            'not available to take your call',
            'unable to take your call',
            'please state your name',
            'clearly state your name',
            'leave a callback number',
            'leave your name and number',
            'we will return your call',
            'call you back',
            'someone will return your call',
            'currently closed'
        ];
        let matches = 0;
        for (const keyword of weakIndicators) {
            if (lowerTranscript.includes(keyword)) {
                matches++;
            }
        }
        return matches >= 2;
    }
    normalizeIVRText(text) {
        let normalized = text;
        const numberWords = {
            zero: '0',
            oh: '0',
            one: '1',
            two: '2',
            three: '3',
            four: '4',
            five: '5',
            six: '6',
            seven: '7',
            eight: '8',
            nine: '9',
        };
        for (const [word, digit] of Object.entries(numberWords)) {
            const regex = new RegExp(`press\\s+${word}\\b`, 'gi');
            normalized = normalized.replace(regex, `press ${digit}`);
        }
        normalized = normalized.replace(/\bpound(?:\s+key)?\b/gi, '#');
        normalized = normalized.replace(/\bhash(?:\s+key)?\b/gi, '#');
        normalized = normalized.replace(/\bstar\b/gi, '*');
        normalized = normalized.replace(/\basterisk\b/gi, '*');
        normalized = normalized.replace(/\s+/g, ' ').trim();
        return normalized;
    }
    isLikelyIVRMenu(text) {
        const indicators = [
            'press',
            'dial',
            'enter',
            'select',
            'for',
            'menu',
            'options',
            'department',
            'representative',
            'operator',
        ];
        const indicatorCount = indicators.filter((indicator) => text.includes(indicator)).length;
        const hasNumbers = /\b\d+\b/.test(text);
        return indicatorCount >= 2 || (indicatorCount >= 1 && hasNumbers);
    }
    cleanDescription(description) {
        return description
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[,\.]+$/, '')
            .toLowerCase();
    }
    calculateOptionConfidence(description) {
        let confidence = 0.5;
        for (const [category, keywords] of Object.entries(this.departmentKeywords)) {
            for (const keyword of keywords) {
                if (description.includes(keyword)) {
                    confidence += 0.2;
                    break;
                }
            }
        }
        const businessTerms = ['customer', 'service', 'information', 'hours', 'location'];
        for (const term of businessTerms) {
            if (description.includes(term)) {
                confidence += 0.1;
            }
        }
        return Math.min(confidence, 1.0);
    }
    calculateMenuConfidence(options, text) {
        if (options.length === 0)
            return 0;
        const avgOptionConfidence = options.reduce((sum, opt) => sum + opt.confidence, 0) / options.length;
        const optionCountBonus = Math.min(options.length * 0.1, 0.3);
        const standardPhrases = ['thank you for calling', 'please listen carefully', 'menu options'];
        const phraseBonus = standardPhrases.some((phrase) => text.includes(phrase)) ? 0.2 : 0;
        return Math.min(avgOptionConfidence + optionCountBonus + phraseBonus, 1.0);
    }
    deduplicateOptions(options) {
        const seen = new Set();
        return options.filter((option) => {
            const key = option.key + ':' + option.description;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    suggestOption(options, goal) {
        const goalLower = goal.toLowerCase();
        for (const option of options) {
            if (option.description.includes(goalLower)) {
                return option;
            }
        }
        for (const [category, keywords] of Object.entries(this.departmentKeywords)) {
            if (keywords.some((keyword) => goalLower.includes(keyword))) {
                for (const option of options) {
                    if (keywords.some((keyword) => option.description.includes(keyword))) {
                        return option;
                    }
                }
            }
        }
        return null;
    }
    getDetectionStats() {
        return {
            patterns: this.ivrPatterns.length,
            departmentCategories: Object.keys(this.departmentKeywords).length,
            totalKeywords: Object.values(this.departmentKeywords).flat().length,
        };
    }
};
exports.IVRDetectionService = IVRDetectionService;
__decorate([
    (0, event_emitter_1.OnEvent)('stt.final'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IVRDetectionService.prototype, "handleFinalTranscript", null);
exports.IVRDetectionService = IVRDetectionService = IVRDetectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], IVRDetectionService);
//# sourceMappingURL=ivr-detection.service.js.map