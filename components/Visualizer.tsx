import React, { useEffect, useState } from 'react';

interface VisualizerProps {
  isActive: boolean;
  amplitude: number; // 0 to 1
  mouseX?: number;
  mouseY?: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, amplitude, mouseX = 0, mouseY = 0 }) => {
  const [smoothAmp, setSmoothAmp] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);

  // Smooth interpolation for amplitude
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setSmoothAmp(prev => {
        const target = isActive ? amplitude : 0;
        const diff = target - prev;
        // Tuned for speech responsiveness: Fast attack for snap, moderate decay
        const speed = diff > 0 ? 0.4 : 0.1; 
        return prev + diff * speed;
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [amplitude, isActive]);

  // Blinking logic
  useEffect(() => {
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
      const nextBlink = 3000 + Math.random() * 4000;
      setTimeout(triggerBlink, nextBlink);
    };
    const timer = setTimeout(triggerBlink, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Scale logic: Base 1, max + 20%
  const scale = 1 + Math.min(smoothAmp * 0.4, 0.4);

  // Dynamic Mouth Logic
  // Lower threshold for more sensitivity
  const isSpeaking = isActive && smoothAmp > 0.01; 

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Container to center the orb and handle Voice Reactivity (Scaling) */}
      <div 
        className="relative w-48 h-48 sm:w-64 sm:h-64 transition-transform duration-100 ease-out will-change-transform"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Wrapper for Floating Animation - affects the whole avatar */}
        <div className="w-full h-full animate-float">
            {/* 
            1. The Emotion Orb Base 
            Gradient: --primary-start (#C9F0FF) -> --primary-mid (#BFD5FF) -> --primary-end (#E7D9FF)
            */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#C9F0FF] via-[#BFD5FF] to-[#E7D9FF] blur-[20px] opacity-90"></div>
            
            {/* 
            2. The Orb Core (Solid)
            Provides the clean edge inside the blur
            */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#C9F0FF] via-[#BFD5FF] to-[#E7D9FF] shadow-inner"></div>

            {/* 
            3. Facial Features 
            Simple 6px black dots for eyes.
            */}
            <div 
              className="absolute inset-0 flex items-center justify-center gap-8 z-10 pt-4"
              style={{ transform: `translate(${mouseX}px, ${mouseY}px)` }}
            >
            {/* Left Eye */}
            <div 
                className="w-2.5 h-2.5 bg-black rounded-full transition-transform duration-200"
                style={{ transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)' }}
            ></div>
            {/* Right Eye */}
            <div 
                className="w-2.5 h-2.5 bg-black rounded-full transition-transform duration-200"
                style={{ transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)' }}
            ></div>
            </div>

            {/* 
            4. Dynamic Mouth 
            Transitions between a smile (border) and an open mouth (background)
            */}
            <div 
                className="absolute left-1/2 -translate-x-1/2 transition-all duration-75 ease-out"
                style={{
                    top: '60%',
                    // Width expands significantly when loud
                    width: isSpeaking ? `${24 + smoothAmp * 30}px` : '18px',
                    // Height opens up to form a pill shape
                    height: isSpeaking ? `${10 + smoothAmp * 35}px` : '8px',
                    // Switch from transparent to darker inner mouth for visibility
                    backgroundColor: isSpeaking ? 'rgba(0,0,0,0.6)' : 'transparent',
                    // Remove border when open, keep border when closed
                    borderBottom: isSpeaking ? 'none' : '2.5px solid rgba(0,0,0,0.6)',
                    // Pill shape when open, curve when closed
                    borderRadius: isSpeaking ? '16px' : '50%',
                    opacity: 0.9,
                    // Subtle mouth movement (less than eyes for parallax)
                    transform: `translate(${mouseX * 0.5}px, ${mouseY * 0.5}px)`
                }}
            ></div>
        </div>

      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};