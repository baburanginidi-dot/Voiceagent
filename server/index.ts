// Entry point for the backend API server
import express from 'express';
import { storage } from './storage';
import { systemPrompts, stages } from '../shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';
import type { InsertUser } from '../shared/schema';

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

// Save a session with transcripts
app.post('/api/analytics/session', async (req, res) => {
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

// Get all logs (call records)
app.get('/api/analytics/logs', async (req, res) => {
  try {
    const logs = await storage.getUserTranscripts(0, 1000);
    
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

// Get analytics data
app.get('/api/analytics/analytics', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalCalls: 0,
        avgDuration: '0m 0s',
        conversionRate: 0,
        dropOffByStage: [0, 0, 0, 0, 0, 0],
      },
    });
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

// Get system prompts and stages
app.get('/api/config/system-prompts', async (req, res) => {
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

// Save system prompt for a stage
app.post('/api/config/system-prompts', async (req, res) => {
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
