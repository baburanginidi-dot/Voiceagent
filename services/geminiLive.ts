import { LiveServerMessage } from '@google/genai';

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private audioQueue: AudioBufferSourceNode[] = [];
  private isConnected = false;
  private isDisconnecting = false;
  private isMuted = false;

  constructor(apiKey: string) {
    // API Key is now handled by the backend
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
    await this.disconnect();
    
    this.isConnected = true;
    this.isDisconnecting = false;

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

      // Start Microphone
      const stream = await navigator.mediaDevices.getUserMedia({
          audio: { 
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
          } 
      });
      this.stream = stream;

      // Connect to Backend WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // In development, if we are on port 3000/5173, backend is on 4000.
      // But in Replit/Prod, it's likely the same host or proxied.
      // We'll use the relative path '/stream' if possible, or fallback to the same host.
      // However, since we used a proxy in vite.config.ts for /api, we can try to use the same host for WS if the proxy supports WS upgrade.
      // But Vite proxy for WS needs `ws: true`.

      // Let's assume standard deployment where backend serves frontend or they are on same domain.
      // For local dev where ports differ (3000 vs 4000), we need to be explicit or use proxy.
      
      // If we are on localhost, we might be on 3001 (vite) and backend on 4000.
      const isLocal = host.includes('localhost');
      const wsUrl = isLocal
          ? `ws://localhost:4000/stream`
          : `${protocol}//${host}/stream`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket Connected");
        // Send initial start message
        this.ws?.send(JSON.stringify({
            type: 'start',
            systemInstruction
        }));
      };

      this.ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'gemini_msg') {
             this.handleMessage(data.message, onStageChange, onComplete, onAudioData, onTranscript);
        } else if (data.type === 'close') {
            this.disconnect();
        } else if (data.type === 'error') {
            if (onError) onError(new Error(data.error?.message || "Server Error"));
        }
      };

      this.ws.onerror = (err) => {
         console.error("WebSocket Error:", err);
         if (onError) onError(new Error("Connection Failed"));
      };

      this.ws.onclose = () => {
         console.log("WebSocket Closed");
         if (this.isConnected) this.disconnect();
      };

      await this.startRecording(this.stream);

    } catch (err) {
      console.error("Connection failed", err);
      await this.disconnect();
      if (onError) onError(err as Error);
    }
  }

  private async startRecording(stream: MediaStream) {
    if (!this.audioContext || !this.ws || !this.isConnected || this.isDisconnecting) return;
    
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
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
             this.ws.send(JSON.stringify({
                 type: 'input_audio',
                 data: base64Data
             }));
        }
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
        onTranscript(message.serverContent.inputTranscription.text, 'user');
    }
    if (message.serverContent?.outputTranscription?.text) {
        onTranscript(message.serverContent.outputTranscription.text, 'agent');
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
        console.log("Tool Call:", call.name, call.args);
        
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

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'tool_response',
                response: {
                    functionResponses: {
                        id: call.id,
                        name: call.name,
                        response: { result: 'OK' }
                    }
                }
            }));
        }
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

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputNode);

      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
          this.nextStartTime = currentTime;
      }
      const startTime = this.nextStartTime;
      
      source.start(startTime);
      this.nextStartTime = startTime + buffer.duration;
      this.audioQueue.push(source);

      source.onended = () => {
        const index = this.audioQueue.indexOf(source);
        if (index > -1) this.audioQueue.splice(index, 1);
        if (this.audioQueue.length === 0) {
          onAudioData(0); 
        }
      };

      const checkAmplitude = () => {
          if (!this.isConnected || this.isDisconnecting) return; 
          
          if(this.audioQueue.includes(source)) {
              onAudioData(Math.random() * 0.5 + 0.3);
              requestAnimationFrame(checkAmplitude);
          }
      }
      setTimeout(checkAmplitude, Math.max(0, (startTime - currentTime) * 1000));
    } catch (e) {
      console.warn("playAudio failed", e);
    }
  }
  
  private clearAudioQueue() {
    this.audioQueue.forEach(src => {
        try { src.stop(); } catch(e){}
    });
    this.audioQueue = [];
    if (this.audioContext && this.audioContext.state === 'running') {
        this.nextStartTime = this.audioContext.currentTime;
    }
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
      try {
        this.stream.getTracks().forEach(track => track.stop());
      } catch (e) { console.warn("Stream stop error", e); }
      this.stream = null;
    }
    
    if (this.processor) {
        try {
            this.processor.disconnect();
            this.processor.onaudioprocess = null;
        } catch (e) { console.warn("Processor disconnect error", e); }
        this.processor = null;
    }
    if (this.inputSource) {
        try { this.inputSource.disconnect(); } catch (e) {}
        this.inputSource = null;
    }
    
    if (this.ws) {
        this.ws.close();
        this.ws = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
        try { await this.audioContext.close(); } catch (e) { 
        }
    }
    this.audioContext = null;

    this.clearAudioQueue();
    this.isDisconnecting = false;
  }
}
