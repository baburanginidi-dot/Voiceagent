import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SystemConfig, Stage } from '../types';
import { getSystemInstruction, STAGES } from '../constants';
import { getApiBaseUrl } from '../services/api';

interface ConfigContextType {
  stages: Stage[];
  systemPrompt: string;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stages, setStages] = useState<Stage[]>(STAGES);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refreshConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const backendUrl = getApiBaseUrl();
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
