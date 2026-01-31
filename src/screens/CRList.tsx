import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    Linking, 
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CRListScreen() {
    const { isDark } = useTheme();
    const { token, user } = useAuth();
    const theme = Colors[isDark ? 'dark' : 'light'];

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [allCrs, setAllCrs] = useState<any[]>([]);
    const [filteredCrs, setFilteredCrs] = useState<any[]>([]);
    
    // Filter State
    const [selectedSemester, setSelectedSemester] = useState('All');
    const [selectedSection, setSelectedSection] = useState('All');
    const [availableSemesters, setAvailableSemesters] = useState<string[]>(['All']);
    const [availableSections, setAvailableSections] = useState<string[]>(['All']);

    useEffect(() => {
        loadCachedCRs();
        fetchCRs();
        fetchRoutineOptions();
    }, []);

    const loadCachedCRs = async () => {
        try {
            const cached = await AsyncStorage.getItem('cached_crs_full');
            if (cached) {
                const data = JSON.parse(cached);
                setAllCrs(data);
                setFilteredCrs(data);
            }
        } catch (e) {}
    };

    const fetchCRs = async () => {
        try {
            setLoading(true);
            const activeToken = token || "guest_token";  
            const res = await auth.getAllCRs(activeToken);
            if (res.data?.success) {
                const crData = res.data.data.filter((u: any) => u.role !== 'Admin');
                setAllCrs(crData);
                setFilteredCrs(crData);
                await AsyncStorage.setItem('cached_crs_full', JSON.stringify(crData));
            }
        } catch (error) {
            // Fail silently
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchRoutineOptions = async () => {
        try {
            const routineRes = await auth.getRoutine();
            if (routineRes.data && !routineRes.data.error) {
                const currentDept = user?.department || 'CSE';
                const deptData = routineRes.data[currentDept] || {};
                
                // Extract Semesters
                const sems = Object.keys(deptData).sort();
                if (sems.length > 0) {
                    setAvailableSemesters(['All', ...sems]);
                }

                // Extract all Sections across all semesters
                const sections = new Set<string>();
                sections.add('All');
                
                Object.values(deptData).forEach((semData: any) => {
                    Object.values(semData).forEach((dayClasses: any) => {
                        if (Array.isArray(dayClasses)) {
                            dayClasses.forEach((cls: any) => {
                                if (cls.section && cls.section !== 'N/A' && cls.section.trim() !== '') {
                                    sections.add(cls.section.trim());
                                }
                            });
                        }
                    });
                });
                setAvailableSections(Array.from(sections).sort());
            }
        } catch (error) {
            // Fail silently
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchCRs();
    };

    useEffect(() => {
        let filtered = allCrs;
        if (selectedSemester !== 'All') {
            filtered = filtered.filter(cr => cr.semester === selectedSemester);
        }
        if (selectedSection !== 'All') {
            filtered = filtered.filter(cr => cr.section === selectedSection);
        }
        setFilteredCrs(filtered);
    }, [selectedSemester, selectedSection, allCrs]);

    const handleCall = (number: string) => {
        if (number) Linking.openURL(`tel:${number}`);
    };

    const handleWhatsApp = (number: string) => {
        if (!number) return;
        let formatted = number.startsWith('+') ? number : '+880' + number.replace(/^0+/, ''); 
        Linking.openURL(`whatsapp://send?phone=${formatted}`);
    };

    const renderCRItem = (item: any, index: number) => (
        <Animated.View 
            entering={FadeInDown.delay(index * 50)} 
            key={item._id || item.id} 
            style={[styles.crCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
            <View style={styles.crContent}>
                <View style={styles.crHeader}>
                    {item.avatar ? <Image source={{ uri: item.avatar }} style={styles.crAvatar} /> : (
                        <View style={[styles.crAvatarPlaceholder, { backgroundColor: theme.primary + '15' }]}>
                            <Text style={[styles.crInitials, { color: theme.primary }]}>{item.name?.substring(0, 2).toUpperCase()}</Text>
                        </View>
                    )}
                    <View style={styles.crInfo}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.crName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                            <View style={styles.crTag}><Text style={styles.crTagText}>CR</Text></View>
                        </View>
                        <Text style={[styles.crSub, { color: theme.icon }]}>
                            {item.department} • {item.semester} • Section {item.section}
                        </Text>
                        <Text style={[styles.crEmail, { color: theme.icon }]} numberOfLines={1}>
                            {item.email}
                        </Text>
                    </View>
                </View>

                <View style={styles.crActions}>
                    <TouchableOpacity 
                        onPress={() => handleCall(item.contact)} 
                        style={[styles.actionBtn, { backgroundColor: theme.primary + '10' }]}
                    >
                        <Ionicons name="call" size={18} color={theme.primary} />
                        <Text style={[styles.actionText, { color: theme.primary }]}>Call Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => handleWhatsApp(item.contact)} 
                        style={[styles.actionBtn, { backgroundColor: '#22C55E' + '10' }]}
                    >
                        <Ionicons name="logo-whatsapp" size={18} color="#22C55E" />
                        <Text style={[styles.actionText, { color: '#22C55E' }]}>WhatsApp</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Filter Section */}
            <View style={[styles.filterContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    <View style={styles.filterGroup}>
                        <Text style={[styles.filterLabel, { color: theme.icon }]}>Semester</Text>
                        <View style={styles.chipGroup}>
                            {availableSemesters.map(sem => (
                                <TouchableOpacity 
                                    key={sem} 
                                    onPress={() => setSelectedSemester(sem)}
                                    style={[
                                        styles.chip, 
                                        selectedSemester === sem ? { backgroundColor: theme.primary } : { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }
                                    ]}
                                >
                                    <Text style={[styles.chipText, selectedSemester === sem ? { color: '#FFF' } : { color: theme.text }]}>{sem}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.filterGroup}>
                        <Text style={[styles.filterLabel, { color: theme.icon }]}>Section</Text>
                        <View style={styles.chipGroup}>
                            {availableSections.map(sec => (
                                <TouchableOpacity 
                                    key={sec} 
                                    onPress={() => setSelectedSection(sec)}
                                    style={[
                                        styles.chip, 
                                        selectedSection === sec ? { backgroundColor: theme.primary } : { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }
                                    ]}
                                >
                                    <Text style={[styles.chipText, selectedSection === sec ? { color: '#FFF' } : { color: theme.text }]}>{sec}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </View>

            <ScrollView 
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : filteredCrs.length > 0 ? (
                    filteredCrs.map((item, index) => renderCRItem(item, index))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={64} color={theme.icon} />
                        <Text style={[styles.emptyText, { color: theme.text }]}>No Class Representatives found</Text>
                        <Text style={[styles.emptySub, { color: theme.icon }]}>Try adjusting your filters</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterContainer: { paddingVertical: 12, borderBottomWidth: 1 },
    filterScroll: { paddingHorizontal: 20 },
    filterGroup: { marginRight: 20 },
    filterLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
    chipGroup: { flexDirection: 'row', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
    chipText: { fontSize: 13, fontWeight: '700' },
    divider: { width: 1, height: '60%', backgroundColor: 'rgba(0,0,0,0.05)', alignSelf: 'center', marginRight: 20 },
    
    listContainer: { padding: 20, paddingBottom: 40 },
    crCard: { borderRadius: 24, padding: 16, borderWidth: 1, marginBottom: 16 },
    crContent: { gap: 16 },
    crHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    crAvatar: { width: 60, height: 60, borderRadius: 30 },
    crAvatarPlaceholder: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    crInitials: { fontSize: 22, fontWeight: '800' },
    crInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    crName: { fontSize: 18, fontWeight: '800' },
    crTag: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    crTagText: { fontSize: 9, color: '#166534', fontWeight: '900' },
    crSub: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
    crEmail: { fontSize: 12, opacity: 0.6 },
    
    crActions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, gap: 8 },
    actionText: { fontSize: 14, fontWeight: '700' },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: '800', marginTop: 16 },
    emptySub: { fontSize: 14, marginTop: 8 },
});
