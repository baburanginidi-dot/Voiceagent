
import React, { useState, useEffect } from 'react';
import { Authentication } from './components/Authentication';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<string>(window.location.hash.slice(1) || 'home');

  // Listen to hash changes for navigation
  useEffect(() => {
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

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    window.location.hash = '#home';
  };

  const handleAdminLogin = () => {
    setIsAdmin(true);
    window.location.hash = '#admin';
  };

  const handleAdminExit = () => {
    setIsAdmin(false);
    window.location.hash = '#home';
  };

  if (isAdmin) {
    return <AdminPanel onExit={handleAdminExit} />;
  }

  return (
    <div className="antialiased">
      {!user ? (
        <Authentication onLogin={handleLogin} onAdminLogin={handleAdminLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
