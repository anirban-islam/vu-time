import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StudentDashboardScreen() {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const { user, token } = useAuth();
  const navigation = useNavigation<any>();

  const [stats, setStats] = useState({ attended: 0, missed: 0, total: 0 });
  const [courses, setCourses] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
        loadStats();
    }, [token])
  );

  const loadStats = async () => {
      if (!token) return;
      setLoading(true);
      try {
          // 1. Fetch Attendance & Routine in parallel
          const [attRes, routineRes] = await Promise.all([
              auth.getAttendance(token),
              auth.getRoutine()
          ]);
          
          let history: any[] = [];
          if (attRes.data.success) {
              history = attRes.data.data;
              
              // Overall Stats
              let att = 0, mis = 0, tot = 0;
              history.forEach((h: any) => {
                  if (h.status === 'attended') att++;
                  if (h.status === 'missed') mis++;
                  if (h.status !== 'cancelled') tot++;
              });
              setStats({ attended: att, missed: mis, total: tot });

              // Weekly Activity Data
              const today = new Date();
              const last7Days = [];
              for (let i = 6; i >= 0; i--) {
                  const d = new Date(today);
                  d.setDate(today.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayLogs = history.filter((h: any) => h.date === dateStr);
                  last7Days.push({ 
                      day: dayName, 
                      attended: dayLogs.filter((h: any) => h.status === 'attended').length, 
                      missed: dayLogs.filter((h: any) => h.status === 'missed').length 
                  });
              }
              setWeeklyData(last7Days);
          }

          // 2. Extract Courses from Routine based on User Profile
          if (routineRes.data) {
              const userDept = (user?.department || '').trim();
              const userSem = (user?.semester || '').trim();
              const userSec = (user?.section || '').trim();
              
              const routineData = routineRes.data;
              // Find matching department (case-insensitive)
              const deptKey = Object.keys(routineData).find(k => k.toLowerCase() === userDept.toLowerCase());
              const deptData = deptKey ? routineData[deptKey] : null;
              
              if (deptData) {
                  // Find matching semester (case-insensitive)
                  const semKey = Object.keys(deptData).find(k => k.toLowerCase() === userSem.toLowerCase());
                  const semData = semKey ? deptData[semKey] : null;

                  if (semData) {
                      const uniqueCourses = new Map();
                      
                      Object.values(semData).forEach((dayClasses: any) => {
                          if (Array.isArray(dayClasses)) {
                              dayClasses.forEach((cls: any) => {
                                  // Filter by section (case-insensitive)
                                  const clsSection = (cls.section || '').trim();
                                  if (clsSection && clsSection !== 'N/A' && clsSection.toLowerCase() !== userSec.toLowerCase()) return;

                                  if (!uniqueCourses.has(cls.courseCode)) {
                                      // Calculate attendance for this specific course
                                      const courseLogs = history.filter(h => h.courseCode === cls.courseCode);
                                      const attended = courseLogs.filter(h => h.status === 'attended').length;
                                      const missed = courseLogs.filter(h => h.status === 'missed').length;
                                      const total = attended + missed;
                                      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

                                      uniqueCourses.set(cls.courseCode, {
                                          code: cls.courseCode,
                                          name: cls.courseName,
                                          teacher: cls.teacherName,
                                          type: cls.type,
                                          percentage,
                                          attended,
                                          total
                                      });
                                  }
                              });
                          }
                      });
                      setCourses(Array.from(uniqueCourses.values()));
                  } else {
                      setCourses([]);
                  }
              } else {
                  setCourses([]);
              }
          }
      } catch (e) {
          console.log("Error loading dashboard data", e);
      } finally {
          setLoading(false);
      }
  };

  const overallPercentage = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  const renderMenuItem = (title: string, subtitle: string, icon: any, color: string, route: string) => (
      <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate(route)}
          activeOpacity={0.7}
      >
          <View style={[styles.menuIconContainer, { backgroundColor: color + '15' }]}>
              <Ionicons name={icon} size={28} color={color} />
          </View>
          <View>
              <Text style={[styles.menuTitle, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.menuSubtitle, { color: theme.icon }]}>{subtitle}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={20} color={theme.icon} style={{ opacity: 0.5 }} />
      </TouchableOpacity>
  );

  if (loading && courses.length === 0) {
      return (
          <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
          </View>
      );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Header */}
      <View style={styles.header}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary, marginRight: 15 }]}>
             {user?.avatar ? (
                 <Image source={{ uri: user.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
             ) : (
                 <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{user?.name?.charAt(0) || 'S'}</Text>
             )}
          </View>
          <View>
            <Text style={[styles.greeting, { color: theme.text }]}>Hello, {user?.name?.split(' ')[0] || 'Student'}! 👋</Text>
            <Text style={[styles.subGreeting, { color: theme.icon }]}>Here's your academic summary.</Text>
          </View>
      </View>

      {/* Main Stats Card */}
      <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
          <View style={styles.percentageCircle}>
              <View style={[styles.circleInner, { borderColor: theme.primary }]}>
                  <Text style={[styles.percentageNum, { color: theme.primary }]}>{overallPercentage}%</Text>
                  <Text style={{ fontSize: 10, color: theme.icon, textTransform: 'uppercase' }}>Attendance</Text>
              </View>
          </View>
          
          <View style={styles.statsRight}>
              <View style={styles.statRow}>
                  <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.statLabel, { color: theme.icon }]}>Attended</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{stats.attended}</Text>
              </View>
              <View style={styles.statRow}>
                  <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.statLabel, { color: theme.icon }]}>Missed</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{stats.missed}</Text>
              </View>
              <View style={styles.statRow}>
                  <View style={[styles.dot, { backgroundColor: theme.icon }]} />
                  <Text style={[styles.statLabel, { color: theme.icon }]}>Total Classes</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{stats.total}</Text>
              </View>
          </View>
      </View>

      {/* Dynamic Courses Section */}
      <View style={{ marginBottom: 30 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: theme.text }]}>My Courses</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyCourses')}>
                  <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {courses.length > 0 ? (
                  courses.map((course, idx) => (
                      <View key={idx} style={[
                          styles.courseMiniCard, 
                          { 
                              backgroundColor: theme.surface,
                              borderWidth: 1,
                              borderColor: theme.border, 
                              shadowOpacity: isDark ? 0.3 : 0.08, // Stronger shadow in light mode
                              shadowRadius: 8,
                              elevation: 3
                          }
                      ]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1 }}>
                                  <Text style={[styles.courseCode, { color: theme.primary }]} numberOfLines={1}>{course.code}</Text>
                                  <Text style={[styles.courseName, { color: theme.text }]} numberOfLines={1}>{course.name}</Text>
                              </View>
                              <View style={[styles.miniPercentage, { borderColor: course.percentage >= 75 ? '#10B981' : '#F59E0B' }]}>
                                  <Text style={[styles.miniPercentageText, { color: course.percentage >= 75 ? '#10B981' : '#F59E0B' }]}>{course.percentage}%</Text>
                              </View>
                          </View>
                          <View style={{ marginTop: 10 }}>
                                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                                    <View style={[styles.progressBarFill, { width: `${course.percentage}%`, backgroundColor: course.percentage >= 75 ? '#10B981' : '#F59E0B' }]} />
                                </View>
                                <Text style={{ fontSize: 10, color: theme.icon, marginTop: 4 }}>{course.attended}/{course.total} Classes Attended</Text>
                          </View>
                      </View>
                  ))
              ) : (
                  <View style={[styles.emptyCourses, { backgroundColor: theme.surface }]}>
                      <Text style={{ color: theme.icon, fontSize: 12 }}>No courses found in routine</Text>
                  </View>
              )}
          </ScrollView>
      </View>

      {/* Growth Graph - Weekly Activity */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Activity</Text>
      <View style={[styles.graphCard, { backgroundColor: theme.surface }]}>
          <View style={styles.graphContainer}>
              {weeklyData.map((item, index) => {
                  const maxVal = Math.max(...weeklyData.map(d => d.attended + d.missed), 5); // Minimum scale height
                  const total = item.attended + item.missed;
                  const barHeight = (total / maxVal) * 100; // Percentage of max height
                  const attendedHeight = total > 0 ? (item.attended / total) * barHeight : 0;
                  const missedHeight = total > 0 ? (item.missed / total) * barHeight : 0;

                  return (
                      <View key={index} style={styles.graphColumn}>
                          <View style={styles.barStack}>
                              {/* Missed Bar (Top) */}
                              {item.missed > 0 && (
                                <View style={[styles.barSegment, { height: `${missedHeight}%`, backgroundColor: '#EF4444', opacity: 0.8 }]} />
                              )}
                              {/* Attended Bar (Bottom) */}
                              {item.attended > 0 && (
                                <View style={[styles.barSegment, { height: `${attendedHeight}%`, backgroundColor: '#10B981' }]} />
                              )}
                              {/* Empty if 0 */}
                              {total === 0 && <View style={[styles.barSegment, { height: 2, backgroundColor: theme.border }]} />}
                          </View>
                          <Text style={[styles.dayLabel, { color: theme.icon }]}>{item.day}</Text>
                      </View>
                  );
              })}
          </View>
      </View>

      {/* Menu Grid */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
      <View style={styles.menuContainer}>
          {renderMenuItem("My Courses", "View subjects & stats", "book", "#3B82F6", "MyCourses")}
          {renderMenuItem("Cover Page", "Build assignment covers", "document-text", "#8B5CF6", "CoverPageBuilder")}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
      marginTop: 20,
      marginBottom: 30,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
  },
  greeting: { fontSize: 24, fontWeight: 'bold' },
  subGreeting: { fontSize: 14 },
  avatarPlaceholder: {
      width: 40, 
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  
  statsCard: {
      flexDirection: 'row',
      padding: 20,
      borderRadius: 20,
      marginBottom: 30,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
  },
  percentageCircle: {
      width: 100,
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
  },
  circleInner: {
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 6,
      justifyContent: 'center',
      alignItems: 'center',
  },
  percentageNum: { fontSize: 22, fontWeight: 'bold' },
  
  statsRight: { flex: 1, paddingLeft: 20, gap: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statLabel: { fontSize: 14, flex: 1 },
  statValue: { fontSize: 14, fontWeight: 'bold' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  graphCard: {
      padding: 20,
      borderRadius: 20,
      marginBottom: 30,
      height: 200,
      justifyContent: 'flex-end',
  },
  graphContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 140,
  },
  graphColumn: {
      alignItems: 'center',
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end',
      gap: 8,
  },
  barStack: {
      width: 12,
      height: '80%',
      justifyContent: 'flex-end',
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: 'rgba(0,0,0,0.03)',
  },
  barSegment: { width: '100%' },
  dayLabel: { fontSize: 12 },

  menuContainer: { gap: 16 },
  menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
  },
  menuIconContainer: {
      width: 50, 
      height: 50,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
  },
  menuTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  menuSubtitle: { fontSize: 12 },
  
  // New Styles
  courseMiniCard: {
      width: 200,
      padding: 15,
      borderRadius: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 5,
      elevation: 1,
  },
  courseCode: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  courseName: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  miniPercentage: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
  },
  miniPercentageText: { fontSize: 9, fontWeight: 'bold' },
  progressBarBg: {
      height: 4,
      backgroundColor: 'rgba(0,0,0,0.05)',
      borderRadius: 2,
      width: '100%',
  },
  progressBarFill: {
      height: '100%',
      borderRadius: 2,
  },
  emptyCourses: {
      width: SCREEN_WIDTH - 40,
      padding: 20,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
  },
});
