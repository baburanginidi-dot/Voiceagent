// Centralized API utility for consistent backend URL handling
export const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // Development: localhost
  if (hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  
  // Replit dev: dev domain with port 3001
  if (hostname.includes('replit.dev') || hostname.includes('kirk.replit.dev')) {
    return `${protocol}//${hostname}:3001`;
  }
  
  // Production: published domain (no port needed, backend serves frontend)
  if (hostname.includes('replit.app')) {
    return `${protocol}//${hostname}`;
  }
  
  // Fallback
  return '';
};
