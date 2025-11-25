import WebSocket from 'ws';
import { Server } from 'http';
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

export const setupWebSocket = (server: Server) => {
  const wss = new WebSocket.Server({ server, path: '/stream' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    let geminiWs: WebSocket | null = null;

    // We need to manage the connection to Gemini here.
    // However, the GoogleGenAI SDK usually handles the connection internally.
    // We might need to use the low-level API or the SDK if it supports server-side relay.
    // The previous frontend code used `client.live.connect()`.

    // For server-side, we can use the same SDK if it supports Node environment (it does).

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY as string });

    // Note: The SDK's `connect` method creates a session. We need to relay messages.
    // But `client.live.connect` returns a session object, it doesn't expose the raw WS easily for pipe-through.
    // We have to implement the message handling manually to relay.

    let session: any = null;

    // To properly implement the proxy, we ideally want to establish the connection
    // when the client sends a "start" message with config.

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'start') {
           // Initialize Gemini Session
           // We can fetch system prompt from DB here based on `data.config`

           session = await client.live.connect({
             model: 'gemini-2.5-flash-native-audio-preview-09-2025',
             config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: data.systemInstruction, // passed from client
                tools: [{ functionDeclarations: [setStageTool, completeOnboardingTool, completeWithExpertTool] }],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
             },
             callbacks: {
                onopen: () => ws.send(JSON.stringify({ type: 'open' })),
                onmessage: (msg: any) => {
                    // Forward raw message or simplified message to client
                    // To save bandwidth, maybe we forward exactly what frontend expects
                    ws.send(JSON.stringify({ type: 'gemini_msg', message: msg }));
                },
                onclose: () => ws.send(JSON.stringify({ type: 'close' })),
                onerror: (err: any) => ws.send(JSON.stringify({ type: 'error', error: err }))
             }
           });

        } else if (data.type === 'input_audio') {
           // data.data is base64 pcm
           if (session) {
             session.sendRealtimeInput({
                media: {
                    mimeType: 'audio/pcm;rate=16000', // Ensure this matches client
                    data: data.data
                }
             });
           }
        } else if (data.type === 'tool_response') {
           if (session) {
             session.sendToolResponse(data.response);
           }
        }

      } catch (err) {
        console.error("Error processing message:", err);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      if (session) session.close();
    });
  });
};
