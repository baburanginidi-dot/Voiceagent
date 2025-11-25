import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SystemConfig, Stage } from '../types';
import { getSystemInstruction, STAGES } from '../constants';

interface ConfigContextType {
  stages: Stage[];
  systemPrompt: string;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// Get backend URL from environment or construct from current location
const getBackendUrl = () => {
  // Try to use the configured backend URL from environment
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  // Fallback: use current hostname
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    return `${protocol}//${host}:3001`;
  }
  return 'http://localhost:3001';
};

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stages, setStages] = useState<Stage[]>(STAGES);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refreshConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/config/system-prompts`);
      const data = await response.json();
      
      if (data.success && data.stages) {
        setStages(data.stages);
        // Build system prompt from fetched stages
        const prompt = getSystemInstruction('Student', data.stages);
        setSystemPrompt(prompt);
      }
    } catch (error) {
      console.error('Failed to refresh config from API, using defaults:', error);
      // Fall back to defaults
      setStages(STAGES);
      setSystemPrompt(getSystemInstruction('Student', STAGES));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <ConfigContext.Provider value={{ stages, systemPrompt, isLoading, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};
