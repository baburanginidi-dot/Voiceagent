
export enum StageStatus {
  LOCKED = 'locked',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export interface StageDocument {
  id: string;
  name: string;
  content: string;
  type: string;
}

export interface Stage {
  id: number;
  title: string;
  description: string;
  systemPrompt?: string; // Specific instructions for this stage
  knowledgeBase?: string; // Context/Facts for this stage
  documents?: StageDocument[]; // RAG Documents
}

export interface UserProfile {
  id?: string; // Database ID
  name: string;
  phone: string;
  kycStatus?: 'PENDING' | 'COMPLETED';
}

export interface TranscriptItem {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date | string; // Allow string for serialized API responses
}

// Admin Types matching DB Schema
export interface CallLog {
  id: string;
  studentName: string;
  phoneNumber: string; 
  date: string; // ISO Date String
  duration: string; // Formatted string or seconds in DB
  status: 'Completed' | 'Dropped' | 'Payment Selected';
  stageReached: number;
  aiSummary: string; 
  transcript: TranscriptItem[]; 
  paymentMethod?: string; // Nullable
  tags?: string[]; // For filtering
}

export interface AnalyticsData {
  totalCalls: number;
  avgDuration: string;
  conversionRate: number; // Percentage reaching payment
  dropOffByStage: number[]; // [Stage1, Stage2, ...]
  activeNow?: number; // Real-time metric
}

export interface SystemPrompt {
  id: number;
  promptType: 'global' | 'turn_taking' | 'stage';
  prompt: string;
  stageId?: number | null;
  version: number;
  isActive: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  systemPrompt: string;
  stages: Stage[];
}

// Live API Types
export interface LiveServerMessage {
  serverContent?: {
    modelTurn?: {
      parts: {
        inlineData?: {
          mimeType: string;
          data: string;
        };
        text?: string;
      }[];
    };
    turnComplete?: boolean;
    interrupted?: boolean;
    outputTranscription?: {
      text: string;
    };
    inputTranscription?: {
      text: string;
    };
  };
  toolCall?: {
    functionCalls: {
      name: string;
      id: string;
      args: any;
    }[];
  };
}
