import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, TranscriptItem } from '../types';
import { StageList } from './StageList';
import { Visualizer } from './Visualizer';
import { NoiseWarning } from './NoiseWarning';
import { GeminiLiveService } from '../services/geminiLive';
import { getSystemInstruction } from '../constants';
import { useConfig } from '../context/ConfigContext';
import AnalyticsService, { SessionData } from '../services/analyticsService';

/**
 * @interface Props
 * @property {UserProfile} user - The profile of the logged-in user.
 * @property {() => void} onLogout - Callback function to handle user logout.
 */
interface Props {
  user: UserProfile;
  onLogout: () => void;
}

/**
 * @interface CompletionPopupState
 * @property {boolean} show - Whether the completion popup is visible.
 * @property {string} title - The title of the popup.
 * @property {string} message - The message content of the popup.
 */
interface CompletionPopupState {
    show: boolean;
    title: string;
    message: string;
}

/**
 * Dashboard component is the main interface for the user's interaction with the AI voice agent.
 * It manages the connection to the Gemini Live service, displays transcripts, tracks progress through stages,
 * and handles user controls like muting and ending the call.
 *
 * @param {Props} props - The props for the Dashboard component.
 * @returns {JSX.Element} The rendered Dashboard component.
 */
export const Dashboard: React.FC<Props> = ({ user, onLogout }) => {
  const { stages, systemPrompt, refreshConfig } = useConfig();
  const [currentStage, setCurrentStage] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [completionPopup, setCompletionPopup] = useState<CompletionPopupState>({ show: false, title: '', message: '' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);
  const [endReason, setEndReason] = useState<'logout' | 'payment_selected' | 'kyc_complete' | 'error' | 'disconnect'>('logout');
  
  const liveService = useRef<GeminiLiveService | null>(null);
  const mounted = useRef(true);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const analyticsService = useRef<AnalyticsService | null>(null);
  
  // Noise detection state
  const [showNoiseWarning, setShowNoiseWarning] = useState(false);
  const noiseThreshold = 0.15; // RMS threshold for "high noise"
  const noisePersistMs = 2500; // How long noise must persist to trigger warning
  const rateLimitMs = 30000; // Rate limit: only show warning every 30 seconds
  const highNoiseStartRef = useRef<number | null>(null);
  const lastNoiseWarningRef = useRef<number>(0);
  const noiseWarningDismissedRef = useRef<boolean>(false);
  
  /**
   * Handles the noise level from the microphone input to detect and warn the user about high background noise.
   * @param {number} rmsLevel - The root mean square level of the audio.
   */
  const handleNoiseLevel = useCallback((rmsLevel: number) => {
    if (!mounted.current) return;
    
    const now = Date.now();
    
    // If noise warning was dismissed manually, don't show again this session
    if (noiseWarningDismissedRef.current) return;
    
    // Rate limit: don't show if we showed one recently
    if (now - lastNoiseWarningRef.current < rateLimitMs && !showNoiseWarning) return;
    
    if (rmsLevel > noiseThreshold) {
      // High noise detected
      if (!highNoiseStartRef.current) {
        highNoiseStartRef.current = now;
      } else if (now - highNoiseStartRef.current >= noisePersistMs) {
        // Noise has persisted long enough, show warning
        if (!showNoiseWarning) {
          setShowNoiseWarning(true);
          lastNoiseWarningRef.current = now;
        }
      }
    } else {
      // Noise is normal, reset timer
      highNoiseStartRef.current = null;
      // Auto-dismiss if noise returns to normal
      if (showNoiseWarning) {
        setTimeout(() => {
          if (mounted.current) setShowNoiseWarning(false);
        }, 2000);
      }
    }
  }, [showNoiseWarning]);
  
  /**
   * Dismisses the noise warning manually.
   */
  const dismissNoiseWarning = useCallback(() => {
    setShowNoiseWarning(false);
    noiseWarningDismissedRef.current = true;
  }, []);

  // Auto-scroll transcripts
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcripts]);

  /**
   * Initializes the Gemini Live service and connects to the backend.
   */
  const initService = async () => {
      // Prevent double initialization (React Strict Mode safety)
      if (isInitializingRef.current) {
        return;
      }
      isInitializingRef.current = true;

      if (!process.env.API_KEY) {
        setErrorMsg("API Key missing");
        isInitializingRef.current = false;
        return;
      }

      // Fetch latest config from admin settings (includes system prompt from database)
      await refreshConfig();
      
      if (liveService.current) {
          await liveService.current.disconnect();
          liveService.current = null;
      }

      const service = new GeminiLiveService(process.env.API_KEY);
      // Sync initial mute state
      service.setMute(isMuted);
      liveService.current = service;

      try {
        setErrorMsg(null);
        setAmplitude(0.1); 
        
        // Use system prompt from database (fetched by refreshConfig)
        // If not available, fall back to generating from stages
        let systemInstruction = systemPrompt || getSystemInstruction(user.name, stages);

        // Personalize the system instruction with user's name
        systemInstruction = systemInstruction.replace(/{{studentName}}/g, user.name);
        
        await service.connect(
          systemInstruction,
          (stage) => {
            if (!mounted.current) return;
            setCurrentStage(stage);
          },
          (data) => {
            if (!mounted.current) return;
            if (data?.type === 'expert_handover') {
                // Capture payment method for analytics
                setPaymentMethod(data.method);
                setEndReason('payment_selected');
                // Wait a moment for the audio to finish explaining
                setTimeout(() => {
                    if (mounted.current) {
                        handleEndCall();
                        setCompletionPopup({
                            show: true,
                            title: `Thank you, ${user.name}!`,
                            message: "We've received your payment preference. Our human expert will contact you shortly to assist you further."
                        });
                        console.log("Analytics Log:", {
                            student_name: user.name,
                            student_phone: user.phone,
                            selected_payment_option: data.method,
                            human_expert_required: true,
                            ended_by: "system_payment_selection"
                        });
                    }
                }, 7000); // 7s allow the agent to finish the "Okay {name}..." sentence
            } else if (data?.type === 'kyc_complete') {
                 setEndReason('kyc_complete');
                 if (mounted.current) {
                     handleEndCall();
                     setCompletionPopup({
                        show: true,
                        title: "Session Complete",
                        message: "KYC Portal Opening..."
                     });
                 }
            }
          },
          (amp) => {
             if (mounted.current) setAmplitude(amp);
          },
          (text, sender) => {
              if (!mounted.current) return;
              setTranscripts(prev => {
                  // Check if the last message has the same sender
                  if (prev.length > 0 && prev[prev.length - 1].sender === sender) {
                      // Append to the existing message instead of creating a new one
                      const updated = [...prev];
                      updated[updated.length - 1] = {
                          ...updated[updated.length - 1],
                          text: updated[updated.length - 1].text + text
                      };
                      return updated;
                  } else {
                      // Create a new message for speaker change
                      return [...prev, {
                          id: Date.now().toString() + Math.random(),
                          sender,
                          text,
                          timestamp: new Date()
                      }];
                  }
              });
          },
          (err) => {
              if (!mounted.current) return;
              if (err.message && !err.message.includes("Gemini Live Closed")) {
                 setErrorMsg("Network Error");
                 setIsConnected(false);
                 setAmplitude(0);
              }
          },
          handleNoiseLevel
        );
        
        if (mounted.current) {
            setIsConnected(true);
            setErrorMsg(null);
        } else {
            service.disconnect();
        }
      } catch (err) {
        if (mounted.current) {
            setErrorMsg("Connection Failed");
            setIsConnected(false);
            setAmplitude(0);
        }
      } finally {
        isInitializingRef.current = false;
      }
    };

  useEffect(() => {
    mounted.current = true;
    initService();
    return () => {
      mounted.current = false;
      if (liveService.current) {
        liveService.current.disconnect();
      }
    };
  }, []);

  /**
   * Retries the connection to the Gemini Live service.
   */
  const handleRetry = () => initService();

  /**
   * Saves the current session data to the analytics service.
   */
  const saveSessionToAnalytics = async () => {
    if (!analyticsService.current) {
      analyticsService.current = AnalyticsService.getInstance();
    }

    const duration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    const sessionData: SessionData = {
      userName: user.name,
      userPhone: user.phone,
      transcripts: transcripts.map(t => ({
        sender: t.sender,
        text: t.text
      })),
      finalStage: currentStage,
      duration,
      endReason: endReason,
      paymentMethod: paymentMethod,
    };

    try {
      await analyticsService.current.saveSession(sessionData);
      console.log('Session saved to analytics');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  /**
   * Handles ending the call, disconnecting the service and saving analytics.
   */
  const handleEndCall = async () => {
    if (liveService.current) liveService.current.disconnect();
    setIsConnected(false);
    setAmplitude(0);
    
    // Save session before logging out
    await saveSessionToAnalytics();
  };
  
  /**
   * Handles the full logout process, including ending the call and triggering the onLogout callback.
   */
  const handleFullLogout = () => {
      handleEndCall();
      setTimeout(() => onLogout(), 500); // Give session save time to complete
  }

  /**
   * Toggles the mute state of the microphone.
   */
  const toggleMute = () => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      if (liveService.current) {
          liveService.current.setMute(newMuted);
      }
  };

  /**
   * Closes the completion popup and logs the user out.
   */
  const closePopup = async () => {
      await saveSessionToAnalytics();
      setCompletionPopup({ show: false, title: '', message: '' });
      onLogout();
  };

  /**
   * Dismisses the initial instruction popup.
   */
  const dismissInstructions = () => {
      setShowInstructions(false);
  };

  return (
    <div className="min-h-screen bg-white text-black font-['Inter'] relative overflow-hidden flex flex-col">
      
      {/* Noise Warning Popup */}
      <NoiseWarning isVisible={showNoiseWarning} onDismiss={dismissNoiseWarning} />
      
      {/* Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-[#C9F0FF] rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-[#E7D9FF] rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-[390px] mx-auto pt-6 px-6 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight">Maya</span>
          <span className="text-xs text-[#4F4F4F] mt-0.5">Speaking with {user.name}</span>
        </div>
        <button onClick={handleFullLogout} className="text-sm font-semibold text-[#4F4F4F] hover:text-black transition-colors">
          Exit
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-[390px] mx-auto px-6 flex flex-col items-center justify-between py-6">
        
        {/* Orb Container */}
        <div className="w-full flex-1 min-h-[250px] flex items-center justify-center relative">
             <Visualizer isActive={isConnected} amplitude={amplitude} />
             
             {/* Status Badge */}
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-sm transition-colors duration-300 flex items-center gap-2 ${
                    isConnected ? 'bg-white/80 text-black border border-white' : 'bg-red-50 text-red-500 border border-red-100'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    {errorMsg ? 'Connection Failed' : (isConnected ? (isMuted ? 'Muted' : 'Listening...') : 'Connecting...')}
                </div>
                {errorMsg && (
                    <button onClick={handleRetry} className="block mt-2 text-xs text-center text-red-500 underline mx-auto">Retry</button>
                )}
             </div>
        </div>

        {/* KYC CTA - Only visible at Stage 6 */}
        {currentStage === 6 && (
            <div className="w-full mb-4 animate-fadeIn">
                <a 
                    href="https://accounts.ccbp.in/login?client_id=otg&call_back_url=https://learning.ccbp.in/academy-get-started&mode=otp&WINDOW_MODE=IN_APP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full bg-[#007AFF] text-white font-semibold py-3.5 px-4 rounded-[16px] shadow-[0_4px_14px_rgba(0,122,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all gap-2"
                >
                    <span>Open KYC Portal</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
        )}

        {/* Transcript / Chat Area (New Requirement) */}
        <div 
            ref={transcriptContainerRef}
            className="w-full h-32 bg-white/50 backdrop-blur-sm rounded-[20px] p-4 mb-6 overflow-y-auto border border-white/40 shadow-sm scrollbar-hide flex flex-col gap-2"
        >
            {transcripts.length === 0 ? (
                <p className="text-center text-xs text-[#8E8E93] mt-10">Conversation starting...</p>
            ) : (
                transcripts.map((t) => (
                    <div key={t.id} className={`flex w-full ${t.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-snug ${
                            t.sender === 'user' 
                            ? 'bg-black text-white rounded-br-none' 
                            : 'bg-[#F2F2F2] text-black rounded-bl-none'
                        }`}>
                            {t.text}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-center gap-6 w-full mb-8">
            {/* End Call */}
            <button 
                onClick={handleFullLogout}
                className="w-12 h-12 rounded-full bg-[#FFE5E5] text-[#FF3B30] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                title="End Call"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Mic Toggle (Central) */}
            <button 
                onClick={toggleMute}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 ${
                    isMuted ? 'bg-[#4F4F4F] text-white' : 'bg-black text-white'
                }`}
            >
                {isMuted ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                )}
            </button>
             
             {/* Info / Settings Placeholder */}
             <button className="w-12 h-12 rounded-full bg-[#F2F2F2] text-black flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
        </div>
        
        {/* Stage Tracker (Bottom) */}
        <div className="w-full">
            <h3 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest mb-3 pl-2">Current Progression</h3>
            <div className="bg-[#F9F9FB] rounded-[24px] p-4 shadow-sm h-48 overflow-y-auto scrollbar-thin">
                <StageList currentStage={currentStage} />
            </div>
        </div>

      </main>

      {/* Instruction Popup (On Mount) */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/60 backdrop-blur-xl animate-fadeIn">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-[360px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 transform transition-all scale-100 relative overflow-hidden">
                {/* Decorative background blob inside modal */}
                <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-gradient-to-br from-[#C9F0FF] to-transparent rounded-full blur-[60px] opacity-50 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-[#F5F7FF] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                         {/* Custom Headphones Icon */}
                        <svg className="w-10 h-10 text-[#4F4F4F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v3m0-3c-1.5 0-2.5.5-2.5 2m2.5-2c1.5 0 2.5.5 2.5 2" />
                        </svg>
                    </div>
                    
                    <h3 className="text-[22px] font-bold text-black mb-2 tracking-tight">Before we start</h3>
                    <p className="text-[#8E8E93] text-[14px] mb-6">For the best experience:</p>
                    
                    <div className="space-y-4 mb-8 text-left">
                        <div className="flex items-center gap-3 bg-[#F9F9FB] p-3 rounded-[16px]">
                            <span className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm text-lg">🤫</span>
                            <span className="text-[14px] text-[#4F4F4F] font-medium">Find a quiet spot</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#F9F9FB] p-3 rounded-[16px]">
                            <span className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm text-lg">🎧</span>
                            <span className="text-[14px] text-[#4F4F4F] font-medium">Use earphones</span>
                        </div>
                         <div className="flex items-center gap-3 bg-[#F9F9FB] p-3 rounded-[16px] border border-[#E6ECFF]">
                            <span className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm text-lg">👋</span>
                            <span className="text-[14px] text-black font-semibold">Say "Hello" to activate</span>
                        </div>
                    </div>

                    <button 
                        onClick={dismissInstructions}
                        className="w-full bg-black text-white font-semibold py-4 rounded-[24px] hover:scale-[0.98] transition-transform shadow-lg text-[15px]"
                    >
                        I'm Ready
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Completion Popup */}
      {completionPopup.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-[28px] p-8 w-full max-w-[340px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.2)] transform transition-all scale-100">
                <div className="w-16 h-16 bg-[#E6ECFF] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-[20px] font-bold text-black mb-3">{completionPopup.title}</h3>
                <p className="text-[#4F4F4F] text-[15px] mb-8 leading-relaxed">{completionPopup.message}</p>
                <button 
                    onClick={closePopup}
                    className="w-full bg-black text-white font-semibold py-4 rounded-[24px] hover:scale-[0.98] transition-transform shadow-lg"
                >
                    Okay
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
