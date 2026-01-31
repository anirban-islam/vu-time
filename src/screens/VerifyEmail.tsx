import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';

export default function VerifyEmailScreen() {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email = route.params?.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<TextInput[]>([]);

  const handleVerify = async () => {
    const otp = code.join('');
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
        await auth.verifyOtp({ email, code: otp });
        Alert.alert('Success', 'Email verified successfully!', [
            { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
    } catch (error: any) {
        Alert.alert('Verification Failed', error.response?.data?.error || 'Invalid code');
    } finally {
        setLoading(false);
    }
  };

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (text: string, index: number) => {
      if (!text && index > 0) {
          inputs.current[index - 1]?.focus();
      }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInUp.delay(200).duration(1000).springify()} style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="mail-open-outline" size={40} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Verify Email</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>
                We sent a code to {email}. Enter it below to verify your account.
            </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(1000).springify()} style={styles.form}>
           <View style={styles.otpContainer}>
             {code.map((digit, index) => (
               <TextInput
                 key={index}
                 ref={ref => inputs.current[index] = ref as TextInput}
                 style={[
                     styles.otpInput, 
                     { 
                         color: theme.text, 
                         backgroundColor: theme.inputBackground, 
                         borderColor: theme.border 
                     }
                 ]}
                 maxLength={1}
                 keyboardType="number-pad"
                 value={digit}
                 onChangeText={(text) => handleChange(text, index)}
                 onKeyPress={({ nativeEvent }) => {
                     if (nativeEvent.key === 'Backspace') {
                         handleBackspace(code[index], index);
                     }
                 }}
               />
             ))}
           </View>

           <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20 }}>
              <Text style={[styles.linkText, { color: theme.primary, textAlign: 'center' }]}>Back to Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 40, width: '100%' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  form: { width: '100%' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  otpInput: { width: 45, height: 55, borderRadius: 12, borderWidth: 1, textAlign: 'center', fontSize: 24, fontWeight: 'bold' },
  button: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#c23f0c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { fontSize: 16, fontWeight: 'bold' },
});
