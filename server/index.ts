
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI, LiveClient, Modality, Type, FunctionDeclaration } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8000;

const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY as string });

// Tool Definitions (moved from frontend)
const setStageTool: FunctionDeclaration = {
  name: 'setStage',
  description: 'Move to the specific onboarding stage',
  parameters: {
    type: Type.OBJECT,
    properties: {
      stageNumber: { type: Type.NUMBER, description: 'The stage number (1-6)' },
    },
    required: ['stageNumber'],
  },
};

const completeOnboardingTool: FunctionDeclaration = {
  name: 'completeOnboarding',
  description: 'Mark the onboarding process as complete for KYC',
  parameters: {
    type: Type.OBJECT,
    properties: {
         status: { type: Type.STRING, description: 'Completion status' }
    },
  },
};

const completeWithExpertTool: FunctionDeclaration = {
  name: 'completeWithExpert',
  description: 'End call for Full Payment, Credit Card, or Personal Loan selections. Requires human expert follow-up.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      paymentMethod: { type: Type.STRING, description: 'The selected payment method (full_payment, credit_card, personal_loan)' },
    },
    required: ['paymentMethod'],
  },
};


wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  let geminiSession: LiveClient | null = null;

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'initialization') {
        geminiSession = await genAI.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: data.systemInstruction,
            tools: [{ functionDeclarations: [setStageTool, completeOnboardingTool, completeWithExpertTool] }],
            temperature: 0.5,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => console.log("Gemini Live Connected"),
            onmessage: (msg) => {
              ws.send(JSON.stringify(msg));
            },
            onclose: () => {
              console.log("Gemini Live Closed");
              ws.close();
            },
            onerror: (err) => {
              console.error("Gemini Live Error:", err);
              ws.close();
            },
          },
        });

      } catch (error) {
        console.error('Failed to connect to Gemini:', error);
        ws.close();
      }
    } else if (data.type === 'audio') {
        if (geminiSession) {
            geminiSession.sendRealtimeInput({
                media: {
                    mimeType: `audio/pcm;rate=16000`,
                    data: data.payload
                }
            });
        }
    } else if (data.type === 'toolResponse') {
        if (geminiSession) {
            geminiSession.sendToolResponse(data.payload);
        }
    } catch (error) {
        console.error("Failed to process message:", message, "Error:", error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (geminiSession) {
        geminiSession.close();
        geminiSession = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(\`Server is listening on port \${PORT}\`);
});
