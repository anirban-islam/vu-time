import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface TeacherCardProps {
  initial: string;
  name: string;
  designation: string;
  department: string;
  onPress: () => void;
}

export default function TeacherCard({ initial, name, designation, department, onPress }: TeacherCardProps) {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '20' }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>{initial}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.designation, { color: theme.icon }]} numberOfLines={1}>{designation}</Text>
        <Text style={[styles.department, { color: theme.icon }]} numberOfLines={1}>{department}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.icon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  designation: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.8,
    marginBottom: 4,
  },
  department: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
  },
});
