import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';

const LATEST_NOTICES = [
  {
    id: '1',
    title: 'Room Change for CSE 2201',
    content: 'The class for Algorithms Design and Analysis (CSE 2201) scheduled for today at 08:30 AM has been moved from Room 302 to Room 509. Please attend firmly.',
  },
  {
    id: '2',
    title: 'Mid-term Exam Schedule',
    content: 'The mid-term examination schedule for the Spring 2026 semester has been published. Exams will commence from February 10th. Check the official notice board for the detailed routine.',
  },
  {
    id: '3',
    title: 'Registration Deadline Extended',
    content: 'The course registration deadline for Spring 2026 has been extended until January 30th. Students who have not yet registered are advised to do so immediately to avoid late fees.',
  },
];

export default function NoticeBoard() {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' + '20' }]}>
                <Ionicons name="megaphone" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Notice Board</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notices')}>
            <Text style={[styles.viewAll, { color: theme.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      
      {LATEST_NOTICES.map((notice) => (
        <TouchableOpacity 
            key={notice.id}
            style={styles.noticeItem}
            onPress={() => navigation.navigate('Notices', { noticeId: notice.id })}
        >
            <View style={[styles.bullet, { backgroundColor: theme.primary }]} />
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.noticeTitle, { color: theme.text }]} numberOfLines={1}>{notice.title}</Text>
                <Text style={[styles.content, { color: theme.text }]} numberOfLines={1}>
                    {notice.content}
                </Text>
            </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  content: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.7,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
  },
});
