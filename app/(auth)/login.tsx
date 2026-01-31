import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
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
    useColorScheme,
    View,
    Dimensions,
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
  interpolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const AnimatedCircle = ({ size, color, delay, duration, initialX, initialY }: any) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: duration }),
        withTiming(0, { duration: duration })
      ),
      -1,
      true
    );
    opacity.value = withDelay(delay, withTiming(0.4, { duration: 1000 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bgCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: initialX,
          top: initialY,
        },
        animatedStyle,
      ]}
    />
  );
};

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    // Implement login logic here
    console.log('Login attempt:', email);
    // For demo, just go to tabs
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Background Decorative Elements */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <AnimatedCircle size={150} color={theme.primary + '15'} initialX={-50} initialY={100} duration={3000} delay={0} />
        <AnimatedCircle size={200} color={theme.primary + '10'} initialX={width - 150} initialY={height / 2} duration={4000} delay={500} />
        <AnimatedCircle size={100} color={theme.primary + '20'} initialX={width / 2 - 50} initialY={height - 200} duration={3500} delay={200} />
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
          <Animated.View entering={FadeInUp.delay(200).duration(1000).springify()} style={styles.header}>
            <View style={[styles.logoContainer]}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>
              Enter your credentials to continue your journey.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(1000).springify()} style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.surface : '#F8FAFC', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
                <Ionicons name="mail-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="john@example.com"
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
              <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.surface : '#F8FAFC', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
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

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.primary, theme.primary + 'DD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.icon }]}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={[styles.linkText, { color: theme.primary }]}>Create Account</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: isDark ? theme.border : '#E2E8F0' }]} />
              <Text style={[styles.dividerText, { color: theme.icon }]}>Or continue with</Text>
              <View style={[styles.divider, { backgroundColor: isDark ? theme.border : '#E2E8F0' }]} />
            </View>
            
            <View style={styles.socialButtons}>
              <TouchableOpacity style={[styles.socialButton, { borderColor: isDark ? theme.border : '#E2E8F0', backgroundColor: isDark ? theme.surface : '#fff' }]}>
                <Ionicons name="logo-google" size={22} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, { borderColor: isDark ? theme.border : '#E2E8F0', backgroundColor: isDark ? theme.surface : '#fff' }]}>
                <Ionicons name="logo-apple" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 35,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'transparent',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});

