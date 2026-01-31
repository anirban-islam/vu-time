import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';

export default function ResourcesScreen() {
    const { isDark } = useTheme();
    const theme = Colors[isDark ? 'dark' : 'light'];

    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchResources = async () => {
        setLoading(true);
        try {
            const res = await auth.getResources();
            if (res.data.success) {
                setResources(res.data.data);
            }
        } catch (error) {
            console.log("Error fetching resources", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, []);

    const openLink = async (url: string) => {
        await WebBrowser.openBrowserAsync(url);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <ScrollView 
            style={[styles.container, { backgroundColor: theme.background }]}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchResources} colors={[theme.primary]} />}
        >
             <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Student Resources</Text>
                <Text style={[styles.subtitle, { color: theme.icon }]}>
                    Quick access to important university links and tools.
                </Text>
            </View>

            <View style={styles.grid}>
                {resources.map((item, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={[styles.card, { backgroundColor: theme.surface }]}
                        onPress={() => openLink(item.url)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={item.icon as any} size={28} color={item.color} />
                        </View>
                        <View style={styles.content}>
                            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                            <Text style={[styles.cardDesc, { color: theme.icon }]} numberOfLines={2}>
                                {item.desc}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.icon} style={{ opacity: 0.5 }} />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { marginBottom: 30, marginTop: 10 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
    subtitle: { fontSize: 16, lineHeight: 22 },
    grid: { gap: 16, paddingBottom: 40 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    content: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    cardDesc: { fontSize: 13, lineHeight: 18 },
});
