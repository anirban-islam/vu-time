import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

export default function AdminDashboardScreen() {
    const { isDark } = useTheme();
    const theme = Colors[isDark ? 'dark' : 'light'];
    const { user, token } = useAuth();
    const navigation = useNavigation();

    // Banner States
    const [banners, setBanners] = useState<any[]>([]);
    const [bannerLoading, setBannerLoading] = useState(false);
    const [showBannerForm, setShowBannerForm] = useState(false);
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerSubtitle, setBannerSubtitle] = useState('');
    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const fetchBanners = async () => {
        try {
            const res = await auth.getBanners();
            if (res.data.success) {
                setBanners(res.data.data);
            }
        } catch (e) {
            console.log("Failed to fetch banners");
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    const pickBannerImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaType.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setBannerImage(result.assets[0].uri);
        }
    };

    const handleCreateBanner = async () => {
        if (!bannerTitle || (!bannerImage && !editingBannerId)) {
            Alert.alert("Error", "Title and Image are required");
            return;
        }

        setBannerLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', bannerTitle);
            formData.append('subtitle', bannerSubtitle);
            
            if (bannerImage && !bannerImage.startsWith('http')) {
                const uri = bannerImage;
                const uriParts = uri.split('.');
                const fileType = uriParts[uriParts.length - 1];
                
                formData.append('image', {
                    uri,
                    name: `banner.${fileType}`,
                    type: `image/${fileType}`,
                } as any);
            }

            let res;
            if (editingBannerId) {
                res = await auth.updateBanner(token, editingBannerId, formData);
            } else {
                res = await auth.createBanner(token, formData);
            }

            if (res.data.success) {
                setSuccessMsg(`Banner ${editingBannerId ? 'updated' : 'created'} successfully!`);
                setBannerTitle('');
                setBannerSubtitle('');
                setBannerImage(null);
                setEditingBannerId(null);
                setShowBannerForm(false);
                fetchBanners();
            }
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Failed to save banner");
        } finally {
            setBannerLoading(false);
        }
    };

    const handleEditBanner = (banner: any) => {
        setBannerTitle(banner.title);
        setBannerSubtitle(banner.subtitle || '');
        setBannerImage(banner.imageUrl);
        setEditingBannerId(banner._id);
        setShowBannerForm(true);
    };

    const handleDeleteBanner = async (id: string) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this banner?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await auth.deleteBanner(token, id);
                        setSuccessMsg("Banner deleted");
                        fetchBanners();
                    } catch (e) {
                        Alert.alert("Error", "Failed to delete banner");
                    }
                }
            }
        ]);
    };

    if (!user || user.role !== 'Admin') {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <Text style={{ fontSize: 18, color: theme.text }}>Admin Access Only</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Admin Dashboard</Text>
                <Text style={{ color: theme.icon }}>Manage app-wide settings and content.</Text>
            </View>

            {/* Quick Actions */}
            <View style={[styles.section, { backgroundColor: theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
                
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => (navigation as any).navigate('ManageResources')}
                >
                    <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                        <Ionicons name="library" size={24} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.actionTitle, { color: theme.text }]}>Manage Resources</Text>
                        <Text style={{ color: theme.icon, fontSize: 12 }}>Update student resource links</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.icon} />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border, marginTop: 12 }]}
                    onPress={() => (navigation as any).navigate('SupportAdmin')}
                >
                    <View style={[styles.iconBox, { backgroundColor: '#0284C720' }]}>
                        <Ionicons name="chatbubbles" size={24} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.actionTitle, { color: theme.text }]}>Support Inquiries</Text>
                        <Text style={{ color: theme.icon, fontSize: 12 }}>Reply to student help requests</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.icon} />
                </TouchableOpacity>
            </View>

            {/* Banner Management */}
            <View style={[styles.section, { backgroundColor: theme.surface }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Home Banners</Text>
                    <TouchableOpacity onPress={() => setShowBannerForm(!showBannerForm)}>
                        <Ionicons name={showBannerForm ? "chevron-up" : "add-circle"} size={26} color={theme.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: showBannerForm ? 20 : 0 }}>
                    {banners.map(b => (
                        <View key={b._id} style={{ marginRight: 10, width: 140 }}>
                            <Image source={{ uri: b.imageUrl }} style={{ width: 140, height: 80, borderRadius: 8 }} />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={styles.bannerOverlay}
                            >
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#FFF' }} numberOfLines={1}>{b.title}</Text>
                            </LinearGradient>
                            
                            <TouchableOpacity onPress={() => handleDeleteBanner(b._id)} style={[styles.bannerAction, { top: 4, right: 4 }]}>
                                <Ionicons name="trash" size={12} color="#EF4444" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleEditBanner(b)} style={[styles.bannerAction, { top: 4, left: 4 }]}>
                                <Ionicons name="create" size={12} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {banners.length === 0 && !showBannerForm && <Text style={{ color: theme.icon, fontSize: 13 }}>No active banners.</Text>}
                </ScrollView>

                {showBannerForm && (
                    <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 }}>
                        <Text style={[styles.label, { color: theme.text }]}>{editingBannerId ? 'Update Banner' : 'New Banner Details'}</Text>
                        
                        <TouchableOpacity onPress={pickBannerImage} style={[styles.imagePicker, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            {bannerImage ? (
                                <Image source={{ uri: bannerImage }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Ionicons name="image-outline" size={30} color={theme.icon} />
                                    <Text style={{ color: theme.icon, marginTop: 8 }}>Select Image</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TextInput 
                            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                            placeholder="Title"
                            placeholderTextColor={theme.icon}
                            value={bannerTitle}
                            onChangeText={setBannerTitle}
                        />
                        <TextInput 
                            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                            placeholder="Subtitle (Optional)"
                            placeholderTextColor={theme.icon}
                            value={bannerSubtitle}
                            onChangeText={setBannerSubtitle}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            {editingBannerId && (
                                <TouchableOpacity 
                                    onPress={() => {
                                        setEditingBannerId(null);
                                        setBannerTitle('');
                                        setBannerSubtitle('');
                                        setBannerImage(null);
                                        setShowBannerForm(false);
                                    }}
                                    style={[styles.btn, { backgroundColor: theme.background, flex: 1, borderWidth: 1, borderColor: theme.border }]}
                                >
                                    <Text style={{ color: theme.text }}>Cancel</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                onPress={handleCreateBanner}
                                disabled={bannerLoading}
                                style={[styles.btn, { backgroundColor: theme.primary, flex: 2 }]}
                            >
                                {bannerLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>{editingBannerId ? 'Update' : 'Upload'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>



            {/* Success Toast */}
            {successMsg && (
                <View style={styles.toast}>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{successMsg}</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
    section: { padding: 20, borderRadius: 16, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    actionTitle: { fontSize: 16, fontWeight: 'bold' },
    
    bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, justifyContent: 'flex-end', padding: 4 },
    bannerAction: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 12 },
    
    imagePicker: { height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderStyle: 'dashed' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
    btn: { padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    
    toast: { 
        position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: '#10B981', 
        padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, 
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5
    }
});
