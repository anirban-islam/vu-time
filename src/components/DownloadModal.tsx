import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface DownloadModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const { width } = Dimensions.get('window');

export default function DownloadModal({ 
  visible, 
  onClose, 
  onConfirm, 
  title = "Download Permission", 
  description = "Do you want to download this document as a professional PDF?",
  icon = "cloud-download-outline"
}: DownloadModalProps) {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeInDown.duration(300)}
          style={[styles.overlayShadow, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.4)' }]}
        />
        
        <Animated.View 
          entering={FadeInUp.duration(400).springify()}
          style={[styles.modalBox, { backgroundColor: theme.surface }]}
        >
          <LinearGradient
            colors={[theme.primary + '20', theme.primary + '05']}
            style={styles.iconWrapper}
          >
            <Ionicons name={icon} size={40} color={theme.primary} />
          </LinearGradient>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.description, { color: theme.icon }]}>{description}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.primary }]} 
              onPress={() => {
                onClose();
                onConfirm();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.primary, theme.secondary || theme.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={[styles.buttonText, { color: '#FFF' }]}>Download</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFF" style={{ marginLeft: 4 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 15,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
