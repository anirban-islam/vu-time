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
  Modal,
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

  // Custom Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'error' | 'success'>('error');

  const showModal = (title: string, message: string, type: 'error' | 'success' = 'error') => {
      setModalTitle(title);
      setModalMessage(message);
      setModalType(type);
      setModalVisible(true);
  };

  const onModalClose = () => {
    setModalVisible(false);
    if (modalType === 'success') {
      navigation.navigate('Login');
    }
  };

  const handleVerify = async () => {
    const otp = code.join('');
    if (otp.length !== 6) {
      showModal('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
        await auth.verifyOtp({ email, code: otp });
        showModal('Success', 'Email verified successfully!', 'success');
    } catch (error: any) {
        showModal('Verification Failed', error.response?.data?.error || 'Invalid code');
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

      {/* Modern Feedback Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: modalType === 'success' ? '#DCFCE7' : '#FEE2E2' }]}>
              <Ionicons 
                name={modalType === 'success' ? 'checkmark-circle' : 'alert-circle'} 
                size={32} 
                color={modalType === 'success' ? '#22C55E' : '#EF4444'} 
              />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{modalTitle}</Text>
            <Text style={[styles.modalSubtitle, { color: theme.icon }]}>
              {modalMessage}
            </Text>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: modalType === 'success' ? '#22C55E' : '#EF4444' }]}
              onPress={onModalClose}
            >
              <Text style={styles.modalButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalButton: { width: '100%', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
});
