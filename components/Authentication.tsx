
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Visualizer } from './Visualizer';

interface Props {
  onLogin: (profile: UserProfile) => void;
  onAdminLogin?: () => void;
}

export const Authentication: React.FC<Props> = ({ onLogin, onAdminLogin }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [phoneError, setPhoneError] = useState('');

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    setMousePos({
      x: (clientX - innerWidth / 2) / 25, 
      y: (clientY - innerHeight / 2) / 25
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setPhone(value);
    if (value && value.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      return;
    }
    if (!phone || phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      return;
    }
    setPhoneError('');
    onLogin({ name, phone });
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden font-['Inter']"
    >
      
      {/* Decorative Pastel Background Blobs (Subtle) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#C9F0FF] rounded-full blur-[80px]"></div>
        <div className="absolute top-40 -right-20 w-80 h-80 bg-[#E7D9FF] rounded-full blur-[80px]"></div>
      </div>


      <div className="relative z-10 w-full max-w-[390px] flex flex-col items-center">
        
        {/* Mascot Area */}
        <div className="mb-10 w-64 h-64">
           <Visualizer isActive={false} amplitude={0} mouseX={mousePos.x} mouseY={mousePos.y} />
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold text-black tracking-tight mb-3">Hello!</h1>
          <p className="text-[#4F4F4F] text-[15px] leading-relaxed max-w-[80%] mx-auto">
            Welcome to NxtWave. I’m Maya, here to help you get access to your learning portal.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-6 bg-[#F9F9FB] rounded-[24px] text-black placeholder-[#8E8E93] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#E6ECFF] transition-all"
              placeholder="Your Name"
              required
            />
            
            <div>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                className={`w-full h-12 px-6 bg-[#F9F9FB] rounded-[24px] text-black placeholder-[#8E8E93] text-[15px] focus:outline-none focus:ring-2 transition-all ${
                  phoneError ? 'focus:ring-red-300 border border-red-300' : 'focus:ring-[#E6ECFF]'
                }`}
                placeholder="Phone Number (10 digits)"
                inputMode="numeric"
                maxLength={10}
                required
              />
              {phoneError && (
                <p className="text-red-500 text-xs mt-2 ml-2">{phoneError}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={phoneError.length > 0 || !name || phone.length !== 10}
            className="w-full h-12 bg-black text-white font-semibold rounded-[24px] text-[15px] mt-6 hover:scale-[0.98] disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
          >
            Start Session
          </button>
        </form>
      </div>
    </div>
  );
};
