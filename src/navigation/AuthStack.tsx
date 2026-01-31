import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import LoginScreen from '../screens/Login';
import RegisterScreen from '../screens/Register';
import VerifyEmailScreen from '../screens/VerifyEmail';
import ForgotPasswordScreen from '../screens/ForgotPassword';
import ResetPasswordScreen from '../screens/ResetPassword';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
