import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../../shared/lib/api';
import { authStorage } from './auth';

interface User {
  id: number;
  email: string;
  name?: string;
  personalNumber?: string;
  isAdmin: boolean;
  needsProfileCompletion: boolean;
  approvalStatus?: string;
  departmentId?: number;
  roleId?: number;
  isCommander?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
      authStorage.removeToken();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (authStorage.isAuthenticated()) {
        await refreshUser();
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    authStorage.setToken(token);
    setUser(userData);
  };

  const logout = () => {
    authStorage.removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
