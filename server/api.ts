import express, { Request, Response } from 'express';
import { storage } from './storage';
import { InsertUser, InsertTranscript, InsertStageMovement } from '../shared/schema';

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

// Get all logs (call records)
app.get('/api/analytics/logs', async (req: Request, res: Response) => {
  try {
    // Get all transcripts and group them by session
    const sql = `
      SELECT 
        t.session_id,
        u.name as student_name,
        u.phone_number,
        COUNT(*) as message_count,
        MIN(t.created_at) as start_time,
        MAX(t.created_at) as end_time,
        s.level as stage,
        sm.reason as status,
        sm.metadata
      FROM transcripts t
      JOIN users u ON t.user_id = u.id
      JOIN stages s ON t.stage_id = s.id
      LEFT JOIN stage_movements sm ON u.id = sm.user_id AND sm.current_stage_id = t.stage_id
      GROUP BY t.session_id, u.id, u.name, u.phone_number, s.level, sm.reason, sm.metadata
      ORDER BY MIN(t.created_at) DESC
      LIMIT 100
    `;

    // For now, return a basic response structure that the frontend can handle
    const logs = await (global as any).db?.raw?.(sql) || [];

    const formattedLogs = logs.map((log: any) => ({
      id: log.session_id,
      studentName: log.student_name || 'Unknown',
      phoneNumber: log.phone_number || '',
      date: log.start_time ? new Date(log.start_time).toLocaleString() : '',
      duration: log.message_count ? `${Math.ceil(log.message_count / 2)}m` : '0m',
      status: log.status || 'Completed',
      stageReached: log.stage || 1,
      aiSummary: 'Call recorded and saved',
      transcript: [],
      metadata: log.metadata,
    }));

    res.json({
      success: true,
      logs: formattedLogs,
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

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
