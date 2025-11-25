
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';

export class GeminiLiveService {
  private client: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private stream: MediaStream | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private audioBufferQueue: AudioBuffer[] = [];
  private isPlayingAudio = false;
  private isConnected = false;
  private isDisconnecting = false;
  private isMuted = false;
  private isConnecting = false;

  // Noise filtering regex pattern to clean transcripts
  private noisePattern = /(<noise>|<silence>|\[silence\]|\(uncaptioned\)|<blank>|^[\s]*$)/gi;
  private minTranscriptLength = 2; // Ignore transcripts shorter than this

  // In production, you might pass a backend URL here for proxying
  constructor(apiKey: string, private backendUrl?: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  // Filter out noise tags and silence markers from transcripts
  private cleanTranscript(text: string): string {
    if (!text) return '';
    // Remove noise tags and markers
    let cleaned = text.replace(this.noisePattern, '').trim();
    // If the result is too short (likely just noise), return empty string
    if (cleaned.length < this.minTranscriptLength) {
      return '';
    }
    return cleaned;
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  async connect(
    systemInstruction: string,
    onStageChange: (stage: number) => void,
    onComplete: (data?: any) => void,
    onAudioData: (amplitude: number) => void,
    onTranscript: (text: string, sender: 'user' | 'agent') => void,
    onError?: (error: Error) => void
  ) {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      return;
    }
    this.isConnecting = true;

    await this.disconnect();
    
    this.isConnected = true;
    this.isDisconnecting = false;

    // Reset Client for fresh state
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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

    try {
      try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          this.audioContext = new AudioContextClass(); 
      } catch (e) {
          throw new Error("Could not initialize AudioContext. Please check your browser settings.");
      }

      if (this.audioContext) {
        this.outputNode = this.audioContext.createGain();
        this.outputNode.connect(this.audioContext.destination);

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume().catch(e => console.warn("AudioContext resume failed", e));
        }
      }

      const streamPromise = navigator.mediaDevices.getUserMedia({ 
          audio: { 
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
          } 
      });

      // NOTE: In Phase 1 (Server Dev), this direct connection will be replaced
      // by a WebSocket connection to your own backend server.
      this.sessionPromise = this.client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [setStageTool, completeOnboardingTool, completeWithExpertTool] }],
          // Updated Config: Flattened generationConfig and removed unsupported penalties
          temperature: 0.5, 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, 
          },
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => console.log("Gemini Live Connected"),
          onmessage: async (msg: LiveServerMessage) => {
            if (!this.isConnected || this.isDisconnecting) return;
            this.handleMessage(msg, onStageChange, onComplete, onAudioData, onTranscript);
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            if (this.isConnected && !this.isDisconnecting) this.disconnect();
          },
          onerror: (err) => {
            console.warn("Gemini Live Error:", err);
            if (this.isConnected && !this.isDisconnecting) {
                if (onError) onError(new Error(err?.message || "Connection Error"));
                this.disconnect();
            }
          },
        },
      });

      const [stream, _] = await Promise.all([streamPromise, this.sessionPromise]);
      this.stream = stream;

      if (!this.isConnected || this.isDisconnecting) {
        await this.disconnect();
        return;
      }
      
      await this.startRecording(this.stream);

    } catch (err) {
      console.error("Connection failed", err);
      await this.disconnect();
      if (onError) onError(err as Error);
    } finally {
      this.isConnecting = false;
    }
  }

  private async startRecording(stream: MediaStream) {
    if (!this.audioContext || !this.sessionPromise || !this.isConnected || this.isDisconnecting) return;
    
    try {
      if (!this.isConnected || this.isDisconnecting || !this.audioContext) {
          stream.getTracks().forEach(t => t.stop());
          return;
      }

      stream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });

      this.inputSource = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isConnected || this.isDisconnecting || this.isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = this.floatTo16BitPCM(inputData);
        const base64Data = this.arrayBufferToBase64(pcmData);
        
        this.sessionPromise?.then((session) => {
          if (!this.isConnected || this.isDisconnecting) return;
          try {
            session.sendRealtimeInput({
              media: {
                mimeType: `audio/pcm;rate=${this.audioContext?.sampleRate || 16000}`, 
                data: base64Data
              }
            });
          } catch(e) {}
        }).catch(() => {});
      };

      this.inputSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (err) {
      console.error("Error setting up audio processing:", err);
      await this.disconnect();
      throw err;
    }
  }

  private async handleMessage(
    message: LiveServerMessage, 
    onStageChange: (stage: number) => void,
    onComplete: (data?: any) => void,
    onAudioData: (amp: number) => void,
    onTranscript: (text: string, sender: 'user' | 'agent') => void
  ) {
    if (!this.isConnected || this.isDisconnecting) return;

    if (message.serverContent?.interrupted) {
        console.log("Interruption detected - clearing audio queue");
        this.clearAudioQueue();
        return; 
    }

    if (message.serverContent?.inputTranscription?.text) {
        const cleanedUserText = this.cleanTranscript(message.serverContent.inputTranscription.text);
        if (cleanedUserText) {
            onTranscript(cleanedUserText, 'user');
        }
    }
    if (message.serverContent?.outputTranscription?.text) {
        const cleanedAgentText = this.cleanTranscript(message.serverContent.outputTranscription.text);
        if (cleanedAgentText) {
            onTranscript(cleanedAgentText, 'agent');
        }
    }

    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.audioContext) {
      try {
        const audioBuffer = await this.decodeAudio(audioData, this.audioContext);
        this.playAudio(audioBuffer, onAudioData);
      } catch (e) {
        console.error("Audio decode error", e);
      }
    }

    if (message.toolCall) {
      for (const call of message.toolCall.functionCalls) {
        if (call.name === 'setStage') {
            const stage = typeof call.args === 'object' ? call.args.stageNumber : call.args;
            const num = Number(stage);
            if(!isNaN(num)) onStageChange(num);
        }

        if (call.name === 'completeOnboarding') {
          onComplete({ type: 'kyc_complete' });
        }

        if (call.name === 'completeWithExpert') {
          onComplete({ type: 'expert_handover', method: call.args.paymentMethod });
        }

        this.sessionPromise?.then((session) => {
          if (!this.isConnected || this.isDisconnecting) return;
          session.sendToolResponse({
            functionResponses: {
              id: call.id,
              name: call.name,
              response: { result: 'OK' }
            }
          });
        }).catch(() => {});
      }
    }
  }

  private async decodeAudio(base64: string, ctx: AudioContext): Promise<AudioBuffer> {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }
    const buffer = ctx.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);
    return buffer;
  }

  private playAudio(buffer: AudioBuffer, onAudioData: (amp: number) => void) {
    if (!this.audioContext || this.audioContext.state === 'closed' || !this.outputNode) return;
    if (this.isDisconnecting) return;

    try {
      // Add buffer to queue
      this.audioBufferQueue.push(buffer);
      
      // If no audio is currently playing, start playing the queue
      if (!this.isPlayingAudio) {
        this.playNextAudio(onAudioData);
      }
    } catch (e) {
      console.error("Error queuing audio:", e);
    }
  }

  private playNextAudio(onAudioData: (amp: number) => void) {
    if (!this.audioBufferQueue.length || this.isDisconnecting) {
      this.isPlayingAudio = false;
      onAudioData(0);
      return;
    }

    this.isPlayingAudio = true;
    const buffer = this.audioBufferQueue.shift();

    if (!buffer || !this.audioContext || !this.outputNode) {
      this.playNextAudio(onAudioData);
      return;
    }

    try {
      // Stop any currently playing audio
      if (this.currentAudioSource) {
        try {
          this.currentAudioSource.stop();
        } catch (e) {}
        this.currentAudioSource = null;
      }

      // Create new source and play
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputNode);
      
      this.currentAudioSource = source;
      source.start(0);

      // When this audio finishes, play the next one
      source.onended = () => {
        if (this.currentAudioSource === source) {
          this.currentAudioSource = null;
        }
        // Continue with next audio in queue
        this.playNextAudio(onAudioData);
      };

      // Visualizer amplitude animation while playing
      let isPlaying = true;
      const animateAmplitude = () => {
        if (isPlaying && this.isConnected && !this.isDisconnecting) {
          onAudioData(Math.random() * 0.5 + 0.3);
          requestAnimationFrame(animateAmplitude);
        }
      };
      animateAmplitude();

      // Stop animation when source ends
      const originalOnended = source.onended;
      source.onended = () => {
        isPlaying = false;
        onAudioData(0);
        if (originalOnended) originalOnended.call(source);
      };
    } catch (e) {
      console.error("Error playing audio:", e);
      this.playNextAudio(onAudioData);
    }
  }
  
  private clearAudioQueue() {
    // Stop current audio immediately
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch (e) {}
      this.currentAudioSource = null;
    }
    // Clear the buffer queue
    this.audioBufferQueue = [];
    this.isPlayingAudio = false;
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async disconnect() {
    if (this.isDisconnecting) return;
    this.isDisconnecting = true;
    this.isConnected = false;

    if (this.stream) {
      try { this.stream.getTracks().forEach(track => track.stop()); } catch (e) {}
      this.stream = null;
    }
    if (this.processor) {
        try { this.processor.disconnect(); } catch (e) {}
        this.processor = null;
    }
    if (this.inputSource) {
        try { this.inputSource.disconnect(); } catch (e) {}
        this.inputSource = null;
    }
    if (this.sessionPromise) {
        const currentSession = this.sessionPromise;
        this.sessionPromise = null;
        try { (await currentSession).close(); } catch(e) {}
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
        try { await this.audioContext.close(); } catch (e) {}
    }
    this.audioContext = null;
    this.clearAudioQueue();
    this.isDisconnecting = false;
  }
}
