
import { AnalyticsData, CallLog, Stage, TranscriptItem } from '../types';
import { STAGES, getSystemInstruction } from '../constants';

let currentStages = [...STAGES];

const getApiBaseUrl = () => {
  // In development, API is on localhost:3001
  // In production/Replit, it's on the same host
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  return '';
};

export const MockAdminService = {
  getAnalytics: async (): Promise<AnalyticsData> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/analytics/analytics`);
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
    
    // Fallback
    return {
      totalCalls: 0,
      avgDuration: '0m 0s',
      conversionRate: 0,
      dropOffByStage: [0, 0, 0, 0, 0, 0],
    };
  },

  getRecentLogs: async (): Promise<CallLog[]> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/analytics/logs`);
      const data = await response.json();
      if (data.success && data.logs) {
        return data.logs;
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
    
    // Fallback to empty logs
    return [];
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
