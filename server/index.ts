// Entry point for the backend API server
import express from 'express';
import { storage } from './storage';
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
    // For now, return empty logs - will implement DB query later
    res.json({
      success: true,
      logs: [],
      total: 0,
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
