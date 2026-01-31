import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function HeaderDateTime() {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000 * 60); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Format: Monday, Jan 26
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Format: 12.30 PM
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(':', '.');

  return (
    <View style={styles.container}>
      <Text style={[styles.dateText, { color: theme.text }]}>
        {dateStr}
      </Text>
      <Text style={[styles.timeText, { color: theme.primary }]}>
        {timeStr}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column', // Stack vertically for better space usage on mobile
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 0, 
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: -2,
  },
});
