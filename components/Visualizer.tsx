
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
        // Adjusted physics for cleaner motion
        // Attack (opening) should be fast but not instant (0.3)
        // Decay (closing) should be natural but responsive (0.15)
        const speed = diff > 0 ? 0.3 : 0.15; 
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

  // Scale logic: Base 1, max + 10% (Subtle overall pulse)
  const scale = 1 + Math.min(smoothAmp * 0.15, 0.15);

  // Dynamic Mouth Dimensions
  // Strategy: Vertical expansion (Jaw drop) with minimal horizontal expansion.
  // This mimics real speech better than a uniformly scaling circle and prevents the "unorganised" look.
  
  const baseWidth = 18;
  const baseHeight = 6; 
  
  // Max dimensions (Height grows significantly, width grows slightly)
  const maxHeight = 32; 
  const maxWidth = 22; 
  
  // Current dimensions based on smoothed amplitude
  // Using a power curve to make small sounds visible but keeping max size constrained
  const effectiveAmp = Math.pow(smoothAmp, 0.8);
  const currentHeight = baseHeight + (effectiveAmp * (maxHeight - baseHeight));
  const currentWidth = baseWidth + (effectiveAmp * (maxWidth - baseWidth));
  const borderRadius = Math.min(currentWidth, currentHeight) / 2;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Container to center the orb and handle Voice Reactivity (Scaling) */}
      <div 
        className="relative w-48 h-48 sm:w-64 sm:h-64 transition-transform duration-75 ease-out will-change-transform"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Wrapper for Floating Animation */}
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
            */}
            <div 
              className="absolute inset-0 flex items-center justify-center gap-8 z-10 pt-4"
              style={{ transform: `translate(${mouseX}px, ${mouseY}px)` }}
            >
                {/* Left Eye */}
                <div 
                    className="w-3 h-3 bg-black rounded-full transition-transform duration-200"
                    style={{ transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)' }}
                ></div>
                {/* Right Eye */}
                <div 
                    className="w-3 h-3 bg-black rounded-full transition-transform duration-200"
                    style={{ transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)' }}
                ></div>
            </div>

            {/* 
            4. Dynamic Mouth 
            Smoother "Vertical Oval" design that mimics jaw drop.
            CSS transitions are removed to allow the JS loop to drive animation strictly.
            */}
            <div 
                className="absolute left-1/2 -translate-x-1/2 bg-black/85"
                style={{
                    top: '60%', 
                    width: `${currentWidth}px`,
                    height: `${currentHeight}px`,
                    borderRadius: `${borderRadius}px`,
                    transform: `translate(${mouseX * 0.5}px, calc(-50% + ${mouseY * 0.5}px))`
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
