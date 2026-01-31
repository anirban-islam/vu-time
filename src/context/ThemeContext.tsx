import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeContextType = {
  theme: 'light' | 'dark' | 'system';
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  // Initialize theme from storage
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('user_theme');
      if (storedTheme) {
        setTheme(storedTheme as any);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const isDark = theme === 'system' 
    ? systemScheme === 'dark' 
    : theme === 'dark';

  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('user_theme', newTheme);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    setTheme(mode);
    try {
      await AsyncStorage.setItem('user_theme', mode);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
