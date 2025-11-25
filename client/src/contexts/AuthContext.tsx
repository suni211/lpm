import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import type { User, Team, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  team: Team | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const response = await api.get<AuthResponse>('/auth/me');
      setUser(response.data.user);
      setTeam(response.data.team);
    } catch (error) {
      setUser(null);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      setTeam(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, team, loading, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
