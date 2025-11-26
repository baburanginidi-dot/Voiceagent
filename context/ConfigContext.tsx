import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SystemConfig, Stage } from '../types';
import { getSystemInstruction, STAGES } from '../constants';

/**
 * @interface ConfigContextType
 * Defines the shape of the configuration context.
 * @property {Stage[]} stages - The list of conversation stages.
 * @property {string} systemPrompt - The main system prompt for the AI.
 * @property {boolean} isLoading - Whether the configuration is currently being loaded.
 * @property {() => Promise<void>} refreshConfig - Function to refresh the configuration from the backend.
 */
interface ConfigContextType {
  stages: Stage[];
  systemPrompt: string;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

/**
 * Determines the appropriate backend URL based on the environment.
 * It prioritizes the `BACKEND_URL` environment variable, falling back to the current hostname.
 * @returns {string} The backend URL.
 */
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

/**
 * ConfigProvider is a component that provides the system configuration to its children.
 * It fetches the configuration from the backend and makes it available through the `useConfig` hook.
 *
 * @param {{ children: ReactNode }} props - The props for the ConfigProvider component.
 * @returns {JSX.Element} The rendered ConfigProvider component.
 */
export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stages, setStages] = useState<Stage[]>(STAGES);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetches the latest configuration from the backend and updates the context state.
   * If the fetch fails, it falls back to the default configuration.
   */
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

/**
 * `useConfig` is a custom hook that allows components to access the configuration context.
 * It must be used within a `ConfigProvider`.
 *
 * @returns {ConfigContextType} The configuration context.
 * @throws {Error} If used outside of a `ConfigProvider`.
 */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};
