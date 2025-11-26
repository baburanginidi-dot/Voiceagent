
import { AnalyticsData, CallLog, Stage, TranscriptItem, SystemPrompt } from '../types';
import { STAGES, getSystemInstruction } from '../constants';

let currentStages = [...STAGES];

const getApiBaseUrl = () => {
  // In development, API is on localhost:3001
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    // In Replit dev environment (dev domain)
    if (window.location.hostname.includes('replit.dev') || window.location.hostname.includes('kirk.replit.dev')) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:3001`;
    }
    // In Replit production (published app)
    if (window.location.hostname.includes('replit.app')) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:3001`;
    }
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
    try {
      // Save each stage to backend
      for (const stage of newStages) {
        const stageId = typeof stage.id === 'string' ? parseInt(stage.id, 10) : stage.id;
        const url = `${getApiBaseUrl()}/api/config/stages/${stageId}`;
        console.log(`Updating stage at URL: ${url}`, { stage });
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: stage.title,
            description: stage.description,
            systemPrompt: stage.systemPrompt,
            knowledgeBase: stage.knowledgeBase
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server error for stage ${stageId}:`, errorText);
          throw new Error(`Failed to save stage ${stageId}: ${response.status}`);
        }
      }
      console.log("API: Stages updated successfully");
      currentStages = newStages;
      return true;
    } catch (error) {
      console.error("Failed to update stages:", error);
      throw error;
    }
  },

  deleteStage: async (stageId: number) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/config/stages/${stageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Failed to delete stage ${stageId}`);
      }
      console.log("API: Stage deleted successfully");
      currentStages = currentStages.filter(s => s.id !== stageId);
      return true;
    } catch (error) {
      console.error("Failed to delete stage:", error);
      throw error;
    }
  },

  // Global & Turn-taking Prompts CRUD
  getPrompts: async (): Promise<SystemPrompt[]> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/config/prompts`);
      const data = await response.json();
      if (data.success && data.prompts) {
        return data.prompts;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
      return [];
    }
  },

  createPrompt: async (promptType: 'global' | 'turn_taking', prompt: string, metadata?: any): Promise<SystemPrompt | null> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/config/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType, prompt, metadata })
      });
      if (!response.ok) {
        throw new Error(`Failed to create prompt: ${response.status}`);
      }
      console.log("API: Prompt created successfully");
      return await response.json();
    } catch (error) {
      console.error("Failed to create prompt:", error);
      throw error;
    }
  },

  updatePrompt: async (promptId: number, prompt: string, metadata?: any): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/config/prompts/${promptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, metadata })
      });
      if (!response.ok) {
        throw new Error(`Failed to update prompt: ${response.status}`);
      }
      console.log("API: Prompt updated successfully");
      return true;
    } catch (error) {
      console.error("Failed to update prompt:", error);
      throw error;
    }
  },

  deletePrompt: async (promptId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/config/prompts/${promptId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Failed to delete prompt: ${response.status}`);
      }
      console.log("API: Prompt deleted successfully");
      return true;
    } catch (error) {
      console.error("Failed to delete prompt:", error);
      throw error;
    }
  }
};
