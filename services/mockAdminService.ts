
import { AnalyticsData, CallLog, Stage, TranscriptItem } from '../types';
import { STAGES, getSystemInstruction } from '../constants';

// Helper to generate mock transcript
const createTranscript = (name: string, length: 'short' | 'long'): TranscriptItem[] => {
    const t: TranscriptItem[] = [
        { id: '1', sender: 'agent', text: `Hello ${name}! Nen Maya — mee onboarding assistant. Meeru seat reserve chesinanduku big congratulations!`, timestamp: new Date(Date.now() - 100000) },
        { id: '2', sender: 'user', text: 'Thank you Maya. I am excited.', timestamp: new Date(Date.now() - 95000) },
    ];
    
    if (length === 'long') {
        t.push(
            { id: '3', sender: 'agent', text: `Simple ga cheppalante... idi just normal online course kaadu. Idi mee career ni full ga transform chese journey.`, timestamp: new Date(Date.now() - 90000) },
            { id: '4', sender: 'user', text: 'Okay, tell me about the placements.', timestamp: new Date(Date.now() - 85000) },
            { id: '5', sender: 'agent', text: `Sure. 3000+ companies hire from us. We provide dedicated mentor support.`, timestamp: new Date(Date.now() - 80000) },
            { id: '6', sender: 'user', text: 'That sounds good. How do I pay?', timestamp: new Date(Date.now() - 75000) }
        );
    }
    return t;
};

// Mock Data Store
const MOCK_LOGS: CallLog[] = [
  { 
    id: '101', 
    studentName: 'Arjun Reddy', 
    phoneNumber: '+91 98480 22338',
    date: '2023-10-24 10:30 AM', 
    duration: '4m 12s', 
    status: 'Payment Selected', 
    stageReached: 3,
    aiSummary: 'Student was enthusiastic. Inquired about placement stats. Proceeded to select Credit Card payment after understanding the value proposition.',
    transcript: createTranscript('Arjun', 'long'),
    paymentMethod: 'Credit Card'
  },
  { 
    id: '102', 
    studentName: 'Sneha P', 
    phoneNumber: '+91 99887 76655',
    date: '2023-10-24 11:15 AM', 
    duration: '1m 05s', 
    status: 'Dropped', 
    stageReached: 1,
    aiSummary: 'Call disconnected during the introduction phase. User seemed hesitant to speak.',
    transcript: createTranscript('Sneha', 'short')
  },
  { 
    id: '103', 
    studentName: 'Rahul K', 
    phoneNumber: '+91 88776 65544',
    date: '2023-10-24 12:00 PM', 
    duration: '3m 45s', 
    status: 'Completed', 
    stageReached: 6,
    aiSummary: 'Successful onboarding. User verified all details and agreed to open the KYC portal immediately.',
    transcript: createTranscript('Rahul', 'long')
  },
  { 
    id: '104', 
    studentName: 'Priya M', 
    phoneNumber: '+91 77665 54433',
    date: '2023-10-24 02:20 PM', 
    duration: '5m 10s', 
    status: 'Payment Selected', 
    stageReached: 3,
    aiSummary: 'User opted for Personal Loan. Requested a callback from the finance team for assistance with documentation.',
    transcript: createTranscript('Priya', 'long'),
    paymentMethod: 'Personal Loan'
  },
  { 
    id: '105', 
    studentName: 'Vikram S', 
    phoneNumber: '+91 66554 43322',
    date: '2023-10-24 03:45 PM', 
    duration: '2m 30s', 
    status: 'Dropped', 
    stageReached: 2,
    aiSummary: 'User dropped off while explaining the program value. Might be busy, suggested follow-up later.',
    transcript: createTranscript('Vikram', 'long')
  },
  { 
    id: '106', 
    studentName: 'Karthik V', 
    phoneNumber: '+91 99000 11223',
    date: '2023-10-24 04:15 PM', 
    duration: '6m 20s', 
    status: 'Payment Selected', 
    stageReached: 3,
    aiSummary: 'Student interested in Full Payment but had a question about refunds. Cleared doubts and proceeded.',
    transcript: createTranscript('Karthik', 'long'),
    paymentMethod: 'Full Payment'
  },
];

const MOCK_ANALYTICS: AnalyticsData = {
  totalCalls: 142,
  avgDuration: '3m 24s',
  conversionRate: 68,
  dropOffByStage: [5, 12, 45, 10, 5, 23], 
};

// In-memory store for stages to simulate updates during the session
let currentStages = [...STAGES];

export const MockAdminService = {
  getAnalytics: async (): Promise<AnalyticsData> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_ANALYTICS), 600));
  },

  getRecentLogs: async (): Promise<CallLog[]> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_LOGS), 500));
  },

  getSystemConfig: async () => {
    return new Promise(resolve => setTimeout(() => resolve({
      // We dynamically build the prompt based on the *current* in-memory stages
      systemPrompt: getSystemInstruction('{{Student Name}}', currentStages), 
      stages: currentStages
    }), 400));
  },

  updateSystemPrompt: async (newPrompt: string) => {
    console.log("Mock API: Updating System Prompt to:", newPrompt);
    return new Promise(resolve => setTimeout(() => resolve(true), 800));
  },

  updateStages: async (newStages: Stage[]) => {
    console.log("Mock API: Updating Stages to:", newStages);
    currentStages = newStages; // Update in-memory store
    return new Promise(resolve => setTimeout(() => resolve(true), 800));
  }
};