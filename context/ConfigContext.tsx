import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SystemConfig, Stage } from '../types';
import { MockAdminService } from '../services/mockAdminService';

interface ConfigContextType {
  stages: Stage[];
  systemPrompt: string;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refreshConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const config = await MockAdminService.getSystemConfig() as SystemConfig;
      setStages(config.stages);
      setSystemPrompt(config.systemPrompt);
    } catch (error) {
      console.error('Failed to refresh config:', error);
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
