// Service to save analytics and session data to the database
import { InsertTranscript, InsertStageMovement } from '../shared/schema';
import { getApiBaseUrl } from './api';

export interface SessionData {
  userName: string;
  userPhone: string;
  transcripts: Array<{ sender: 'user' | 'agent'; text: string }>;
  finalStage: number;
  duration: number; // in seconds
  endReason: 'logout' | 'payment_selected' | 'kyc_complete' | 'error' | 'disconnect';
  paymentMethod?: string;
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor(private backendUrl: string) {}

  static getInstance(backendUrl: string = ''): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(backendUrl || getApiBaseUrl());
    }
    return AnalyticsService.instance;
  }

  /**
   * Save a conversation session to the database
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
   * Log a single transcript entry
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
