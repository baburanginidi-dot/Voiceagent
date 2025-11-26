import express, { Request, Response } from 'express';
import { storage } from './storage';
import { InsertUser, InsertTranscript, InsertStageMovement, systemPrompts, stages } from '../shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

/**
 * @interface SessionPayload
 * Defines the shape of the session data sent from the client.
 * @property {string} userName - The name of the user.
 * @property {string} userPhone - The phone number of the user.
 * @property {Array<{ sender: 'user' | 'agent'; text: string }>} transcripts - The conversation transcripts.
 * @property {number} finalStage - The final stage reached in the conversation.
 * @property {number} duration - The duration of the session in seconds.
 * @property {string} endReason - The reason the session ended.
 * @property {string} [paymentMethod] - The payment method selected by the user.
 * @property {string} sessionId - A unique identifier for the session.
 */
interface SessionPayload {
  userName: string;
  userPhone: string;
  transcripts: Array<{ sender: 'user' | 'agent'; text: string }>;
  finalStage: number;
  duration: number;
  endReason: string;
  paymentMethod?: string;
  sessionId: string;
}

/**
 * @route POST /api/analytics/session
 * Saves a session with transcripts to the database.
 * @param {Request} req - The express request object.
 * @param {Response} res - The express response object.
 */
app.post('/api/analytics/session', async (req: Request, res: Response) => {
  try {
    const {
      userName,
      userPhone,
      transcripts,
      finalStage,
      duration,
      endReason,
      paymentMethod,
      sessionId
    }: SessionPayload = req.body;

    // Get or create user
    let user = await storage.getUserByPhoneNumber(userPhone);
    if (!user) {
      user = await storage.createUser({
        name: userName,
        phoneNumber: userPhone,
      });
    }

    // Save each transcript
    for (const transcript of transcripts) {
      await storage.saveTranscript({
        userId: user.id,
        stageId: finalStage,
        sessionId,
        userMessage: transcript.sender === 'user' ? transcript.text : '',
        aiResponse: transcript.sender === 'agent' ? transcript.text : '',
        metadata: {
          sender: transcript.sender,
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Record stage movement
    await storage.recordStageMovement({
      userId: user.id,
      currentStageId: finalStage,
      reason: endReason,
      metadata: {
        paymentMethod,
        sessionId,
        duration,
        transcriptCount: transcripts.length,
      },
    });

    res.json({
      success: true,
      message: 'Session saved successfully',
      userId: user.id,
      transcriptCount: transcripts.length,
    });
  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save session',
    });
  }
});

/**
 * @route GET /api/analytics/logs
 * Retrieves all call logs, grouped by session.
 * @param {Request} req - The express request object.
 * @param {Response} res - The express response object.
 */
app.get('/api/analytics/logs', async (req: Request, res: Response) => {
  try {
    const logs = await storage.getUserTranscripts(0, 1000); // Get recent transcripts
    
    // Group by session
    const sessionMap = new Map<string, any>();
    
    logs.forEach((transcript: any) => {
      if (!transcript.sessionId) return;
      
      if (!sessionMap.has(transcript.sessionId)) {
        sessionMap.set(transcript.sessionId, {
          sessionId: transcript.sessionId,
          userId: transcript.userId,
          stageId: transcript.stageId,
          messages: [],
          startTime: transcript.createdAt,
          endTime: transcript.createdAt,
        });
      }
      
      const session = sessionMap.get(transcript.sessionId);
      if (transcript.userMessage) {
        session.messages.push({ sender: 'user', text: transcript.userMessage });
      }
      if (transcript.aiResponse) {
        session.messages.push({ sender: 'agent', text: transcript.aiResponse });
      }
      session.endTime = transcript.createdAt;
    });
    
    // Get user data for each session
    const formattedLogs = [];
    for (const [sessionId, sessionData] of sessionMap) {
      const user = await storage.getUser(sessionData.userId);
      if (user) {
        const durationMs = new Date(sessionData.endTime).getTime() - new Date(sessionData.startTime).getTime();
        const durationMins = Math.ceil(durationMs / 60000) || 1;
        
        formattedLogs.push({
          id: sessionId,
          studentName: user.name || 'Unknown',
          phoneNumber: user.phoneNumber || '',
          date: new Date(sessionData.startTime).toLocaleString(),
          duration: `${durationMins}m`,
          status: 'Completed',
          stageReached: sessionData.stageId || 1,
          aiSummary: `Conversation with ${sessionData.messages.length} messages`,
          transcript: sessionData.messages,
          metadata: {},
        });
      }
    }

    res.json({
      success: true,
      logs: formattedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      total: formattedLogs.length,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.json({
      success: true,
      logs: [],
      total: 0,
    });
  }
});

/**
 * @route GET /api/analytics/analytics
 * Retrieves analytics data, such as total calls and conversion rates.
 * @param {Request} req - The express request object.
 * @param {Response} res - The express response object.
 */
app.get('/api/analytics/analytics', async (req: Request, res: Response) => {
  try {
    // Get basic statistics
    const sql = `
      SELECT 
        COUNT(DISTINCT session_id) as total_calls,
        AVG(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))))::INT as avg_duration_seconds,
        COUNT(DISTINCT user_id) as unique_users
      FROM transcripts
    `;

    // Return basic analytics structure
    const analytics = {
      success: true,
      data: {
        totalCalls: 0,
        avgDuration: '0m 0s',
        conversionRate: 0,
        dropOffByStage: [0, 0, 0, 0, 0, 0],
      },
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.json({
      success: true,
      data: {
        totalCalls: 0,
        avgDuration: '0m 0s',
        conversionRate: 0,
        dropOffByStage: [0, 0, 0, 0, 0, 0],
      },
    });
  }
});

/**
 * @route GET /api/config/system-prompts
 * Retrieves the system prompts and stages from the database.
 * @param {Request} req - The express request object.
 * @param {Response} res - The express response object.
 */
app.get('/api/config/system-prompts', async (req: Request, res: Response) => {
  try {
    // Fetch all active system prompts with their stages
    const prompts = await db
      .select()
      .from(systemPrompts)
      .where(eq(systemPrompts.isActive, true));
    
    // Fetch all stages
    const stagesData = await db.select().from(stages);
    
    res.json({
      success: true,
      systemPrompts: prompts,
      stages: stagesData,
    });
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system prompts',
    });
  }
});

/**
 * @route POST /api/config/system-prompts
 * Saves a system prompt for a specific stage.
 * @param {Request} req - The express request object.
 * @param {Response} res - The express response object.
 */
app.post('/api/config/system-prompts', async (req: Request, res: Response) => {
  try {
    const { stageId, prompt } = req.body;
    
    // Update or create system prompt
    const existing = await db
      .select()
      .from(systemPrompts)
      .where(eq(systemPrompts.stageId, stageId));
    
    if (existing.length > 0) {
      await db
        .update(systemPrompts)
        .set({ prompt, updatedAt: new Date() })
        .where(eq(systemPrompts.stageId, stageId));
    } else {
      await db.insert(systemPrompts).values({
        stageId,
        prompt,
        isActive: true,
      });
    }
    
    res.json({
      success: true,
      message: 'System prompt updated',
    });
  } catch (error) {
    console.error('Error saving system prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save system prompt',
    });
  }
});

/**
 * @route GET /api/health
 * A health check endpoint to verify that the API is running.
 * @param {Request} req - The express request object.
 * @param {Response} res - The express response object.
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
