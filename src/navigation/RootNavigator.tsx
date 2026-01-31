import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import MainStack from './MainStack';
import AuthStack from './AuthStack';
import LoadingScreen from '../components/LoadingScreen';

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDark } = useTheme();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

