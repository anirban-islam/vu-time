import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Image, Linking, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Layout } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';

export default function SettingsScreen() {
  const { isDark, toggleTheme } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const { logout, user, token, updateUser } = useAuth();
  const navigation = useNavigation<any>();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [developer, setDeveloper] = useState<any>(null);

  useEffect(() => {
    // Fetch Developer Info
    auth.getDeveloperProfile().then(res => {
         if(res.data.success) setDeveloper(res.data.data);
    }).catch(e => console.log(e));

    if (token) {
        auth.getProfile(token).then(res => {
            if (res.data.success) {
                updateUser(res.data.user);
            }
        }).catch(err => console.log('Profile refresh failed', err));
    }
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const [showCRModal, setShowCRModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const handleRequestCRAccess = () => {
    // Quick client-side check for profile completion
    const missing = [];
    if (!user.name) missing.push('Name');
    if (!user.studentId) missing.push('Student ID');
    if (!user.department) missing.push('Department');
    if (!user.batch) missing.push('Batch');
    if (!user.semester) missing.push('Semester');
    if (!user.section) missing.push('Section');
    if (!user.contact) missing.push('Contact');
    if (!user.avatar) missing.push('Profile Picture');

    if (missing.length > 0) {
        setMissingFields(missing);
        setShowIncompleteModal(true);
        return;
    }
    
    setShowCRModal(true);
  };

  const submitCRRequest = async () => {
    if (!token) return;
    setRequestLoading(true);
    try {
        const res = await auth.requestCRAccess(token);
        if (res.data.success) {
            setShowCRModal(false);
            Alert.alert("Success", "Your request has been submitted. An admin will review it shortly.");
            // Refresh profile to show pending status
            const profileRes = await auth.getProfile(token);
            if (profileRes.data.success) {
                updateUser(profileRes.data.user);
            }
        }
    } catch (error: any) {
        const msg = error.response?.data?.error || "Failed to submit request";
        Alert.alert("Error", msg);
    } finally {
        setRequestLoading(false);
    }
  };

  const renderSectionHeader = (title: string, rightElement?: React.ReactNode) => (
    <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeader, { color: theme.text }]}>{title}</Text>
        {rightElement}
    </View>
  );

  const renderItem = (icon: any, title: string, subtitle?: string, rightElement?: React.ReactNode, onPress?: () => void, isDestructive = false, colorOverride?: string) => (
    <TouchableOpacity 
      style={[styles.item, { backgroundColor: theme.surface }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colorOverride ? colorOverride + '15' : (isDestructive ? '#FEE2E2' : theme.background) }]}>
          <Ionicons name={icon} size={20} color={colorOverride ? colorOverride : (isDestructive ? '#EF4444' : theme.icon)} />
        </View>
        <View style={{ flex: 1 }}>
             <Text style={[styles.itemTitle, { color: isDestructive ? '#EF4444' : theme.text }]}>{title}</Text>
             {subtitle && <Text style={[styles.itemSubtitle, { color: theme.icon }]} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      
      {/* Title Header */}
      <View style={{ marginBottom: 24, marginTop: 10 }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: theme.text }}>Settings</Text>
      </View>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
        <Image source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random` }} style={styles.avatar} />
        <View style={styles.profileInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.userName, { color: theme.text }]}>{user?.name}</Text>
                {user?.isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                )}
            </View>
            <Text style={[styles.userEmail, { color: theme.icon }]}>{user?.email}</Text>
        </View>
        <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: theme.background }]}
            onPress={() => navigation.navigate('Profile')}
        >
            <Ionicons name="pencil" size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        {renderSectionHeader("Account")}
        <View style={styles.sectionBody}>
             {/* CR Request - Only for Students */}
             {user?.role === 'Student' && (
                renderItem(
                    "shield-checkmark", 
                    "Request CR Access", 
                    user?.crRequestStatus === 'Pending' ? "Request Pending Review" : "Apply to be Class Representative",
                    user?.crRequestStatus === 'Pending' ? 
                        <Text style={{color: '#F59E0B', fontWeight: '600', fontSize: 13}}>Pending</Text> :
                        <Ionicons name="chevron-forward" size={20} color={theme.icon} />,
                    user?.crRequestStatus === 'Pending' ? undefined : handleRequestCRAccess,
                    false,
                    "#8B5CF6"
                )
             )}
             {/* Link to Profile Editing as a backup */}
             {renderItem(
                "person", 
                "Personal Information", 
                "Edit details & bio",
                <Ionicons name="chevron-forward" size={20} color={theme.icon} />,
                () => navigation.navigate("Profile")
             )}
        </View>
      </View>

      {/* Admin / CR Access Section */}
      <View style={styles.section}>
        {renderSectionHeader("Dashboards")}
        <View style={[styles.sectionBody, { overflow: 'hidden' }]}>
            {user?.role === 'Admin' && renderItem(
                "shield", 
                "Admin Dashboard", 
                "Manage app content & settings",
                <Ionicons name="chevron-forward" size={20} color={theme.icon} />,
                () => navigation.navigate("AdminDashboard"),
                false,
                "#EF4444"
            )}
            {(user?.role === 'CR' || user?.role === 'Admin') && renderItem(
                "megaphone", 
                "CR Dashboard", 
                "Manage notices & updates",
                <Ionicons name="chevron-forward" size={20} color={theme.icon} />,
                () => navigation.navigate("NoticeDashboard"),
                false,
                "#F59E0B"
            )}
            {renderItem(
                "school", 
                "Student Dashboard", 
                "Academic progress & resources",
                <Ionicons name="chevron-forward" size={20} color={theme.icon} />,
                () => navigation.navigate("StudentDashboard"),
                false,
                theme.primary
            )}
            {renderItem(
                "library", 
                "Student Resources", 
                "Links & Materials",
                <Ionicons name="chevron-forward" size={20} color={theme.icon} />,
                () => navigation.navigate("Resources"),
                false,
                "#3B82F6"
            )}
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        {renderSectionHeader("Preferences")}
        <View style={styles.sectionBody}>
          {renderItem(
            isDark ? "moon" : "sunny",
            "Dark Mode",
            isDark ? "Dark mode is on" : "Light mode is on",
            <Switch 
                value={isDark} 
                onValueChange={toggleTheme} 
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor={isDark ? '#fff' : '#f4f3f4'}
            />,
            () => toggleTheme()
          )}
          {renderItem(
            "notifications",
            "Notifications",
            notificationsEnabled ? "Enabled" : "Disabled",
            <Switch 
                value={notificationsEnabled} 
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />,
            () => setNotificationsEnabled(!notificationsEnabled)
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionBody}>
            {renderItem("log-out", "Log Out", undefined, null, handleLogout, true)}
        </View>
      </View>

      {/* Developer Card in Settings - Only if backend loaded */}
      {developer && (
        <View style={{ marginBottom: 30 }}>
            <Text style={[styles.sectionHeader, { color: theme.text, marginBottom: 12, textAlign: 'center', opacity: 0.5 }]}>Developed By</Text>
            <View style={{ 
                backgroundColor: theme.surface, 
                borderRadius: Layout.radius.xl,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: 'hidden',
                shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.05, shadowRadius:8, elevation: 3
            }}>
                <View style={{ height: 60, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 2, opacity: 0.9}}>MASTERMIND BEHIND VUTIME</Text>
                </View>

                <View style={{ padding: 20, marginTop: -30, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ 
                        width: 60, height: 60, borderRadius: 30, overflow: 'hidden', 
                        borderWidth: 3, borderColor: theme.surface, backgroundColor: '#fff'
                    }}>
                         <Image 
                            source={developer.avatarUrl ? { uri: developer.avatarUrl } : require('../../assets/images/logo.png')} 
                            style={{ width: 60, height: 60, resizeMode: 'cover' }} 
                        />
                    </View>
                    <View style={{ flex: 1, marginTop: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{developer.name}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: theme.primary }}>{developer.role}</Text>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                     <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                        {developer.socials?.github && (
                            <TouchableOpacity onPress={() => Linking.openURL(developer.socials.github)} style={{ padding: 8, backgroundColor: '#24292E', borderRadius: 20 }}>
                                <Ionicons name="logo-github" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}
                        {developer.socials?.linkedin && (
                            <TouchableOpacity onPress={() => Linking.openURL(developer.socials.linkedin)} style={{ padding: 8, backgroundColor: '#0077B5', borderRadius: 20 }}>
                                <Ionicons name="logo-linkedin" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}
                        {developer.socials?.facebook && (
                            <TouchableOpacity onPress={() => Linking.openURL(developer.socials.facebook)} style={{ padding: 8, backgroundColor: '#1877F2', borderRadius: 20 }}>
                                <Ionicons name="logo-facebook" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}
                         {developer.socials?.website && (
                            <TouchableOpacity onPress={() => Linking.openURL(developer.socials.website)} style={{ padding: 8, backgroundColor: '#0EA5E9', borderRadius: 20 }}>
                                <Ionicons name="globe-outline" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}
                         {developer.socials?.email && (
                            <TouchableOpacity 
                                onPress={() => {
                                    const email = developer.socials?.email;
                                    if (email) {
                                        Linking.openURL(email.startsWith('mailto:') ? email : `mailto:${email}`);
                                    }
                                }} 
                                style={{ padding: 8, backgroundColor: '#EA4335', borderRadius: 20 }}
                            >
                                <Ionicons name="mail" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}
                     </View>
                </View>
            </View>
        </View>
      )}

      <Text style={[styles.version, { color: theme.icon }]}>VU Time v1.0.6 by Anirban_Islam</Text>
      <View style={{ height: 40 }} />

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <View style={[styles.modalIconContainer, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="log-out" size={32} color="#EF4444" />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Log Out</Text>
                <Text style={[styles.modalSubtitle, { color: theme.icon }]}>
                    Are you sure you want to log out? You will need to sign in again to access your account.
                </Text>

                <View style={styles.modalActions}>
                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}
                        onPress={() => setShowLogoutModal(false)}
                    >
                        <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
                        onPress={confirmLogout}
                    >
                        <Text style={[styles.modalButtonText, { color: 'white' }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* CR Request Confirmation Modal */}
      <Modal
        visible={showCRModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCRModal(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface, width: '90%' }]}>
                <View style={[styles.modalIconContainer, { backgroundColor: '#F0F9FF', width: 80, height: 80, borderRadius: 40 }]}>
                    <Ionicons name="shield-checkmark" size={40} color="#0284C7" />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text, marginTop: 10 }]}>Become a CR</Text>
                <Text style={[styles.modalSubtitle, { color: theme.icon, marginBottom: 20 }]}>
                    Apply for Class Representative access for your section.
                </Text>

                <View style={[styles.infoBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.infoLabel, { color: theme.icon }]}>DETAILS TO BE SUBMITTED</Text>
                    <View style={styles.infoRow}><Text style={{color: theme.icon}}>Name:</Text><Text style={{color: theme.text, fontWeight: '600'}}>{user?.name}</Text></View>
                    <View style={styles.infoRow}><Text style={{color: theme.icon}}>ID:</Text><Text style={{color: theme.text, fontWeight: '600'}}>{user?.studentId}</Text></View>
                    <View style={styles.infoRow}><Text style={{color: theme.icon}}>Dept:</Text><Text style={{color: theme.text, fontWeight: '600'}}>{user?.department} ({user?.batch})</Text></View>
                    <View style={styles.infoRow}><Text style={{color: theme.icon}}>Class:</Text><Text style={{color: theme.text, fontWeight: '600'}}>{user?.semester} Sem / Sec {user?.section}</Text></View>
                </View>

                <View style={styles.modalActions}>
                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}
                        onPress={() => setShowCRModal(false)}
                        disabled={requestLoading}
                    >
                        <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: '#0284C7', opacity: requestLoading ? 0.7 : 1 }]}
                        onPress={submitCRRequest}
                        disabled={requestLoading}
                    >
                        {requestLoading ? 
                            <ActivityIndicator color="#fff" /> : 
                            <Text style={[styles.modalButtonText, { color: 'white' }]}>Submit App</Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Incomplete Profile Modal */}
      <Modal
        visible={showIncompleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIncompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <View style={[styles.modalIconContainer, { backgroundColor: '#FEF3C7', width: 70, height: 70, borderRadius: 35 }]}>
                    <Ionicons name="alert-circle" size={36} color="#D97706" />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text, marginTop: 8 }]}>Profile Incomplete</Text>
                <Text style={[styles.modalSubtitle, { color: theme.icon, marginBottom: 20 }]}>
                    To apply for CR access, your profile must be 100% complete.
                </Text>

                <View style={[styles.warningBox, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                    <Text style={[styles.warningTitle, { color: '#B45309' }]}>MISSING INFORMATION:</Text>
                    {missingFields.map((field, index) => (
                        <View key={index} style={styles.missingItemRow}>
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                            <Text style={{ color: '#92400E', fontWeight: '500' }}>{field}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.modalActions}>
                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}
                        onPress={() => setShowIncompleteModal(false)}
                    >
                        <Text style={[styles.modalButtonText, { color: theme.text }]}>Later</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: '#EA580C' }]}
                        onPress={() => {
                            setShowIncompleteModal(false);
                            navigation.navigate('Profile');
                        }}
                    >
                        <Text style={[styles.modalButtonText, { color: 'white' }]}>Complete Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.pagePadding },
  
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.l,
    borderRadius: Layout.radius.l,
    marginBottom: Spacing.xxl,
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eee' },
  profileInfo: { flex: 1, marginLeft: Spacing.l },
  userName: { fontSize: 18, fontWeight: '700' },
  userEmail: { fontSize: 14, marginTop: 2 },
  editButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  section: { marginBottom: Spacing.xxl },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.s, paddingHorizontal: 4 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionBody: { borderRadius: Layout.radius.l, overflow: 'hidden' },
  
  // Chips / Grid (Unused but polished just in case)
  label: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  chipScroll: { marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 14, fontWeight: '600' },
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.m, flex: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '500' },
  itemSubtitle: { fontSize: 12, marginTop: 2, opacity: 0.7 },
  version: { textAlign: 'center', fontSize: 12, marginBottom: Spacing.xl, opacity: 0.5 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  modalContent: { 
    width: '100%', borderRadius: Layout.radius.xl, padding: Spacing.xxl, alignItems: 'center', 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 
  },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.l },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 15, textAlign: 'center', marginBottom: Spacing.xxl, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: Spacing.m, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: Layout.radius.m, justifyContent: 'center', alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '600' },

  // New CR Modal Styles
  infoBox: { width: '100%', padding: Spacing.l, borderRadius: Layout.radius.m, marginBottom: Spacing.xxl },
  infoLabel: { fontSize: 12, fontWeight: '700', marginBottom: 12, opacity: 0.5, letterSpacing: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },

  // Warning Modal Styles
  warningBox: { width: '100%', padding: Spacing.l, borderRadius: Layout.radius.m, borderWidth: 1, marginBottom: Spacing.xxl },
  warningTitle: { fontSize: 12, fontWeight: '700', marginBottom: 12, opacity: 0.9, letterSpacing: 1 },
  missingItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
});
