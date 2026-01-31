import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function SupportAdminScreen() {
    const { token } = useAuth();
    const navigation = useNavigation<any>();
    const { isDark } = useTheme();
    const theme = Colors[isDark ? 'dark' : 'light'];
    
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) fetchChats();
    }, [token]);

    const fetchChats = async () => {
        try {
            const res = await auth.getMessages(token);
            if (res.data.success) {
                // Group messages by user
                const msgs = res.data.messages;
                const conversations: any = {};
                
                msgs.forEach((m: any) => {
                    const otherUser = m.sender?.role !== 'Admin' ? m.sender : m.receiver;
                    if (otherUser && otherUser._id) {
                        if (!conversations[otherUser._id] || new Date(m.createdAt) > new Date(conversations[otherUser._id].lastMessageDate)) {
                            conversations[otherUser._id] = {
                                user: otherUser,
                                lastMessage: m.content,
                                lastMessageDate: m.createdAt,
                                unreadCount: m.isRead ? 0 : 1 // Simple logic
                            };
                        }
                    }
                });
                
                setChats(Object.values(conversations).sort((a: any, b: any) => 
                    new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
                ));
            }
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.chatItem, { borderBottomColor: theme.border }]}
            onPress={() => navigation.navigate('SupportChat', { userId: item.user._id, userName: item.user.name })}
        >
            <Image 
                source={{ uri: item.user.avatar || `https://ui-avatars.com/api/?name=${item.user.name}&background=random` }} 
                style={styles.avatar} 
            />
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={[styles.userName, { color: theme.text }]}>{item.user.name}</Text>
                    <Text style={[styles.time, { color: theme.icon }]}>
                        {new Date(item.lastMessageDate).toLocaleDateString()}
                    </Text>
                </View>
                <Text style={[styles.lastMsg, { color: theme.icon }]} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                 <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Support Inquiries</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
            ) : (
                <FlatList 
                    data={chats}
                    renderItem={renderItem}
                    keyExtractor={item => item.user._id}
                    ListEmptyComponent={() => (
                        <View style={styles.center}>
                            <Ionicons name="chatbox-ellipses-outline" size={64} color={theme.icon} />
                            <Text style={{ color: theme.icon, marginTop: 16 }}>No support messages found.</Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 12, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 10 : 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    chatItem: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    chatInfo: { flex: 1, marginLeft: 12 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    userName: { fontSize: 16, fontWeight: 'bold' },
    time: { fontSize: 12 },
    lastMsg: { fontSize: 14 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }
});
