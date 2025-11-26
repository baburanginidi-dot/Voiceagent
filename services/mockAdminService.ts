
import { AnalyticsData, CallLog, Stage, TranscriptItem } from '../types';
import { STAGES, getSystemInstruction } from '../constants';

let currentStages = [...STAGES];

/**
 * Gets the base URL for the API.
 * @returns {string} The base URL for the API.
 */
const getApiBaseUrl = () => {
  // In development, API is on localhost:3001
  // In production/Replit, it's on the same host
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  return '';
};

/**
 * @const {object} MockAdminService
 * An object that provides mock admin service functionalities, including fetching analytics, logs, and system configuration.
 */
export const MockAdminService = {
  /**
   * Fetches analytics data from the backend.
   * @returns {Promise<AnalyticsData>} A promise that resolves to the analytics data.
   */
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

  /**
   * Fetches recent call logs from the backend.
   * @returns {Promise<CallLog[]>} A promise that resolves to an array of call logs.
   */
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

  /**
   * Fetches the system configuration, including the system prompt and stages.
   * @returns {Promise<{systemPrompt: string, stages: Stage[]}>} A promise that resolves to the system configuration.
   */
  getSystemConfig: async () => {
    return new Promise(resolve => setTimeout(() => resolve({
      systemPrompt: getSystemInstruction('{{Student Name}}', currentStages), 
      stages: currentStages
    }), 400));
  },

  /**
   * Updates the system prompt.
   * @param {string} newPrompt - The new system prompt.
   * @returns {Promise<boolean>} A promise that resolves to true if the update was successful.
   */
  updateSystemPrompt: async (newPrompt: string) => {
    console.log("Mock API: Updating System Prompt to:", newPrompt);
    return new Promise(resolve => setTimeout(() => resolve(true), 800));
  },

  /**
   * Updates the stages.
   * @param {Stage[]} newStages - The new array of stages.
   * @returns {Promise<boolean>} A promise that resolves to true if the update was successful.
   */
  updateStages: async (newStages: Stage[]) => {
    try {
      // Save each stage to backend
      for (const stage of newStages) {
        const response = await fetch(`${getApiBaseUrl()}/api/config/stages/${stage.id}`, {
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
          throw new Error(`Failed to save stage ${stage.id}`);
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

  /**
   * Deletes a stage by its ID.
   * @param {number} stageId - The ID of the stage to delete.
   * @returns {Promise<boolean>} A promise that resolves to true if the deletion was successful.
   */
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
  }
};
