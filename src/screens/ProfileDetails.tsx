import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
    ActivityIndicator,
    Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';

const DEPARTMENTS = ['CSE'];

export default function ProfileDetailsScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const { logout, user, token, updateUser } = useAuth();
  
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [contact, setContact] = useState(user?.contact || '');
  const [role, setRole] = useState(user?.role || 'Student');
  const [loading, setLoading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Academic State
  const [dept, setDept] = useState(user?.department || '');
  const [sem, setSem] = useState(user?.semester || '');
  const [sec, setSec] = useState(user?.section || '');
  const [batch, setBatch] = useState(user?.batch || '');
  
  // Dynamic Options from API
  const [availableSems, setAvailableSems] = useState<string[]>([]);
  const [availableSecs, setAvailableSecs] = useState<string[]>([]);
  const [routineData, setRoutineData] = useState<any>(null);

  useEffect(() => {
    // Force refresh profile on mount to ensure we have the latest fields (like batch)
    const refreshProfile = async () => {
        if (token) {
            try {
                const res = await auth.getProfile(token);
                if (res.data.success) {
                    updateUser(res.data.user);
                }
            } catch (e) {
                console.log('Failed to background refresh profile', e);
            }
        }
    };
    refreshProfile();
  }, []);

  useEffect(() => {
    if (user) {
        setFullName(user.name || '');
        setStudentId(user.studentId || '');
        setContact(user.contact || '');
        setDept(user.department || '');
        setSem(user.semester || '');
        setSec(user.section || '');
        setProfileImage(user.avatar || null);
        setBatch(user.batch || '');
        setRole(user.role || 'Student');
    }
  }, [user]);

  useEffect(() => {
    if (routineData && sem) {
        extractSections(dept, sem);
    }
  }, [routineData, dept, sem]);


  useEffect(() => {
    fetchAcademicOptions();
  }, []);

  const fetchAcademicOptions = async () => {
    try {
        const response = await fetch('https://vutime-backend.vercel.app/api/routine');
        const json = await response.json();
        if (json && !json.error) {
            setRoutineData(json);
            updateAvailableSems(json, dept);
        }
    } catch (e) {
        console.error('Failed to fetch academic options', e);
    }
  };

  const updateAvailableSems = (data: any, selectedDept: string) => {
    const deptData = data[selectedDept] || {};
    const sems = Object.keys(deptData).sort();
    setAvailableSems(sems);
  };

  const extractSections = (selectedDept: string, selectedSem: string) => {
    const deptData = routineData[selectedDept];
    if (!deptData) {
        setAvailableSecs(['A']);
        return;
    }
    const semesterData = deptData[selectedSem];
    if (!semesterData) return;

    const sections = new Set<string>();
    sections.add('A'); 
    Object.keys(semesterData).forEach(day => {
        const classes = semesterData[day];
        if (Array.isArray(classes)) {
            classes.forEach((c: any) => {
                if (c.section && c.section !== 'N/A') sections.add(c.section);
            });
        }
    });
    const sortedSecs = Array.from(sections).sort();
    setAvailableSecs(sortedSecs);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your gallery to change the profile picture.');
        return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2, // Lower quality to ensure small size
      base64: true,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      if (result.assets[0].base64) {
          setBase64Image(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    }
  };

  const handleSave = async () => {
    if (!token) {
        console.error("No auth token found!");
        return;
    }
    setLoading(true);
    try {
        const updateData = {
            name: fullName,
            department: dept,
            semester: sem,
            section: sec,
            studentId,
            contact,
            role,
            avatar: base64Image || user?.avatar,
            batch
        };
        console.log("Updating profile with:", updateData);

        const response = await auth.updateProfile(token, updateData);
        console.log("Server response:", response.data);

        if (response.data.success) {
            await updateUser(response.data.user);
            setShowSuccessModal(true);
        }
    } catch (error: any) {
        Alert.alert("Error", error.response?.data?.error || "Failed to update profile");
    } finally {
        setLoading(false);
    }
  };

  const renderInput = (label: string, value: string, setValue: (text: string) => void, icon: any, placeholder: string, keyboardType: any = 'default', editable: boolean = true) => (
    <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border, opacity: editable ? 1 : 0.6 }]}>
            <Ionicons name={icon} size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder={placeholder}
                placeholderTextColor={theme.inputPlaceholder}
                value={value}
                onChangeText={setValue}
                keyboardType={keyboardType}
                editable={editable}
            />
        </View>
    </View>
  );

  const renderChip = (label: string, isSelected: boolean, onSelect?: () => void) => (
    <TouchableOpacity 
        key={label}
        onPress={onSelect}
        disabled={!onSelect}
        style={[
            styles.chip, 
            { 
                backgroundColor: isSelected ? theme.primary : theme.background, 
                borderColor: isSelected ? theme.primary : theme.border,
                opacity: onSelect ? 1 : 0.8
            }
        ]}
    >
        <Text style={[styles.chipText, { color: isSelected ? '#FFF' : theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ height: 20 }} />
        
        {/* Profile Picture Section */}
        <View style={styles.header}>
            <View style={[styles.avatarContainer, { borderColor: theme.primary, backgroundColor: theme.surface }]}>
                 {profileImage || user?.avatar ? (
                    <Image source={{ uri: profileImage || user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'S')}&background=random` }} style={styles.avatarImage} />
                 ) : (
                    <Ionicons name="person" size={50} color={theme.icon} /> 
                 )}
                
                <TouchableOpacity 
                    style={[styles.editBadge, { backgroundColor: theme.primary }]}
                    onPress={pickImage}
                >
                    <Ionicons name="camera" size={14} color="white" />
                </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.title, { color: theme.text }]}>{user?.name}</Text>
                {user?.isVerified && (
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                )}
            </View>
            <Text style={[styles.subtitle, { color: theme.icon }]}>{user?.email}</Text>
        </View>

        <Animated.View entering={FadeInDown.duration(600).springify()}>
            
            {/* Basic Information Section */}
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="person-circle-outline" size={22} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.primary }]}>Personal Details</Text>
                </View>
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {renderInput("Full Name", fullName, setFullName, "person-outline", "Enter your full name")}
                    {renderInput("Student ID", studentId, setStudentId, "card-outline", "Ex: 181010...", "numeric")}
                    {renderInput("Email", email, setEmail, "mail-outline", "student@example.com", "email-address", false)}
                    {renderInput("Contact", contact, setContact, "call-outline", "+880 1XXX...", "phone-pad")}
                    {renderInput("Batch", batch, setBatch, "people-outline", "e.g. 35th")}
                </View>
            </View>

            {/* Status Section */}
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.primary }]}>Account Status</Text>
                </View>
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.innerLabel, { color: theme.icon }]}>Current Role</Text>
                    <View style={styles.sectionGrid}>
                        {renderChip(role, true)}
                    </View>
                </View>
            </View>

            {/* Academic Information Section */}
            <View style={styles.sectionContainer}>
                 <View style={styles.sectionHeader}>
                    <Ionicons name="school-outline" size={22} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.primary }]}>Academic Selection</Text>
                </View>
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.innerLabel, { color: theme.icon }]}>Department</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {DEPARTMENTS.map(d => renderChip(d, dept === d, () => {
                            setDept(d);
                            if (routineData) updateAvailableSems(routineData, d);
                        }))}
                    </ScrollView>

                    <Text style={[styles.innerLabel, { color: theme.icon, marginTop: 12 }]}>Semester</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {availableSems.length > 0 ? (
                            availableSems.map(s => renderChip(s, sem === s, () => setSem(s)))
                        ) : (
                            <Text style={{ color: theme.icon, fontSize: 12, fontStyle: 'italic' }}>No data for this department yet</Text>
                        )}
                    </ScrollView>

                    <Text style={[styles.innerLabel, { color: theme.icon, marginTop: 12 }]}>Section</Text>
                    <View style={styles.sectionGrid}>
                        {availableSecs.map(s => renderChip(s, sec === s, () => setSec(s)))}
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actionContainer}>
                <TouchableOpacity 
                    style={[styles.saveButton, { backgroundColor: theme.primary }]} 
                    onPress={handleSave}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Profile</Text>}
                </TouchableOpacity>

            </View>

        </Animated.View>
        
        {/* Completion Modal */}
        <Modal
            visible={showCompletionModal}
            transparent
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <Animated.View 
                    entering={FadeInDown.springify().duration(500)}
                    style={[styles.modalContent, { backgroundColor: theme.surface }]}
                >
                    <View style={[styles.modalIconContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name="school" size={40} color={theme.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Complete Your Profile</Text>
                    <Text style={[styles.modalSubtitle, { color: theme.icon }]}>
                        Welcome to VUTime! Please select your Department, Semester, and Section so we can show you the right routine.
                    </Text>
                    
                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: theme.primary }]}
                        onPress={() => setShowCompletionModal(false)}
                    >
                        <Text style={styles.modalButtonText}>Let's Go!</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>

        {/* Success Modal */}
        <Modal
            visible={showSuccessModal}
            transparent
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <Animated.View 
                    entering={FadeInDown.springify().duration(500)}
                    style={[styles.modalContent, { backgroundColor: theme.surface }]}
                >
                    <View style={[styles.modalIconContainer, { backgroundColor: '#10B98120' }]}>
                        <Ionicons name="checkmark-circle" size={50} color="#10B981" />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Update Successful!</Text>
                    <Text style={[styles.modalSubtitle, { color: theme.icon }]}>
                        Your profile information and avatar have been saved securely.
                    </Text>
                    
                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: '#10B981' }]}
                        onPress={() => setShowSuccessModal(false)}
                    >
                        <Text style={styles.modalButtonText}>Great!</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>

        <View style={{ height: 40 }} /> 
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10, 
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48, // Slightly less than container radius (50) for border effect
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  innerLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
    opacity: 0.9,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  actionContainer: {
    marginTop: 8,
    gap: 16,
  },
  saveButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#c23f0c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    opacity: 0.8,
  },
  modalButton: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
