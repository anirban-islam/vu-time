import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// No-op for experimental layout animation in New Architecture


interface RoutineCardProps {
  courseName: string;
  courseCode: string;
  teacherName: string;
  roomNumber: string;
  time: string;
  type: 'Theory' | 'Lab';
  index: number;
  section?: string;
  semester?: string;
}

export default function RoutineCard({ 
    courseName, 
    courseCode, 
    teacherName, 
    roomNumber, 
    time,
    type,
    index,
    section,
    semester
}: RoutineCardProps) {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const [status, setStatus] = useState<'pending' | 'attended' | 'missed' | 'cancelled'>('pending');

  // Unique ID for this routine item instance (Date + CourseCode + Type)
  const todayStr = new Date().toISOString().split('T')[0];
  const itemKey = `attendance_${todayStr}_${courseCode}_${type}`;

  const { token } = useAuth(); // Get token

  React.useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
        const saved = await AsyncStorage.getItem(itemKey);
        if (saved) {
            setStatus(saved as any);
        }
    } catch (e) {
        console.log('Failed to load status', e);
    }
  };

  const handleAction = async (newStatus: 'attended' | 'missed' | 'cancelled') => {
    // LayoutAnimation is deprecated in New Architecture, using state update

    setStatus(newStatus);
    
    try {
        // 1. Local Cache for UI speed
        await AsyncStorage.setItem(itemKey, newStatus);
        
        // 2. Sync with Backend
        if (token) {
            const API_URL = 'https://vutime-backend.vercel.app/api/attendance';
            await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    courseCode,
                    courseName,
                    date: todayStr,
                    status: newStatus
                })
            });
             console.log("Attendance synced to DB");
        }
    } catch (e) {
        console.log('Failed to save status', e);
    }
  };

  const statusColor = {
    attended: '#10B981',
    missed: '#EF4444', 
    cancelled: '#F59E0B',
    pending: theme.primary
  };

  const typeColor = type === 'Lab' ? '#8B5CF6' : '#10B981';
  const typeBg = type === 'Lab' ? '#8B5CF6' + '15' : '#10B981' + '15';

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Type Indicator Bar */}
        <View style={[styles.typeBar, { backgroundColor: typeColor }]} />

        {/* Content */}
        <View style={styles.content}>
            {/* Top Info Row */}
            <View style={styles.topRow}>
                <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={14} color={theme.primary} />
                    <Text style={[styles.timeText, { color: theme.primary }]}>{time}</Text>
                </View>

                <View style={styles.badgesRight}>
                    {semester && (
                        <View style={[styles.semBadge, { backgroundColor: theme.primary + '10' }]}>
                            <Text style={[styles.semBadgeText, { color: theme.primary }]}>{semester}</Text>
                        </View>
                    )}
                    <View style={[styles.typeBadge, { backgroundColor: typeBg }]}>
                        <Text style={[styles.typeBadgeText, { color: typeColor }]}>{type}</Text>
                    </View>
                </View>
            </View>

            {/* Course Title & Code */}
            <View style={styles.courseHeader}>
                <Text style={[styles.courseName, { color: theme.text }]} numberOfLines={2}>
                    {courseName}
                </Text>
                <View style={styles.codeRow}>
                    <Text style={[styles.courseCode, { color: theme.icon }]}>{courseCode}</Text>
                    {section && section !== 'N/A' && (
                        <>
                            <View style={[styles.dot, { backgroundColor: theme.border }]} />
                            <Text style={[styles.sectionText, { color: theme.primary }]}>Section {section}</Text>
                        </>
                    )}
                </View>
            </View>
            
            {/* Details Grid */}
            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                    <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
                        <Ionicons name="location" size={12} color={theme.icon} />
                    </View>
                    <Text style={[styles.detailText, { color: theme.text }]}>Room {roomNumber}</Text>
                </View>

                <View style={[styles.dividerV, { backgroundColor: theme.border }]} />

                <View style={styles.detailItem}>
                    <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
                        <Ionicons name="person" size={12} color={theme.icon} />
                    </View>
                    <Text style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>{teacherName}</Text>
                </View>
            </View>

             {/* Action / Status Row */}
            <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
                {status === 'pending' ? (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={() => handleAction('attended')} style={styles.miniAction}>
                             <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                             <Text style={[styles.miniActionText, { color: '#10B981' }]}>Attend</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleAction('missed')} style={styles.miniAction}>
                             <Ionicons name="close-circle" size={18} color="#EF4444" />
                             <Text style={[styles.miniActionText, { color: '#EF4444' }]}>Miss</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleAction('cancelled')} style={styles.miniAction}>
                             <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                             <Text style={[styles.miniActionText, { color: '#F59E0B' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.statusDisplay}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusColor[status] }]} />
                        <Text style={[styles.statusDisplayText, { color: statusColor[status] }]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                        <TouchableOpacity onPress={() => setStatus('pending')} style={styles.resetBtn}>
                            <Text style={{ color: theme.icon, fontSize: 10 }}>Reset</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginVertical: 10,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  typeBar: {
    width: 6,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  timeText: {
      fontSize: 14,
      fontWeight: 'bold',
      letterSpacing: 0.5,
  },
  badgesRight: {
      flexDirection: 'row',
      gap: 8,
  },
  semBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
  },
  semBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      textTransform: 'uppercase',
  },
  typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
  },
  typeBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      textTransform: 'uppercase',
  },
  courseHeader: {
      marginBottom: 16,
  },
  courseName: {
      fontSize: 18,
      fontWeight: 'bold',
      lineHeight: 24,
      marginBottom: 4,
  },
  codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  courseCode: {
      fontSize: 12,
      fontWeight: '600',
  },
  dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
  },
  sectionText: {
      fontSize: 12,
      fontWeight: '700',
  },
  detailsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(150, 150, 150, 0.05)',
      padding: 10,
      borderRadius: 12,
      marginBottom: 16,
  },
  detailItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  iconBox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
  },
  detailText: {
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
  },
  dividerV: {
      width: 1,
      height: 20,
      marginHorizontal: 10,
  },
  footerRow: {
      paddingTop: 12,
      borderTopWidth: 1,
  },
  actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  miniAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      padding: 4,
  },
  miniActionText: {
      fontSize: 11,
      fontWeight: 'bold',
  },
  statusDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
  },
  statusDisplayText: {
      fontSize: 12,
      fontWeight: 'bold',
      flex: 1,
  },
  resetBtn: {
      padding: 4,
  }
});

