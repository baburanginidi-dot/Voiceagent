
import { AnalyticsData, CallLog, Stage, TranscriptItem } from '../types';
import { STAGES, getSystemInstruction } from '../constants';

const MOCK_LOGS: CallLog[] = [];

const MOCK_ANALYTICS: AnalyticsData = {
  totalCalls: 0,
  avgDuration: '0m 0s',
  conversionRate: 0,
  dropOffByStage: [0, 0, 0, 0, 0, 0], 
};

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
    currentStages = newStages; 
    return new Promise(resolve => setTimeout(() => resolve(true), 800));
  }
};
