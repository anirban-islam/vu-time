import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, Linking, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import TeacherCard from '../components/TeacherCard';
import { auth } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleCall as handleCallUtil, openAppUrl } from '../utils/linking';

interface Teacher {
  id: string;
  initial: string;
  name: string;
  designation: string;
  department: string;
  university?: string;
  phone: string;
  email: string;
}

export default function TeacherScreen() {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const handleCall = (number: string) => handleCallUtil(number);
  const handleEmail = (email: string) => openAppUrl(`mailto:${email}`);

  useEffect(() => {
    loadCachedTeachers();
    fetchTeachers(true);
  }, []);

  const loadCachedTeachers = async () => {
    try {
        const cached = await AsyncStorage.getItem('cached_teachers');
        if (cached) setTeachers(JSON.parse(cached));
    } catch (e) {}
  };

  const fetchTeachers = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    try {
        const res = await auth.getTeachers();
        const data = res.data;
        if (Array.isArray(data)) {
            setTeachers(data);
            await AsyncStorage.setItem('cached_teachers', JSON.stringify(data));
        }
    } catch (error) {
        // Fail silently
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  // Filter teachers based on search
  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.initial.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Header Section */}
      <View style={styles.headerSection}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Faculty Directory</Text>
          <Text style={[styles.screenSub, { color: theme.icon }]}>{teachers.length} Verified Members</Text>
      </View>

      {/* Modern Search HUD */}
      <View style={[styles.searchWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.primary} />
          <TextInput 
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search faculty name or initial..."
              placeholderTextColor={theme.icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
          />
          {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.icon} />
              </TouchableOpacity>
          )}
      </View>

      {/* Teacher List */}
      <FlatList 
        data={filteredTeachers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchTeachers(false)} colors={[theme.primary]} tintColor={theme.primary} />
        }
        renderItem={({ item }) => (
            <TeacherCard 
                initial={item.initial}
                name={item.name}
                designation={item.designation}
                department={item.department}
                onPress={() => setSelectedTeacher(item)}
            />
        )}
        ListHeaderComponent={() => loading ? (
            <View style={{ marginTop: 100 }}>
               <ActivityIndicator size="large" color={theme.primary} />
               <Text style={[styles.loadingText, { color: theme.icon }]}>Synchronizing Faculty...</Text>
            </View>
        ) : null}
        ListEmptyComponent={
            !loading && (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconBox, { backgroundColor: theme.surface }]}>
                        <Ionicons name="people-outline" size={40} color={theme.icon} />
                    </View>
                    <Text style={[styles.emptyText, { color: theme.text }]}>No members found</Text>
                    <Text style={[styles.emptySub, { color: theme.icon }]}>Try searching with initials (e.g. AI)</Text>
                </View>
            )
        }
      />

      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedTeacher}
        onRequestClose={() => setSelectedTeacher(null)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                {selectedTeacher && (
                    <>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View />
                            <TouchableOpacity onPress={() => setSelectedTeacher(null)}>
                                <Ionicons name="close-circle" size={30} color={theme.icon} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.detailsScroll}>
                            
                            {/* Avatar & Name */}
                            <View style={styles.profileSection}>
                                <View style={[styles.largeAvatar, { backgroundColor: theme.primary + '20' }]}>
                                    <Text style={[styles.largeAvatarText, { color: theme.primary }]}>
                                        {selectedTeacher.initial}
                                    </Text>
                                </View>
                                <Text style={[styles.detailName, { color: theme.text }]}>{selectedTeacher.name}</Text>
                                <Text style={[styles.detailDesignation, { color: theme.primary }]}>{selectedTeacher.designation}</Text>
                                <Text style={[styles.detailUni, { color: theme.icon }]}>{selectedTeacher.university}</Text>
                            </View>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            {/* Contact Info */}
                            <View style={styles.infoSection}>
                                <TouchableOpacity 
                                    style={[styles.infoRow, { backgroundColor: theme.background }]}
                                    onPress={() => handleCall(selectedTeacher.phone)}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: '#10B981' + '15' }]}>
                                        <Ionicons name="call" size={20} color="#10B981" />
                                    </View>
                                    <View>
                                        <Text style={[styles.infoLabel, { color: theme.icon }]}>Mobile</Text>
                                        <Text style={[styles.infoValue, { color: theme.text }]}>{selectedTeacher.phone}</Text>
                                    </View>
                                </TouchableOpacity>

                                {selectedTeacher.email !== 'N/A' && (
                                    <TouchableOpacity 
                                        style={[styles.infoRow, { backgroundColor: theme.background }]}
                                        onPress={() => handleEmail(selectedTeacher.email)}
                                    >
                                        <View style={[styles.iconBox, { backgroundColor: '#3B82F6' + '15' }]}>
                                            <Ionicons name="mail" size={20} color="#3B82F6" />
                                        </View>
                                        <View>
                                            <Text style={[styles.infoLabel, { color: theme.icon }]}>Email</Text>
                                            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedTeacher.email}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                <View style={[styles.infoRow, { backgroundColor: theme.background }]}>
                                    <View style={[styles.iconBox, { backgroundColor: '#F59E0B' + '15' }]}>
                                        <Ionicons name="business" size={20} color="#F59E0B" />
                                    </View>
                                    <View>
                                        <Text style={[styles.infoLabel, { color: theme.icon }]}>Department</Text>
                                        <Text style={[styles.infoValue, { color: theme.text }]}>{selectedTeacher.department}</Text>
                                    </View>
                                </View>
                            </View>

                        </ScrollView>
                    </>
                )}
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
  screenTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  screenSub: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  searchWrapper: {
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600' },
  loadingText: { textAlign: 'center', marginTop: 16, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  emptySub: { fontSize: 14, fontWeight: '600', opacity: 0.5, marginTop: 4 },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  detailsScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  largeAvatarText: {
    fontSize: 42,
    fontWeight: '900',
  },
  detailName: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -1,
  },
  detailDesignation: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailUni: {
    fontSize: 14,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 20,
    width: '100%',
  },
  infoSection: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
    opacity: 0.8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '800',
  },
});

