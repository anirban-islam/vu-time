import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  FadeIn,
  withDelay
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const FloatingIcon = ({ name, size, color, delay, duration, initialX, initialY }: any) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: duration }),
        withTiming(0, { duration: duration })
      ),
      -1,
      true
    );
    rotate.value = withRepeat(
      withTiming(20, { duration: duration * 1.2 }),
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

const LoadingScreen = () => {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.4, { duration: 1200 })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1200 }),
        withTiming(0.95, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Subtle Background Elements */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <FloatingIcon name="time-outline" size={50} color={theme.primary} initialX={width * 0.1} initialY={height * 0.2} duration={5000} delay={0} />
        <FloatingIcon name="book-outline" size={45} color={theme.primary} initialX={width * 0.8} initialY={height * 0.15} duration={4500} delay={500} />
        <FloatingIcon name="pencil-outline" size={40} color={theme.primary} initialX={width * 0.2} initialY={height * 0.75} duration={4800} delay={200} />
        <FloatingIcon name="school-outline" size={60} color={theme.primary} initialX={width * 0.7} initialY={height * 0.8} duration={5500} delay={800} />
      </View>

      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});


export default LoadingScreen;

