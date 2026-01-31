import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false, // Clean look
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Welcome Back',
          headerShown: false, // Often login screens don't have a header or have a custom one
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Create Account',
          headerShown: true,
          headerTransparent: true, // Float over the content
          headerTitle: '',
          headerTintColor: theme.text,
        }}
      />
    </Stack>
  );
}
