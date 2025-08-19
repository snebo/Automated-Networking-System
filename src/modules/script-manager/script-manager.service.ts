import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface ScriptGenerationRequest {
  businessType: string;
  industry: string;
  specificGoal?: string;
  targetPerson?: string; // 'head doctor', 'brain surgeon', 'manager', etc.
  verificationMode?: boolean; // true for verification calls
}

export interface GeneratedScript {
  name: string;
  description: string;
  goal: string;
  context: string;
  phases: ScriptPhase[];
  adaptationRules: AdaptationRule[];
  targetPerson?: string;
  personFindingStrategy?: PersonFindingStrategy;
}

export interface ScriptPhase {
  step: number;
  action: string;
  text: string;
  expectedResponses?: string[];
  fallbackText?: string;
}

export interface AdaptationRule {
  trigger: string;
  action: string;
  parameters?: Record<string, any>;
}

export interface PersonFindingStrategy {
  department: string;
  titles: string[];
  ivrKeywords: string[];
  questions: string[];
  fallbackApproach: string;
}

@Injectable()
export class ScriptManagerService {
  private readonly logger = new Logger(ScriptManagerService.name);

  // Business type to script templates mapping
  private readonly scriptTemplates = {
    hospitals: {
      verification: {
        goal: 'Verify this is the correct number for {businessName}',
        phases: [
          { step: 1, action: 'greet', text: 'Hello, I\'m calling to verify that this is {businessName}?' },
          { step: 2, action: 'confirm', text: 'Yes, that\'s correct. Thank you for confirming.' },
          { step: 3, action: 'end', text: 'Have a great day!' }
        ]
      },
      information: {
        goal: 'Gather specific information about {targetPerson} at {businessName}',
        phases: [
          { step: 1, action: 'greet', text: 'Hello, I\'m looking to connect with {targetPerson} at {businessName}' },
          { step: 2, action: 'navigate', text: 'Could you please direct me to the {department} department?' },
          { step: 3, action: 'inquire', text: 'I\'m trying to reach {targetPerson}. Is this person available?' },
          { step: 4, action: 'gather_info', text: 'Could you provide me with their direct contact information or best time to reach them?' }
        ]
      }
    },
    restaurants: {
      verification: {
        goal: 'Verify this is {businessName} restaurant',
        phases: [
          { step: 1, action: 'greet', text: 'Hi, is this {businessName}?' },
          { step: 2, action: 'confirm', text: 'Perfect, thank you for confirming.' }
        ]
      },
      information: {
        goal: 'Get information about {targetPerson} at {businessName}',
        phases: [
          { step: 1, action: 'greet', text: 'Hello, I\'m calling {businessName}' },
          { step: 2, action: 'request', text: 'Could I speak with {targetPerson} please?' },
          { step: 3, action: 'inquire', text: 'I\'m looking for contact information or the best way to reach them.' }
        ]
      }
    },
    offices: {
      verification: {
        goal: 'Verify this is {businessName} office',
        phases: [
          { step: 1, action: 'greet', text: 'Good morning, is this {businessName}?' },
          { step: 2, action: 'confirm', text: 'Great, thank you for confirming.' }
        ]
      },
      information: {
        goal: 'Connect with {targetPerson} at {businessName}',
        phases: [
          { step: 1, action: 'greet', text: 'Hello, I\'m calling to speak with {targetPerson}' },
          { step: 2, action: 'navigate', text: 'Could you transfer me to their office or department?' },
          { step: 3, action: 'gather_info', text: 'I\'m looking for their direct line or email if possible.' }
        ]
      }
    }
  };

  // Person finding strategies by role
  private readonly personFindingStrategies = {
    'head doctor': {
      department: 'administration',
      titles: ['chief medical officer', 'medical director', 'head physician', 'chief of staff'],
      ivrKeywords: ['doctor', 'physician', 'medical', 'administration', 'staff'],
      questions: [
        'Who is the head doctor or chief medical officer?',
        'Can you connect me to the medical director?',
        'I need to speak with the chief of staff.'
      ],
      fallbackApproach: 'Ask for the main hospital administration department'
    },
    'brain surgeon': {
      department: 'neurology',
      titles: ['neurosurgeon', 'neurological surgeon', 'brain surgeon', 'head of neurology'],
      ivrKeywords: ['neurology', 'neurosurgery', 'brain', 'surgical'],
      questions: [
        'Do you have a neurosurgery department?',
        'Can you connect me to a brain surgeon?',
        'I need to speak with someone in neurology.'
      ],
      fallbackApproach: 'Ask for the surgical department or specialty services'
    },
    'cardiologist': {
      department: 'cardiology',
      titles: ['cardiologist', 'heart doctor', 'head of cardiology', 'cardiac specialist'],
      ivrKeywords: ['cardiology', 'heart', 'cardiac', 'cardiovascular'],
      questions: [
        'Do you have a cardiology department?',
        'Can you connect me to a cardiologist?',
        'I need to speak with a heart doctor.'
      ],
      fallbackApproach: 'Ask for specialty services or internal medicine'
    },
    'manager': {
      department: 'management',
      titles: ['manager', 'general manager', 'operations manager', 'store manager'],
      ivrKeywords: ['management', 'manager', 'supervisor', 'administration'],
      questions: [
        'Can I speak with the manager please?',
        'Is the general manager available?',
        'I need to speak with someone in management.'
      ],
      fallbackApproach: 'Ask for customer service or main office'
    },
    'owner': {
      department: 'ownership',
      titles: ['owner', 'proprietor', 'business owner'],
      ivrKeywords: ['owner', 'management', 'administration'],
      questions: [
        'Can I speak with the owner?',
        'Is the business owner available?',
        'I need to speak with the proprietor.'
      ],
      fallbackApproach: 'Ask for management or main office'
    }
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateScript(request: ScriptGenerationRequest): Promise<GeneratedScript> {
    this.logger.log(`Generating script for ${request.businessType} - ${request.industry}`);
    
    const businessCategory = this.categorizeBusinessType(request.businessType, request.industry);
    const scriptType = request.verificationMode ? 'verification' : 'information';
    
    const template = (this.scriptTemplates as any)[businessCategory]?.[scriptType] || 
                    (this.scriptTemplates as any)['offices'][scriptType];

    const personStrategy = request.targetPerson ? 
      (this.personFindingStrategies as any)[request.targetPerson.toLowerCase()] : null;

    const script: GeneratedScript = {
      name: this.generateScriptName(request),
      description: this.generateScriptDescription(request),
      goal: this.populateTemplate(template.goal, request),
      context: this.generateContext(request),
      phases: this.generatePhases(template.phases, request, personStrategy),
      adaptationRules: this.generateAdaptationRules(request, personStrategy),
      targetPerson: request.targetPerson,
      personFindingStrategy: personStrategy
    };

    this.logger.log(`Generated script: ${script.name}`);
    return script;
  }

  async createAndStoreScript(request: ScriptGenerationRequest): Promise<any> {
    const generatedScript = await this.generateScript(request);
    
    const script = await this.prisma.script.create({
      data: {
        name: generatedScript.name,
        description: generatedScript.description,
        goal: generatedScript.goal,
        context: generatedScript.context,
        phases: generatedScript.phases as any,
        adaptationRules: generatedScript.adaptationRules as any,
      }
    });

    this.logger.log(`Stored script with ID: ${script.id}`);
    return script;
  }

  private categorizeBusinessType(businessType: string, industry: string): string {
    const type = businessType.toLowerCase();
    const ind = industry?.toLowerCase() || '';

    if (type.includes('hospital') || ind.includes('healthcare') || ind.includes('medical')) {
      return 'hospitals';
    }
    if (type.includes('restaurant') || type.includes('food') || ind.includes('restaurant')) {
      return 'restaurants';
    }
    return 'offices';
  }

  private generateScriptName(request: ScriptGenerationRequest): string {
    const type = request.verificationMode ? 'Verification' : 'Information Gathering';
    const target = request.targetPerson ? ` for ${request.targetPerson}` : '';
    return `${type} Script - ${request.businessType}${target}`;
  }

  private generateScriptDescription(request: ScriptGenerationRequest): string {
    if (request.verificationMode) {
      return `Verification script for ${request.businessType} in ${request.industry}`;
    }
    return `Information gathering script for ${request.businessType}${request.targetPerson ? ` to find ${request.targetPerson}` : ''}`;
  }

  private populateTemplate(template: string, request: ScriptGenerationRequest): string {
    return template
      .replace(/{businessName}/g, '{businessName}')
      .replace(/{targetPerson}/g, request.targetPerson || 'the right person')
      .replace(/{department}/g, this.getDepartmentName(request.targetPerson));
  }

  private getDepartmentName(targetPerson?: string): string {
    if (!targetPerson) return 'appropriate department';
    const strategy = (this.personFindingStrategies as any)[targetPerson.toLowerCase()];
    return strategy?.department || 'appropriate department';
  }

  private generateContext(request: ScriptGenerationRequest): string {
    let context = `Business type: ${request.businessType}\nIndustry: ${request.industry}`;
    
    if (request.targetPerson) {
      context += `\nTarget person: ${request.targetPerson}`;
      const strategy = (this.personFindingStrategies as any)[request.targetPerson.toLowerCase()];
      if (strategy) {
        context += `\nDepartment: ${strategy.department}`;
        context += `\nPossible titles: ${strategy.titles.join(', ')}`;
      }
    }
    
    if (request.specificGoal) {
      context += `\nSpecific goal: ${request.specificGoal}`;
    }
    
    return context;
  }

  private generatePhases(templatePhases: any[], request: ScriptGenerationRequest, personStrategy?: PersonFindingStrategy): ScriptPhase[] {
    return templatePhases.map(phase => ({
      ...phase,
      text: this.populateTemplate(phase.text, request),
      expectedResponses: this.generateExpectedResponses(phase.action, personStrategy),
      fallbackText: this.generateFallbackText(phase.action, request, personStrategy)
    }));
  }

  private generateExpectedResponses(action: string, personStrategy?: PersonFindingStrategy): string[] {
    switch (action) {
      case 'greet':
        return ['yes', 'correct', 'this is', 'speaking', 'how can I help'];
      case 'navigate':
        if (personStrategy) {
          return personStrategy.ivrKeywords.map(keyword => `press ${keyword}`);
        }
        return ['transfer', 'connect', 'hold', 'department'];
      case 'inquire':
        return ['available', 'not available', 'hold', 'transfer', 'voicemail'];
      default:
        return ['yes', 'no', 'hold', 'transfer'];
    }
  }

  private generateFallbackText(action: string, request: ScriptGenerationRequest, personStrategy?: PersonFindingStrategy): string {
    switch (action) {
      case 'navigate':
        return personStrategy?.fallbackApproach || 'Could you direct me to someone who can help?';
      case 'inquire':
        return 'If they\'re not available, could you provide their contact information or best time to reach them?';
      default:
        return 'Could you help me with this request?';
    }
  }

  private generateAdaptationRules(request: ScriptGenerationRequest, personStrategy?: PersonFindingStrategy): AdaptationRule[] {
    const rules: AdaptationRule[] = [
      { trigger: 'ivr_detected', action: 'navigate_menu' },
      { trigger: 'busy_signal', action: 'retry_later' },
      { trigger: 'no_answer', action: 'retry_later' },
      { trigger: 'voicemail', action: 'leave_message' },
    ];

    if (personStrategy) {
      rules.push(
        { trigger: 'person_not_found', action: 'ask_for_department', parameters: { department: personStrategy.department } },
        { trigger: 'wrong_department', action: 'ask_for_transfer', parameters: { target_dept: personStrategy.department } },
      );
    }

    if (request.verificationMode) {
      rules.push({ trigger: 'verification_complete', action: 'end_call' });
    } else {
      rules.push(
        { trigger: 'information_gathered', action: 'thank_and_end' },
        { trigger: 'transfer_needed', action: 'request_transfer' }
      );
    }

    return rules;
  }

  // Get appropriate script for a business
  async getOrCreateScriptForBusiness(
    businessId: string, 
    targetPerson?: string, 
    specificGoal?: string,
    verificationMode: boolean = false
  ): Promise<any> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      throw new Error('Business not found');
    }

    const request: ScriptGenerationRequest = {
      businessType: business.industry || 'general business',
      industry: business.industry || 'general',
      specificGoal,
      targetPerson,
      verificationMode
    };

    return this.createAndStoreScript(request);
  }
}