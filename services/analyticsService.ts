// Service to save analytics and session data to the database
import { InsertTranscript, InsertStageMovement } from '../shared/schema';

/**
 * @interface SessionData
 * Defines the shape of the session data to be saved.
 * @property {string} userName - The name of the user.
 * @property {string} userPhone - The phone number of the user.
 * @property {Array<{ sender: 'user' | 'agent'; text: string }>} transcripts - The conversation transcripts.
 * @property {number} finalStage - The final stage reached in the conversation.
 * @property {number} duration - The duration of the session in seconds.
 * @property {'logout' | 'payment_selected' | 'kyc_complete' | 'error' | 'disconnect'} endReason - The reason the session ended.
 * @property {string} [paymentMethod] - The payment method selected by the user.
 */
export interface SessionData {
  userName: string;
  userPhone: string;
  transcripts: Array<{ sender: 'user' | 'agent'; text: string }>;
  finalStage: number;
  duration: number; // in seconds
  endReason: 'logout' | 'payment_selected' | 'kyc_complete' | 'error' | 'disconnect';
  paymentMethod?: string;
}

/**
 * Determines the appropriate backend URL based on the environment.
 * @returns {string} The backend URL.
 */
const getBackendUrl = (): string => {
  // Try to use the configured backend URL from environment
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  // Fallback: use current hostname with port 3001
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    return `${protocol}//${host}:3001`;
  }
  return 'http://localhost:3001';
};

/**
 * @class AnalyticsService
 * A singleton service for handling analytics and session data.
 */
export class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor(private backendUrl: string) {}

  /**
   * Gets the singleton instance of the AnalyticsService.
   * @param {string} [backendUrl=''] - The backend URL to use.
   * @returns {AnalyticsService} The singleton instance.
   */
  static getInstance(backendUrl: string = ''): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(backendUrl || getBackendUrl());
    }
    return AnalyticsService.instance;
  }

  /**
   * Saves a conversation session to the database.
   * @param {SessionData} session - The session data to save.
   * @returns {Promise<boolean>} A promise that resolves to true if the session was saved successfully, false otherwise.
   */
  async saveSession(session: SessionData): Promise<boolean> {
    try {
      // Create a sessionId for this conversation
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Build the request payload
      const payload = {
        userName: session.userName,
        userPhone: session.userPhone,
        transcripts: session.transcripts,
        finalStage: session.finalStage,
        duration: session.duration,
        endReason: session.endReason,
        paymentMethod: session.paymentMethod,
        sessionId
      };

      // Use full backend URL instead of relative path
      const apiUrl = `${this.backendUrl}/api/analytics/session`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Failed to save session:', response.statusText, response.status);
        return false;
      }

      console.log('Session saved successfully:', sessionId);
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      // Don't throw - allow the app to continue even if analytics fails
      return false;
    }
  }

  /**
   * Logs a single transcript entry.
   * @param {string} userName - The name of the user.
   * @param {string} userPhone - The phone number of the user.
   * @param {string} userMessage - The user's message.
   * @param {string} aiResponse - The AI's response.
   * @param {number} stage - The current stage of the conversation.
   * @returns {Promise<boolean>} A promise that resolves to true if the transcript was logged successfully, false otherwise.
   */
  async logTranscript(
    userName: string,
    userPhone: string,
    userMessage: string,
    aiResponse: string,
    stage: number
  ): Promise<boolean> {
    try {
      const payload = {
        userName,
        userPhone,
        userMessage,
        aiResponse,
        stage
      };

      const apiUrl = `${this.backendUrl}/api/analytics/transcript`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Error logging transcript:', error);
      return false;
    }
  }
}

export default AnalyticsService;
