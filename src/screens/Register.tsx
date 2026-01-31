import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
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
    ActivityIndicator,
    Dimensions
} from 'react-native';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';

const { width, height } = Dimensions.get('window');

const FloatingIcon = ({ name, size, color, delay, duration, initialX, initialY }: any) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: duration }),
        withTiming(0, { duration: duration })
      ),
      -1,
      true
    );
    rotate.value = withRepeat(
      withTiming(15, { duration: duration * 1.5 }),
      -1,
      true
    );
    opacity.value = withDelay(delay, withTiming(0.15, { duration: 1000 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bgIcon,
        {
          left: initialX,
          top: initialY,
        },
        animatedStyle,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

export default function RegisterScreen() {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const navigation = useNavigation<any>();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

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

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
        showModal('Error', 'Please fill in all fields');
        return;
    }
    if (password !== confirmPassword) {
        showModal('Error', 'Passwords do not match');
        return;
    }

    setLoading(true);
    try {
        const response = await auth.register({ name, email, password });
        if (response.data.success) {
            showModal('Success', 'Account created! Please verify your email.', 'success');
        }
    } catch (error: any) {
        showModal('Registration Failed', error.response?.data?.error || 'Something went wrong');
    } finally {
        setLoading(false);
    }
  };

  const onModalClose = () => {
    setModalVisible(false);
    if (modalType === 'success') {
      navigation.navigate('VerifyEmail', { email });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Background Decorative Elements */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <FloatingIcon name="time-outline" size={45} color={theme.primary} initialX={width * 0.15} initialY={height * 0.1} duration={4000} delay={0} />
        <FloatingIcon name="book-outline" size={40} color={theme.primary} initialX={width * 0.8} initialY={height * 0.25} duration={3500} delay={500} />
        <FloatingIcon name="pencil-outline" size={35} color={theme.primary} initialX={width * 0.1} initialY={height * 0.8} duration={4500} delay={200} />
        <FloatingIcon name="school-outline" size={50} color={theme.primary} initialX={width * 0.75} initialY={height * 0.7} duration={5000} delay={800} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(1000).springify()} style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={styles.logo}
                contentFit="contain"
              />
            </View>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(200).duration(1000).springify()} 
            style={[styles.card, { 
              backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }]}
          >
            <Text style={[styles.title, { color: theme.text }]}>Join Us</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>
              Create your VU Time account
            </Text>

            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
                  <Ionicons name="person-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Full Name"
                    placeholderTextColor={theme.inputPlaceholder}
                    autoCapitalize="words"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
                  <Ionicons name="mail-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="example@email.com"
                    placeholderTextColor={theme.inputPlaceholder}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.inputPlaceholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.inputPlaceholder}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                activeOpacity={0.8}
                style={{ marginTop: 10 }}
                disabled={loading}
              >
                <LinearGradient
                  colors={[theme.primary, theme.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Create Account</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.icon }]}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[styles.linkText, { color: theme.primary }]}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgIcon: {
    position: 'absolute',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  card: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.6,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 4,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 10,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '800',
  },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalButton: { width: '100%', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
});

