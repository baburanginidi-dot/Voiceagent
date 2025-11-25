
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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private systemInstruction: string | null = null;

  // Callbacks
  private onStageChange: ((stage: number) => void) | null = null;
  private onComplete: ((data?: any) => void) | null = null;
  private onAudioData: ((amplitude: number) => void) | null = null;
  private onTranscript: ((text: string, sender: 'user' | 'agent') => void) | null = null;
  private onError: ((error: Error) => void) | null = null;


  constructor(private backendUrl: string = 'ws://localhost:8000') {}

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
    
    this.systemInstruction = systemInstruction;
    this.onStageChange = onStageChange;
    this.onComplete = onComplete;
    this.onAudioData = onAudioData;
    this.onTranscript = onTranscript;
    this.onError = onError;

    this.isDisconnecting = false;
    this.isConnected = false;

    this.initWebSocket();
  }

  private initWebSocket() {
    if (this.isDisconnecting) return;

    this.ws = new WebSocket(this.backendUrl);

    this.ws.onopen = async () => {
      console.log("Connected to backend WebSocket.");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

      // Send initialization message
      if (this.systemInstruction) {
        this.ws?.send(JSON.stringify({
          type: 'initialization',
          systemInstruction: this.systemInstruction
        }));
      }

      try {
        await this.setupAudioPipeline();
      } catch (err) {
        console.error("Audio pipeline setup failed", err);
        if (this.onError) this.onError(err as Error);
        await this.disconnect();
      }
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!this.isConnected || this.isDisconnecting) return;
      this.handleMessage(message);
    };

    this.ws.onclose = (event) => {
      console.log("WebSocket closed.", event.code, event.reason);
      this.isConnected = false;
      if (event.code !== 1000 && !this.isDisconnecting) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (this.onError) this.onError(new Error("WebSocket connection error."));
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts - 1) * 1000;
      console.log(`Attempting to reconnect in ${delay / 1000}s...`);
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => this.initWebSocket(), delay);
    } else {
      console.error("Max reconnect attempts reached.");
      if (this.onError) this.onError(new Error("Connection lost. Please refresh the page."));
    }
  }

  private async setupAudioPipeline() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    } catch (e) {
      throw new Error("Could not initialize AudioContext.");
    }

    this.outputNode = this.audioContext.createGain();
    this.outputNode.connect(this.audioContext.destination);

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    if (!this.isConnected || this.isDisconnecting) {
        await this.disconnect();
        return;
    }

    await this.startRecording(this.stream);
  }


  private async startRecording(stream: MediaStream) {
    if (!this.audioContext || !this.isConnected || this.isDisconnecting) return;
    
    stream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });

    this.inputSource = this.audioContext.createMediaStreamSource(stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isConnected || this.isDisconnecting || this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64Data = this.arrayBufferToBase64(pcmData);

      this.ws.send(JSON.stringify({
        type: 'audio',
        payload: base64Data
      }));
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private handleMessage(message: any) {
    if (!this.onStageChange || !this.onComplete || !this.onAudioData || !this.onTranscript) return;

    if (message.serverContent?.interrupted) {
        this.clearAudioQueue();
        return;
    }

    if (message.serverContent?.inputTranscription?.text) {
        this.onTranscript(message.serverContent.inputTranscription.text, 'user');
    }
    if (message.serverContent?.outputTranscription?.text) {
        this.onTranscript(message.serverContent.outputTranscription.text, 'agent');
    }

    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.audioContext) {
      this.decodeAudio(audioData, this.audioContext)
          .then(audioBuffer => this.playAudio(audioBuffer, this.onAudioData!))
          .catch(e => console.error("Audio handling error", e));
    }

    if (message.toolCall) {
      for (const call of message.toolCall.functionCalls) {
        if (call.name === 'setStage') {
            const stage = typeof call.args === 'object' ? call.args.stageNumber : call.args;
            const num = Number(stage);
            if(!isNaN(num)) this.onStageChange(num);
        }

        if (call.name === 'completeOnboarding') {
          this.onComplete({ type: 'kyc_complete' });
        }

        if (call.name === 'completeWithExpert') {
          this.onComplete({ type: 'expert_handover', method: call.args.paymentMethod });
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'toolResponse',
                payload: {
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

  // Audio utility functions (decodeAudio, playAudio, clearAudioQueue, etc.) remain largely the same
  // ... Paste the existing private audio utility functions here ...
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
      if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;
      const startTime = this.nextStartTime;
      source.start(startTime);
      this.nextStartTime = startTime + buffer.duration;
      this.audioQueue.push(source);
      source.onended = () => {
        const index = this.audioQueue.indexOf(source);
        if (index > -1) this.audioQueue.splice(index, 1);
        if (this.audioQueue.length === 0) onAudioData(0); 
      };
      const checkAmplitude = () => {
          if (!this.isConnected || this.isDisconnecting) return; 
          if(this.audioQueue.includes(source)) {
              onAudioData(Math.random() * 0.5 + 0.3);
              requestAnimationFrame(checkAmplitude);
          }
      }
      setTimeout(checkAmplitude, Math.max(0, (startTime - currentTime) * 1000));
    } catch (e) {}
  }
  
  private clearAudioQueue() {
    this.audioQueue.forEach(src => { try { src.stop(); } catch(e){} });
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

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    if (this.ws) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000);
        }
        this.ws = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
    }
    if (this.inputSource) {
        this.inputSource.disconnect();
        this.inputSource = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
    }
    this.audioContext = null;
    this.clearAudioQueue();
    this.isDisconnecting = false;
  }
}
