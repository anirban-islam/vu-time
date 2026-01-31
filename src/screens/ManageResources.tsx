import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';

export default function ManageResourcesScreen() {
    const { isDark } = useTheme();
    const theme = Colors[isDark ? 'dark' : 'light'];
    const { token } = useAuth();

    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form States
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('globe-outline');
    const [color, setColor] = useState('#3B82F6');
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const ICONS = ['globe-outline', 'calendar-outline', 'book-outline', 'trophy-outline', 'business-outline', 'document-text-outline', 'link-outline', 'school-outline'];
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#6366F1'];

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

    const handleDelete = (id: string) => {
        Alert.alert("Confirm", "Delete this resource?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await auth.deleteResource(token!, id);
                        fetchResources();
                    } catch (e) {
                         Alert.alert("Error", "Failed to delete");
                    }
                }
            }
        ]);
    };

    const handleCreate = async () => {
        if (!title || !desc || !url) {
            Alert.alert("Error", "Title, Desc, and URL are required");
            return;
        }
        setSubmitting(true);
        try {
            const res = await auth.addResource(token!, { title, desc, url, icon, color });
            if (res.data.success) {
                Alert.alert("Success", "Resource added!");
                setTitle('');
                setDesc('');
                setUrl('');
                setShowForm(false);
                fetchResources();
            }
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Failed to add resource");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Manage Resources</Text>
                <Text style={{ color: theme.icon }}>Add or remove student resources dynamically.</Text>
            </View>

            {/* Add New Section */}
            {!showForm ? (
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={() => setShowForm(true)}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Add New Resource</Text>
                </TouchableOpacity>
            ) : (
                <View style={[styles.form, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.formTitle, { color: theme.text }]}>New Resource</Text>
                    
                    <TextInput style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} placeholder="Title (e.g. Portal)" placeholderTextColor={theme.icon} value={title} onChangeText={setTitle} />
                    <TextInput style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} placeholder="Description" placeholderTextColor={theme.icon} value={desc} onChangeText={setDesc} />
                    <TextInput style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} placeholder="URL (https://...)" placeholderTextColor={theme.icon} value={url} onChangeText={setUrl} autoCapitalize="none" />
                    
                    <Text style={{ color: theme.text, fontWeight: 'bold', marginVertical: 8 }}>Select Icon</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {ICONS.map(i => (
                            <TouchableOpacity key={i} onPress={() => setIcon(i)} style={[styles.iconOption, { backgroundColor: icon === i ? theme.primary + '20' : theme.background, borderColor: icon === i ? theme.primary : theme.border }]}>
                                <Ionicons name={i as any} size={20} color={icon === i ? theme.primary : theme.icon} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={{ color: theme.text, fontWeight: 'bold', marginVertical: 8 }}>Select Color</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                        {COLORS.map(c => (
                            <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorOption, { backgroundColor: c, borderWidth: color === c ? 2 : 0, borderColor: theme.text }]} />
                        ))}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.btn, { backgroundColor: theme.background, flex: 1 }]}>
                            <Text style={{ color: theme.text }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCreate} disabled={submitting} style={[styles.btn, { backgroundColor: theme.primary, flex: 2 }]}>
                            {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>Save Resource</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
            ) : (
                <View style={styles.list}>
                    {resources.map((item) => (
                        <View key={item._id} style={[styles.item, { backgroundColor: theme.surface }]}>
                            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                                <Ionicons name={item.icon} size={24} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                                <Text style={{ color: theme.icon, fontSize: 12 }} numberOfLines={1}>{item.url}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(item._id)} style={{ padding: 8 }}>
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8, marginBottom: 20 },
    form: { padding: 20, borderRadius: 16, marginBottom: 20 },
    formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    input: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
    iconOption: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginRight: 8 },
    colorOption: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
    btn: { padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    list: { gap: 12, paddingBottom: 40 },
    item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    itemTitle: { fontSize: 16, fontWeight: 'bold' },
});
