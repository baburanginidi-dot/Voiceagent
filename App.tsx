
import React, { useState, useEffect } from 'react';
import { Authentication } from './components/Authentication';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { ConfigProvider } from './context/ConfigContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { UserProfile } from './types';

/**
 * The main application component.
 * It handles routing between the authentication, dashboard, and admin panels.
 *
 * @returns {JSX.Element} The rendered App component.
 */
const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<string>(window.location.hash.slice(1) || 'home');

  // Listen to hash changes for navigation
  useEffect(() => {
    /**
     * Handles the hash change event for navigation.
     */
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home';
      setCurrentRoute(hash);
      
      // Auto-navigate to admin page if hash is 'admin'
      if (hash === 'admin') {
        setIsAdmin(true);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Handle initial load with #admin
    if (window.location.hash === '#admin') {
      setIsAdmin(true);
      setCurrentRoute('admin');
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  /**
   * Handles user login.
   * @param {UserProfile} profile - The user's profile.
   */
  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
  };

  /**
   * Handles user logout.
   */
  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    window.location.hash = '#home';
  };

  /**
   * Handles admin login.
   */
  const handleAdminLogin = () => {
    setIsAdmin(true);
    window.location.hash = '#admin';
  };

  /**
   * Handles exiting the admin panel.
   */
  const handleAdminExit = () => {
    setIsAdmin(false);
    window.location.hash = '#home';
  };

  return (
    <ToastProvider>
      <ConfigProvider>
        <div className="antialiased">
          {isAdmin ? (
            <AdminPanel onExit={handleAdminExit} />
          ) : !user ? (
            <Authentication onLogin={handleLogin} onAdminLogin={handleAdminLogin} />
          ) : (
            <Dashboard user={user} onLogout={handleLogout} />
          )}
        </div>
        <ToastContainer />
      </ConfigProvider>
    </ToastProvider>
  );
};

export default App;
