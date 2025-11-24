
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
  name: string;
  phone: string;
}

export interface AudioConfig {
  inputSampleRate: number;
  outputSampleRate: number;
}

export interface TranscriptItem {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

// Admin Types
export interface CallLog {
  id: string;
  studentName: string;
  phoneNumber: string; 
  date: string;
  duration: string;
  status: 'Completed' | 'Dropped' | 'Payment Selected';
  stageReached: number;
  aiSummary: string; 
  transcript: TranscriptItem[]; 
  paymentMethod?: string; // Added field
}

export interface AnalyticsData {
  totalCalls: number;
  avgDuration: string;
  conversionRate: number; // Percentage reaching payment
  dropOffByStage: number[]; // [Stage1, Stage2, ...]
}

export interface SystemConfig {
  systemPrompt: string;
  stages: Stage[];
}

// Types for Live API Events
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