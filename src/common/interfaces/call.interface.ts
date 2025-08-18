export enum CallStatus {
  INITIATING = 'initiating',
  RINGING = 'ringing',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BUSY = 'busy',
  NO_ANSWER = 'no-answer',
}

export interface CallSession {
  id: string;
  callSid: string;
  phoneNumber: string;
  scriptId: string;
  status: CallStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordingUrl?: string;
  transcript?: TranscriptEntry[];
  ivrMap?: IVRNode;
  outcome?: CallOutcome;
  metadata?: Record<string, any>;
}

export interface TranscriptEntry {
  timestamp: Date;
  speaker: 'agent' | 'human' | 'ivr';
  text: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface IVRNode {
  id: string;
  prompt: string;
  options: IVROption[];
  selectedOption?: string;
  timestamp: Date;
  children?: IVRNode[];
  metadata?: Record<string, any>;
}

export interface IVROption {
  key: string;
  description: string;
  action?: string;
  detected?: boolean;
}

export interface CallOutcome {
  success: boolean;
  goalAchieved: boolean;
  reason?: string;
  collectedData?: Record<string, any>;
  nextSteps?: string[];
}