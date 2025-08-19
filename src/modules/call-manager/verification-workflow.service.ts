import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { TelephonyService } from '../telephony/telephony.service';
import { ScriptManagerService } from '../script-manager/script-manager.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface VerificationWorkflowRequest {
  businessId: string;
  targetPerson?: string;
  specificGoal?: string;
  priority?: number;
  skipVerification?: boolean; // For testing or when verification not needed
}

export interface WorkflowStatus {
  businessId: string;
  status: 'pending' | 'verifying' | 'verified' | 'failed_verification' | 'gathering_info' | 'completed' | 'failed';
  verificationCallSid?: string;
  informationCallSid?: string;
  verificationResult?: VerificationResult;
  informationResult?: InformationResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationResult {
  numberValid: boolean;
  businessConfirmed: boolean;
  alternativeNumber?: string;
  notes?: string;
}

export interface InformationResult {
  targetPersonFound: boolean;
  contactInformation?: {
    directPhone?: string;
    email?: string;
    extension?: string;
    department?: string;
    availableHours?: string;
  };
  alternativeContacts?: Array<{
    name?: string;
    role?: string;
    phone?: string;
    email?: string;
  }>;
  notes?: string;
}

@Injectable()
export class VerificationWorkflowService {
  private readonly logger = new Logger(VerificationWorkflowService.name);
  private activeWorkflows = new Map<string, WorkflowStatus>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly telephonyService: TelephonyService,
    private readonly scriptManager: ScriptManagerService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('verification-queue') private verificationQueue: Queue,
  ) {}

  async startWorkflow(request: VerificationWorkflowRequest): Promise<WorkflowStatus> {
    this.logger.log(`Starting verification workflow for business ${request.businessId}`);

    const business = await this.prisma.business.findUnique({
      where: { id: request.businessId }
    });

    if (!business) {
      throw new Error('Business not found');
    }

    if (!business.phoneNumber) {
      throw new Error('Business has no phone number');
    }

    const workflow: WorkflowStatus = {
      businessId: request.businessId,
      status: request.skipVerification ? 'verified' : 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeWorkflows.set(request.businessId, workflow);

    // Update business status
    await this.prisma.business.update({
      where: { id: request.businessId },
      data: { callStatus: 'workflow_pending' }
    });

    if (request.skipVerification) {
      // Skip verification and go directly to information gathering
      await this.startInformationGathering(request);
    } else {
      // Start with verification call
      await this.startVerification(request);
    }

    return workflow;
  }

  private async startVerification(request: VerificationWorkflowRequest): Promise<void> {
    this.logger.log(`Starting verification phase for business ${request.businessId}`);

    const workflow = this.activeWorkflows.get(request.businessId);
    if (!workflow) return;

    workflow.status = 'verifying';
    workflow.updatedAt = new Date();

    try {
      const business = await this.prisma.business.findUnique({
        where: { id: request.businessId }
      });

      // Generate verification script
      const verificationScript = await this.scriptManager.getOrCreateScriptForBusiness(
        request.businessId,
        undefined, // No specific person for verification
        undefined, // No specific goal for verification
        true // Verification mode
      );

      // Make verification call
      const callSid = await this.telephonyService.initiateCall(
        business!.phoneNumber!,
        verificationScript.id,
        `Verify this is ${business!.name}`,
        business!.name
      );

      workflow.verificationCallSid = callSid;
      workflow.updatedAt = new Date();

      this.logger.log(`Verification call initiated: ${callSid}`);

      // Set timeout for verification call
      setTimeout(() => {
        this.checkVerificationTimeout(request.businessId);
      }, 5 * 60 * 1000); // 5 minutes timeout

    } catch (error) {
      this.logger.error(`Failed to start verification for business ${request.businessId}: ${error.message}`);
      workflow.status = 'failed';
      workflow.error = error.message;
      workflow.updatedAt = new Date();

      await this.prisma.business.update({
        where: { id: request.businessId },
        data: { callStatus: 'failed' }
      });
    }
  }

  private async startInformationGathering(request: VerificationWorkflowRequest): Promise<void> {
    this.logger.log(`Starting information gathering phase for business ${request.businessId}`);

    const workflow = this.activeWorkflows.get(request.businessId);
    if (!workflow) return;

    workflow.status = 'gathering_info';
    workflow.updatedAt = new Date();

    try {
      const business = await this.prisma.business.findUnique({
        where: { id: request.businessId }
      });

      // Generate information gathering script
      const informationScript = await this.scriptManager.getOrCreateScriptForBusiness(
        request.businessId,
        request.targetPerson,
        request.specificGoal,
        false // Not verification mode
      );

      // Make information gathering call
      const callSid = await this.telephonyService.initiateCall(
        business!.phoneNumber!,
        informationScript.id,
        request.specificGoal || `Find ${request.targetPerson || 'the right contact'} at ${business!.name}`,
        business!.name
      );

      workflow.informationCallSid = callSid;
      workflow.updatedAt = new Date();

      this.logger.log(`Information gathering call initiated: ${callSid}`);

      // Set timeout for information call
      setTimeout(() => {
        this.checkInformationTimeout(request.businessId);
      }, 10 * 60 * 1000); // 10 minutes timeout

    } catch (error) {
      this.logger.error(`Failed to start information gathering for business ${request.businessId}: ${error.message}`);
      workflow.status = 'failed';
      workflow.error = error.message;
      workflow.updatedAt = new Date();

      await this.prisma.business.update({
        where: { id: request.businessId },
        data: { callStatus: 'failed' }
      });
    }
  }

  @OnEvent('call.ended')
  async handleCallEnded(event: { callSid: string; outcome?: any }) {
    this.logger.log(`Call ended: ${event.callSid}`);

    // Find workflow with this call SID
    const workflow = Array.from(this.activeWorkflows.values()).find(w => 
      w.verificationCallSid === event.callSid || w.informationCallSid === event.callSid
    );

    if (!workflow) return;

    if (workflow.verificationCallSid === event.callSid) {
      await this.handleVerificationComplete(workflow.businessId, event.outcome);
    } else if (workflow.informationCallSid === event.callSid) {
      await this.handleInformationComplete(workflow.businessId, event.outcome);
    }
  }

  private async handleVerificationComplete(businessId: string, outcome?: any): Promise<void> {
    this.logger.log(`Verification complete for business ${businessId}`);

    const workflow = this.activeWorkflows.get(businessId);
    if (!workflow) return;

    // Analyze verification result from call outcome
    const verificationResult = this.analyzeVerificationOutcome(outcome);
    workflow.verificationResult = verificationResult;

    if (verificationResult.numberValid && verificationResult.businessConfirmed) {
      workflow.status = 'verified';
      this.logger.log(`Business ${businessId} verified successfully`);

      // Update business status
      await this.prisma.business.update({
        where: { id: businessId },
        data: { callStatus: 'verified' }
      });

      // Start information gathering phase
      const request = this.getOriginalRequest(businessId);
      if (request) {
        await this.startInformationGathering(request);
      }
    } else {
      workflow.status = 'failed_verification';
      this.logger.log(`Business ${businessId} failed verification`);

      await this.prisma.business.update({
        where: { id: businessId },
        data: { 
          callStatus: 'failed_verification',
          metadata: { verificationResult } as any
        }
      });
    }

    workflow.updatedAt = new Date();
  }

  private async handleInformationComplete(businessId: string, outcome?: any): Promise<void> {
    this.logger.log(`Information gathering complete for business ${businessId}`);

    const workflow = this.activeWorkflows.get(businessId);
    if (!workflow) return;

    // Analyze information gathering result
    const informationResult = this.analyzeInformationOutcome(outcome);
    workflow.informationResult = informationResult;
    workflow.status = 'completed';
    workflow.updatedAt = new Date();

    // Update business with gathered information
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        callStatus: 'completed',
        metadata: {
          ...workflow.verificationResult ? { verificationResult: workflow.verificationResult } : {},
          informationResult,
          workflowCompletedAt: new Date()
        } as any
      }
    });

    this.logger.log(`Workflow completed for business ${businessId}`);

    // Emit completion event
    this.eventEmitter.emit('workflow.completed', {
      businessId,
      workflow,
      informationResult
    });
  }

  private analyzeVerificationOutcome(outcome?: any): VerificationResult {
    // Default successful verification
    // In a real implementation, this would analyze the call transcript
    // to determine if the business was actually verified
    return {
      numberValid: true,
      businessConfirmed: true,
      notes: 'Verification call completed'
    };
  }

  private analyzeInformationOutcome(outcome?: any): InformationResult {
    // Default result structure
    // In a real implementation, this would parse the call transcript
    // to extract contact information and determine if target person was found
    return {
      targetPersonFound: false, // Would be determined from transcript analysis
      notes: 'Information gathering call completed',
      contactInformation: {
        // Would be extracted from conversation
      }
    };
  }

  private async checkVerificationTimeout(businessId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(businessId);
    if (!workflow || workflow.status !== 'verifying') return;

    this.logger.warn(`Verification timeout for business ${businessId}`);
    workflow.status = 'failed_verification';
    workflow.error = 'Verification call timeout';
    workflow.updatedAt = new Date();

    await this.prisma.business.update({
      where: { id: businessId },
      data: { callStatus: 'failed_verification' }
    });
  }

  private async checkInformationTimeout(businessId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(businessId);
    if (!workflow || workflow.status !== 'gathering_info') return;

    this.logger.warn(`Information gathering timeout for business ${businessId}`);
    workflow.status = 'failed';
    workflow.error = 'Information gathering call timeout';
    workflow.updatedAt = new Date();

    await this.prisma.business.update({
      where: { id: businessId },
      data: { callStatus: 'failed' }
    });
  }

  private getOriginalRequest(businessId: string): VerificationWorkflowRequest | null {
    // In a production system, you'd store the original request
    // For now, return a basic request structure
    return {
      businessId,
      targetPerson: 'manager', // Default target
      specificGoal: 'Get contact information'
    };
  }

  // Public methods for monitoring and control

  async getWorkflowStatus(businessId: string): Promise<WorkflowStatus | null> {
    return this.activeWorkflows.get(businessId) || null;
  }

  async getAllActiveWorkflows(): Promise<WorkflowStatus[]> {
    return Array.from(this.activeWorkflows.values());
  }

  async cancelWorkflow(businessId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(businessId);
    if (!workflow) return false;

    // End any active calls
    if (workflow.verificationCallSid) {
      try {
        await this.telephonyService.endCall(workflow.verificationCallSid);
      } catch (error) {
        this.logger.warn(`Failed to end verification call: ${error.message}`);
      }
    }

    if (workflow.informationCallSid) {
      try {
        await this.telephonyService.endCall(workflow.informationCallSid);
      } catch (error) {
        this.logger.warn(`Failed to end information call: ${error.message}`);
      }
    }

    // Update status
    workflow.status = 'failed';
    workflow.error = 'Workflow cancelled';
    workflow.updatedAt = new Date();

    await this.prisma.business.update({
      where: { id: businessId },
      data: { callStatus: 'cancelled' }
    });

    this.activeWorkflows.delete(businessId);
    this.logger.log(`Workflow cancelled for business ${businessId}`);
    return true;
  }

  // Batch processing
  async startBatchWorkflow(requests: VerificationWorkflowRequest[]): Promise<WorkflowStatus[]> {
    this.logger.log(`Starting batch workflow for ${requests.length} businesses`);
    
    const results: WorkflowStatus[] = [];
    
    for (const request of requests) {
      try {
        const workflow = await this.startWorkflow(request);
        results.push(workflow);
        
        // Add delay between calls to avoid overwhelming systems
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      } catch (error) {
        this.logger.error(`Failed to start workflow for business ${request.businessId}: ${error.message}`);
        results.push({
          businessId: request.businessId,
          status: 'failed',
          error: error.message,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    return results;
  }
}