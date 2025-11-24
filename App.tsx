
import React, { useState } from 'react';
import { Authentication } from './components/Authentication';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleAdminLogin = () => {
    setIsAdmin(true);
  };

  const handleAdminExit = () => {
    setIsAdmin(false);
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
