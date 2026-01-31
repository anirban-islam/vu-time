import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/api';

type AuthContextType = {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: any) => Promise<void>;
  loadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@auth_token');
      const storedUser = await AsyncStorage.getItem('@auth_user');
      
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
           setUser(JSON.parse(storedUser));
        }
        setIsAuthenticated(true);
        // Optionally fetch fresh profile in background
        // fetchProfile(storedToken); 
      }
    } catch (e) {
      console.error('Failed to load auth data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
      try {
          const currentToken = token || await AsyncStorage.getItem('@auth_token');
          if (!currentToken) return;

          const res = await auth.getProfile(currentToken);
          if (res.data.success) {
              const freshUser = res.data.user;
              await updateUser(freshUser);
          }
      } catch (error) {
          console.error("Error refreshing user profile", error);
      }
  };

  const login = async (newToken: string, userData: any) => {
    try {
      await AsyncStorage.setItem('@auth_token', newToken);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Failed to save login data', e);
    }
  };

  const updateUser = async (userData: any) => {
      try {
          if (!userData) return;
          await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
          setUser(userData);
      } catch (e) {
          console.error('Failed to update user data', e);
      }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@auth_user');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (e) {
      console.error('Failed to logout', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
