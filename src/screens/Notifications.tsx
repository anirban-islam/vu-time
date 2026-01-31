import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function NotificationsScreen() {
    const { isDark } = useTheme();
    const { token, user } = useAuth();
    const theme = Colors[isDark ? 'dark' : 'light'];

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [lastSeenId, setLastSeenId] = useState<string | null>(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const activeToken = token || "guest_token";
            
            // Get last seen ID from storage
            const seenId = await AsyncStorage.getItem('last_seen_notice_id');
            setLastSeenId(seenId);

            // Fetch notices to use as notifications
            const res = await auth.getAllNotices(activeToken);
            if (res.data?.success) {
                // Filter notices that are relevant to the user or global
                const normalize = (str?: string) => str?.toLowerCase().replace(/\s/g, '') || '';
                const userSem = normalize(user?.semester);
                const userDept = normalize(user?.department);
                const userSec = normalize(user?.section);

                const relevantNotices = res.data.data.filter((item: any) => {
                    if (item.type === 'global') return true;
                    
                    const itemSem = normalize(item.targetAudience?.semester);
                    const itemDept = normalize(item.targetAudience?.department);
                    const itemSec = normalize(item.targetAudience?.section);

                    // Check if it matches department
                    if (itemDept && itemDept !== userDept) return false;
                    
                    // If it's for a specific section
                    if (itemSec) return itemSec === userSec && itemSem === userSem;
                    
                    // If it's for a specific semester
                    if (itemSem) return itemSem === userSem;

                    return true;
                });

                setNotifications(relevantNotices);

                // Update last seen ID to the latest notice
                if (relevantNotices.length > 0) {
                    await AsyncStorage.setItem('last_seen_notice_id', relevantNotices[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const getTimeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    const renderNotificationItem = (item: any, index: number) => {
        const isUnread = lastSeenId && item._id > lastSeenId; // Simple ID comparison or we could track seen IDs
        // Actually, since notices are sorted newest first, if it's newer than our last seen ID, it's "new"
        // But for a simple unread dot, we can just compare with the stored value
        
        const isNew = !lastSeenId || (item.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        return (
            <Animated.View 
                entering={FadeInDown.delay(index * 50)} 
                key={item._id || item.id} 
            >
                <View style={[
                    styles.notiCard, 
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    item._id === lastSeenId ? { opacity: 0.8 } : {}
                ]}>
                    <View style={styles.notiIconContainer}>
                        <View style={[styles.iconCircle, { backgroundColor: item.priority === 'High' ? '#FEE2E2' : theme.primary + '15' }]}>
                            <Ionicons 
                                name={item.priority === 'High' ? "alert-circle" : "notifications-outline"} 
                                size={24} 
                                color={item.priority === 'High' ? "#EF4444" : theme.primary} 
                            />
                        </View>
                        {isNew && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                    </View>

                    <View style={styles.notiContent}>
                        <View style={styles.notiHeader}>
                            <Text style={[styles.notiTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                            <Text style={[styles.notiTime, { color: theme.icon }]}>{getTimeAgo(item.createdAt)}</Text>
                        </View>
                        <Text style={[styles.notiDesc, { color: theme.icon }]} numberOfLines={2}>
                            {item.content}
                        </Text>
                        <View style={styles.notiFooter}>
                            <View style={[styles.tag, { backgroundColor: theme.background }]}>
                                <Text style={[styles.tagText, { color: theme.icon }]}>{item.author}</Text>
                            </View>
                            {item.type === 'global' && (
                                <View style={[styles.tag, { backgroundColor: '#F0F9FF', borderColor: '#B9E6FE', borderWidth: 1 }]}>
                                    <Text style={[styles.tagText, { color: '#026AA2' }]}>Global</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Recent Updates</Text>
                    <TouchableOpacity onPress={fetchNotifications}>
                        <Text style={{ color: theme.primary, fontWeight: '700' }}>Mark all as read</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : notifications.length > 0 ? (
                    notifications.map((item, index) => renderNotificationItem(item, index))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={64} color={theme.icon} />
                        <Text style={[styles.emptyText, { color: theme.text }]}>No notifications yet</Text>
                        <Text style={[styles.emptySub, { color: theme.icon }]}>We'll notify you when something important happens.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '800' },
    
    notiCard: { 
        flexDirection: 'row', 
        padding: 16, 
        borderRadius: 20, 
        borderWidth: 1, 
        marginBottom: 12,
        gap: 12,
        alignItems: 'center'
    },
    notiIconContainer: { position: 'relative' },
    iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    unreadDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF' },
    
    notiContent: { flex: 1 },
    notiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    notiTitle: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
    notiTime: { fontSize: 11, fontWeight: '600', opacity: 0.6 },
    notiDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8, opacity: 0.8 },
    
    notiFooter: { flexDirection: 'row', gap: 8 },
    tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: '800', marginTop: 16 },
    emptySub: { fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 40, opacity: 0.6 },
});
