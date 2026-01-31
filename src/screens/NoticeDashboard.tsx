import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export default function NoticeDashboardScreen() {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const { user, token } = useAuth();
  const navigation = useNavigation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetScope, setTargetScope] = useState<'section' | 'semester' | 'department'>('section');
  const [priority, setPriority] = useState('Medium');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [myNotices, setMyNotices] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modern UI States
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchMyNotices = async () => {
      if (token && user?.id) {
          try {
              if (myNotices.length === 0) setInitialLoading(true);
              // Fetch ALL notices and filter them for current CR/Admin context
              const res = await auth.getAllNotices(token);
              if (res.data.success) {
                  const allNotices = res.data.data;
                  const relevantNotices = allNotices.filter((n: any) => {
                      const authorId = typeof n.postedBy === 'object' ? n.postedBy._id : n.postedBy;
                      
                      // 1. Created by me
                      if (authorId === user.id) return true;
                      
                      // 2. Admin can see all
                      if (user.role === 'Admin') return true;
                      
                      // 3. CR can see notices for their own section
                      const isSameDept = n.targetAudience?.department?.toLowerCase().replace(/\s/g, '') === user.department?.toLowerCase().replace(/\s/g, '');
                      const isSameSemester = n.targetAudience?.semester?.toString() === user.semester?.toString();
                      const isSameSection = n.targetAudience?.section?.toLowerCase() === user.section?.toLowerCase();
                      
                      if (user.role === 'CR' && isSameDept && isSameSemester && isSameSection) return true;
                      
                      return false;
                  });
                  setMyNotices(relevantNotices);
              }
          } catch (error) {
              console.log("Failed to fetch notices", error);
          } finally {
              setInitialLoading(false);
          }
      } else {
          setInitialLoading(false);
      }
  };

  useEffect(() => {
    fetchMyNotices();
  }, [token, user]);

  // Clear success message after 3 seconds
  useEffect(() => {
      if (successMsg) {
          const timer = setTimeout(() => setSuccessMsg(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [successMsg]);

  const resetForm = () => {
      setTitle('');
      setContent('');
      setPriority('Medium');
      setTargetScope('section');
      setEditingId(null);
      setShowForm(false);
  };

  const handlePostNotice = async () => {
    if (!title.trim() || !content.trim()) {
        Alert.alert("Error", "Please fill in all fields");
        return;
    }

    if (!token) return;

    setLoading(true);
    try {
        const payload = { title, content, priority, targetScope };
        let res;
        if (editingId) {
            res = await auth.updateNotice(token, editingId, payload);
        } else {
            res = await auth.createNotice(token, payload);
        }
        
        if (res.data.success) {
            setSuccessMsg(`Notice ${editingId ? 'updated' : 'posted'} successfully!`);
            resetForm();
            await fetchMyNotices(); 
        }
    } catch (error: any) {
        Alert.alert("Error", error.response?.data?.error || "Failed to post notice");
    } finally {
        setLoading(false);
    }
  };

  const handleEdit = (notice: any) => {
      setTitle(notice.title);
      setContent(notice.content);
      setPriority(notice.priority || 'Medium');
      // Infer scope
      if (notice.targetAudience?.section) setTargetScope('section');
      else if (notice.targetAudience?.semester) setTargetScope('semester');
      else setTargetScope('department');
      
      setEditingId(notice._id);
      setShowForm(true);
  };

  const handleToggleStatus = async (notice: any) => {
      if (!token) return;
      try {
          await auth.updateNotice(token, notice._id, { isActive: !notice.isActive });
          fetchMyNotices(); 
      } catch (error) {
          Alert.alert("Error", "Failed to update status");
      }
  };

  const handleDelete = (id: string) => {
      setNoticeToDelete(id);
      setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
      if (!noticeToDelete || !token) return;
      try {
          await auth.deleteNotice(token, noticeToDelete);
          setSuccessMsg("Notice deleted successfully");
          fetchMyNotices();
      } catch (error) {
          Alert.alert("Error", "Failed to delete notice");
      } finally {
          setDeleteModalVisible(false);
          setNoticeToDelete(null);
      }
  };
  
  // RENDER
  if (!user || (user.role !== 'CR' && user.role !== 'Admin')) {
       return (
        <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
             <Text style={[styles.permissionTitle, { color: theme.text }]}>Access Denied</Text>
        </View>
       );
  }

  const activeNotices = myNotices.filter(n => n.isActive === true || n.isActive === undefined);
  const inactiveNotices = myNotices.filter(n => n.isActive === false);
  
  const canManage = (notice: any) => {
      if (!notice.postedBy) return false;
      const noticeAuthorId = typeof notice.postedBy === 'object' ? notice.postedBy._id : notice.postedBy;
      
      // Owner or Admin always can manage
      if (noticeAuthorId === user.id || user.role === 'Admin') return true;

      // CR can manage notices for their own specific section
      const isSameDept = notice.targetAudience?.department?.toLowerCase().replace(/\s/g, '') === user.department?.toLowerCase().replace(/\s/g, '');
      const isSameSemester = notice.targetAudience?.semester?.toString() === user.semester?.toString();
      const isSameSection = notice.targetAudience?.section?.toLowerCase() === user.section?.toLowerCase();

      if (user.role === 'CR' && isSameDept && isSameSemester && isSameSection) {
          return true;
      }
      
      return false;
  };
  
  const renderNoticeItem = (notice: any) => {
      const isOwner = canManage(notice);
      const isHigh = notice.priority === 'High';
      return (
      <View key={notice._id} style={[styles.card, { 
          backgroundColor: theme.surface, 
          // Modern Shadow
          shadowColor: theme.text,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3,
          borderWidth: 0, // Remove border for cleaner look
          marginBottom: 16 
      }]}>
          <View style={styles.cardHeader}>
              <View style={{flex: 1}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{notice.title}</Text>
                      <View style={{ 
                          backgroundColor: isHigh ? '#FEE2E2' : notice.priority === 'Medium' ? '#FEF3C7' : '#DBEAFE', 
                          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 
                      }}>
                          <Text style={{ 
                              fontSize: 10, 
                              color: isHigh ? '#EF4444' : notice.priority === 'Medium' ? '#D97706' : '#1E40AF', 
                              fontWeight: '700',
                              textTransform: 'uppercase'
                          }}>{notice.priority || 'MEDIUM'}</Text>
                      </View>
                  </View>
                   <Text style={{ fontSize: 12, color: theme.icon, marginTop: 4 }}>
                       {new Date(notice.createdAt).toLocaleDateString(undefined, {  month: 'short', day: 'numeric', year: 'numeric' })}
                   </Text>
              </View>
          </View>
          
          <Text style={[styles.previewContent, { color: theme.text, marginTop: 12, lineHeight: 22, opacity: 0.9 }]} numberOfLines={3}>{notice.content}</Text>
          
           {isOwner && (
            <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'flex-end', 
                marginTop: 16, 
                paddingTop: 12, 
                borderTopWidth: 1, 
                borderTopColor: theme.border, 
                gap: 16 
            }}>
                <TouchableOpacity onPress={() => handleEdit(notice)} style={{flexDirection:'row', alignItems:'center', gap:4}}>
                    <Ionicons name="create-outline" size={16} color={theme.primary} />
                    <Text style={{color: theme.primary, fontSize: 13, fontWeight: '600'}}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleToggleStatus(notice)} style={{flexDirection:'row', alignItems:'center', gap:4}}>
                    <Ionicons name={notice.isActive ? "eye-off-outline" : "eye-outline"} size={16} color={'#F59E0B'} />
                    <Text style={{color: '#F59E0B', fontSize: 13, fontWeight: '600'}}>{notice.isActive ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(notice._id)} style={{flexDirection:'row', alignItems:'center', gap:4}}>
                    <Ionicons name="trash-outline" size={16} color={'#EF4444'} />
                    <Text style={{color: '#EF4444', fontSize: 13, fontWeight: '600'}}>Delete</Text>
                </TouchableOpacity>
            </View>
           )}
      </View>
      );
  };

  return (
    <View style={{flex: 1}}>
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={{flex: 1}}>
             <Text style={[styles.welcomeText, { color: theme.icon }]}>Section Dashboard</Text>
             <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.badgeText, { color: '#1E40AF' }]}>CR PANEL</Text>
        </View>
      </View>

      <View style={[styles.sectionInfo, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Target Audience: {user.department} {user.batch} ({user.section})</Text>
      </View>

      {!showForm && (
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.addNoticeButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowForm(true)}
          >
              <View style={styles.addIconCircle}>
                 <Ionicons name="add" size={20} color="white" />
              </View>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 }}>Create New Notice</Text>
          </TouchableOpacity>
      )}

      <Modal
          visible={showForm}
          animationType="slide"
          transparent={true}
          onRequestClose={resetForm}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                  <View style={styles.modalHeader}>
                      <View>
                          <Text style={[styles.formHeader, { color: theme.text }]}>{editingId ? 'Edit Broadcast' : 'New Broadcast'}</Text>
                          <Text style={{ color: theme.icon, fontSize: 12 }}>Section-wide Communication HUD</Text>
                      </View>
                      <TouchableOpacity onPress={resetForm} style={[styles.closeModalBtn, { backgroundColor: theme.background }]}>
                          <Ionicons name="close" size={24} color={theme.text} />
                      </TouchableOpacity>
                  </View>
                  
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
                      <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: theme.text }]}>Title</Text>
                          <TextInput 
                              style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                              placeholder="e.g. Class Rescheduled"
                              placeholderTextColor={theme.icon}
                              value={title}
                              onChangeText={setTitle}
                          />
                      </View>

                       <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: theme.text }]}>Target Scope</Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                              {['section', 'semester', 'department'].map((s) => (
                                  <TouchableOpacity
                                      key={s}
                                      onPress={() => setTargetScope(s as any)}
                                      style={{
                                          flex: 1,
                                          paddingVertical: 10,
                                          borderRadius: 10,
                                          backgroundColor: targetScope === s ? theme.primary : theme.background,
                                          borderWidth: 1,
                                          borderColor: targetScope === s ? 'transparent' : theme.border,
                                          alignItems: 'center'
                                      }}
                                  >
                                      <Text style={{ 
                                          color: targetScope === s ? '#fff' : theme.text, 
                                          fontWeight: '800',
                                          fontSize: 11,
                                          textTransform: 'uppercase' 
                                      }}>{s === 'section' ? `Sec ${user?.section}` : s}</Text>
                                  </TouchableOpacity>
                              ))}
                          </View>
                      </View>

                      <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: theme.text }]}>Content</Text>
                          <TextInput 
                              style={[styles.textArea, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                              placeholder="Write your message here..."
                              placeholderTextColor={theme.icon}
                              multiline
                              value={content}
                              onChangeText={setContent}
                          />
                      </View>

                      <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: theme.text }]}>Priority Level</Text>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                              {['Low', 'Medium', 'High'].map((p) => (
                                  <TouchableOpacity
                                      key={p}
                                      onPress={() => setPriority(p)}
                                      style={{
                                          flex: 1,
                                          paddingVertical: 10,
                                          borderRadius: 10,
                                          backgroundColor: priority === p ? (p === 'High' ? '#EF4444' : p === 'Medium' ? '#F59E0B' : '#3B82F6') : theme.background,
                                          borderWidth: 1,
                                          borderColor: priority === p ? 'transparent' : theme.border,
                                          alignItems: 'center'
                                      }}
                                  >
                                      <Text style={{ color: priority === p ? '#fff' : theme.text, fontWeight: '800', fontSize: 13 }}>{p}</Text>
                                  </TouchableOpacity>
                              ))}
                          </View>
                      </View>
                  </ScrollView>

                  <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                      <TouchableOpacity 
                         style={[styles.postButton, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
                         onPress={handlePostNotice}
                         disabled={loading}
                      >
                         {loading ? <ActivityIndicator color="#fff" /> : (
                             <>
                                <Ionicons name="rocket-outline" size={20} color="#fff" />
                                <Text style={styles.postButtonText}>{editingId ? 'Update Notice' : 'Publish Notice'}</Text>
                             </>
                         )}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

      {/* List */}
      <View style={{ padding: 20, paddingBottom: 100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
             <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: theme.primary }} />
             <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>Management History</Text>
          </View>
          
          {initialLoading ? (
               <View style={{ padding: 40, alignItems: 'center' }}>
                   <ActivityIndicator color={theme.primary} size="large" />
                   <Text style={{ color: theme.icon, marginTop: 12, fontWeight: '700', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>Syncing Broadcasts...</Text>
               </View>
          ) : myNotices.length === 0 ? (
              <View style={[styles.emptyState, { borderColor: theme.border }]}>
                  <Ionicons name="documents-outline" size={40} color={theme.icon} style={{ opacity: 0.5, marginBottom: 16 }} />
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>No notices found</Text>
                  <Text style={{ color: theme.icon, fontSize: 13, textAlign: 'center', marginTop: 4, opacity: 0.7 }}>
                      Notices you create or those relevant to your section will appear here.
                  </Text>
              </View>
          ) : (
              <>
                {activeNotices.map(renderNoticeItem)}
                {inactiveNotices.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 16 }}>
                        <Text style={{ color: theme.icon, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Archived / Inactive</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                    </View>
                )}
                {inactiveNotices.map(renderNoticeItem)}
              </>
          )}
      </View>
    </ScrollView>

    {/* Modern Delete Confirmation Modal */}
    <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
    >
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20}}>
            <View style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center' }}>
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <Ionicons name="trash" size={24} color="#EF4444" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>Delete Notice?</Text>
                <Text style={{ fontSize: 14, color: theme.icon, textAlign: 'center', marginBottom: 24 }}>This action cannot be undone. Are you sure you want to proceed?</Text>
                
                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                    <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: theme.background, alignItems: 'center' }}>
                        <Text style={{ color: theme.text, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmDelete} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>

    {/* Success Toast / Message */}
    {successMsg && (
        <View style={{ 
            position: 'absolute', 
            top: 50, 
            left: 20, 
            right: 20, 
            backgroundColor: '#10B981', 
            padding: 16, 
            borderRadius: 12, 
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            zIndex: 100
        }}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{successMsg}</Text>
        </View>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24, flex: 1 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  permissionTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  permissionText: { fontSize: 16, textAlign: 'center', lineHeight: 24, opacity: 0.7 },
  
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  welcomeText: { fontSize: 14 },
  userName: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },

  sectionInfo: { margin: 20, marginTop: 0, padding: 16, borderRadius: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, opacity: 0.5, textTransform: 'uppercase' },
  targetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  targetChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  hint: { fontSize: 12, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  closeModalBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  formScroll: { paddingBottom: 40 },
  modalFooter: { paddingTop: 16, borderTopWidth: 1, marginTop: 10 },
  
  formHeader: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 },
  input: { padding: 16, borderRadius: 16, borderWidth: 1, fontSize: 16, fontWeight: '600' },
  textArea: { padding: 16, borderRadius: 16, borderWidth: 1, fontSize: 16, fontWeight: '600', minHeight: 180, textAlignVertical: 'top' },
  postButton: { flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 18 },
  postButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  addNoticeButton: {
    margin: 20,
    marginTop: 0,
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  addIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center'
  },
  
  sectionHeaderTitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  emptyState: { padding: 30, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },

  previewHeader: { fontSize: 12, fontWeight: 'bold', marginBottom: 12, opacity: 0.5, letterSpacing: 1 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardDate: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginBottom: 12 },
  previewContent: { fontSize: 14, lineHeight: 20 },
});
