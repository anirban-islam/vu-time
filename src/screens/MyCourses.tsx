import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

import { auth } from '../services/api';

export default function MyCoursesScreen() {
    const navigation = useNavigation<any>();
    const { isDark } = useTheme();
    const theme = Colors[isDark ? 'dark' : 'light'];
    const { user, token } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [isProfileComplete, setIsProfileComplete] = useState(false);

    useEffect(() => {
        const checkProfile = user?.department && user?.semester && user?.section;
        setIsProfileComplete(!!checkProfile);
        if (checkProfile) {
            loadData();
        } else {
            setLoading(false); // Stop loading if profile is incomplete
        }
    }, [user, token]);

    const loadData = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [routineRes, attRes] = await Promise.all([
                auth.getRoutine(),
                auth.getAttendance(token)
            ]);

            let attendanceLogs: any[] = [];
            if (attRes.data.success) {
                attendanceLogs = attRes.data.data;
                const newStats: any = {};
                attendanceLogs.forEach((h: any) => {
                    if (!newStats[h.courseCode]) {
                        newStats[h.courseCode] = { attended: 0, missed: 0, cancelled: 0, total: 0 };
                    }
                    if (h.status !== 'cancelled') newStats[h.courseCode].total++;
                    if (h.status === 'attended') newStats[h.courseCode].attended++;
                    if (h.status === 'missed') newStats[h.courseCode].missed++;
                    if (h.status === 'cancelled') newStats[h.courseCode].cancelled++;
                });
                setStats(newStats);
            }

            if (routineRes.data) {
                const userDept = (user?.department || '').trim();
                const userSem = (user?.semester || '').trim();
                const userSec = (user?.section || '').trim();
                
                // Find matching department (case-insensitive)
                const deptKey = Object.keys(routineRes.data).find(k => k.toLowerCase() === userDept.toLowerCase());
                const deptData = deptKey ? routineRes.data[deptKey] : null;
                
                if (!deptData) {
                    setCourses([]);
                    return;
                }

                // Find matching semester (case-insensitive)
                const semKey = Object.keys(deptData).find(k => k.toLowerCase() === userSem.toLowerCase());
                const semData = semKey ? deptData[semKey] : null;

                if (!semData) {
                    setCourses([]);
                    return;
                }
                
                const uniqueCourses = new Map();
                
                Object.values(semData).forEach((dayClasses: any) => {
                    if (Array.isArray(dayClasses)) {
                        dayClasses.forEach((cls: any) => {
                            const clsSection = (cls.section || '').trim();
                            if (clsSection && clsSection !== 'N/A' && clsSection.toLowerCase() !== userSec.toLowerCase()) return;

                            if (!uniqueCourses.has(cls.courseCode)) {
                                uniqueCourses.set(cls.courseCode, {
                                    code: cls.courseCode,
                                    name: cls.courseName,
                                    teacher: cls.teacherName,
                                    type: cls.type,
                                    credits: 3 
                                });
                            }
                        });
                    }
                });
                setCourses(Array.from(uniqueCourses.values()));
            }
        } catch (error) {
            console.log('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAttendanceColor = (percentage: number) => {
        if (percentage >= 90) return '#10B981'; // Green
        if (percentage >= 75) return '#3B82F6'; // Blue
        if (percentage >= 60) return '#F59E0B'; // Yellow
        return '#EF4444'; // Red
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!isProfileComplete) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                <View style={{ backgroundColor: theme.primary + '15', padding: 25, borderRadius: 100, marginBottom: 25 }}>
                    <Ionicons name="school-outline" size={80} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 12 }}>Academic Profile Incomplete</Text>
                <Text style={{ fontSize: 16, color: theme.icon, textAlign: 'center', marginBottom: 30, lineHeight: 24 }}>Please set your department, semester, and section in your profile to view your courses and attendance stats.</Text>
                <TouchableOpacity 
                    style={{ backgroundColor: theme.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, width: '100%' }}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Set Academic Info Now</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView 
            style={[styles.container, { backgroundColor: theme.background }]}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[theme.primary]} />}
        >
            <View style={{ padding: 20 }}>
                {courses.length === 0 && !loading && (
                    <Text style={{ textAlign: 'center', color: theme.icon, marginTop: 50 }}>No courses found for your semester.</Text>
                )}

                {courses.map((course, index) => {
                    const courseStats = stats[course.code] || { attended: 0, missed: 0, total: 0 };
                    // Calculate percentage excluding cancelled? Or total? usually total active classes
                    const effectiveTotal = courseStats.attended + courseStats.missed;
                    const percentage = effectiveTotal > 0 
                        ? Math.round((courseStats.attended / effectiveTotal) * 100) 
                        : 0;

                    return (
                        <View key={index} style={[styles.card, { backgroundColor: theme.surface }]}>
                            <View style={styles.header}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.code, { color: theme.primary }]}>{course.code}</Text>
                                    <Text style={[styles.name, { color: theme.text }]}>{course.name}</Text>
                                    <Text style={[styles.teacher, { color: theme.icon }]}>{course.teacher}</Text>
                                </View>
                                <View style={[styles.percentageBox, { borderColor: getAttendanceColor(percentage) }]}>
                                    <Text style={[styles.percentageText, { color: getAttendanceColor(percentage) }]}>
                                        {percentage}%
                                    </Text>
                                    <Text style={{ fontSize: 10, color: theme.icon }}>Attd.</Text>
                                </View>
                            </View>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: theme.text }]}>{courseStats.total}</Text>
                                    <Text style={[styles.statLabel, { color: theme.icon }]}>Total</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: '#10B981' }]}>{courseStats.attended}</Text>
                                    <Text style={[styles.statLabel, { color: theme.icon }]}>Present</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: '#EF4444' }]}>{courseStats.missed}</Text>
                                    <Text style={[styles.statLabel, { color: theme.icon }]}>Absent</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    code: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
    name: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, lineHeight: 22 },
    teacher: { fontSize: 12 },
    percentageBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    percentageText: { fontSize: 14, fontWeight: 'bold' },
    divider: { height: 1, marginBottom: 12 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 16, fontWeight: 'bold' },
    statLabel: { fontSize: 12, marginTop: 2 },
});
