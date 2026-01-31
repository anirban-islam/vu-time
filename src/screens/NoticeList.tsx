import React, { useEffect, useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    FlatList, 
    TouchableOpacity, 
    RefreshControl, 
    ActivityIndicator, 
    Platform, 
    Alert,
    Dimensions,
    ScrollView,
    Modal
} from 'react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/api';
import { APP_LOGO_BASE64 } from '../constants/Base64Assets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import DownloadModal from '../components/DownloadModal';

const { width } = Dimensions.get('window');

export default function NoticeListScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const { user, token, loadUser } = useAuth();
  const theme = Colors[isDark ? 'dark' : 'light'];

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notices, setNotices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'section' | 'semester' | 'department'>('section');
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  // Download Modal State
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [pendingDownloadItem, setPendingDownloadItem] = useState<any>(null);

  useEffect(() => {
    loadCachedNotices();
    fetchNotices();
  }, [user]);

  const loadCachedNotices = async () => {
    try {
        const cached = await AsyncStorage.getItem('cached_notices_full');
        if (cached) setNotices(JSON.parse(cached));
    } catch (e) {}
  };

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const activeToken = token;
      if (activeToken) {
        const res = await auth.getAllNotices(activeToken);
        if (res.data.success) {
          setNotices(res.data.data);
          await AsyncStorage.setItem('cached_notices_full', JSON.stringify(res.data.data));
        }
      }
    } catch (error) {
       // Fail silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const getFilteredNotices = () => {
    const normalize = (str?: string) => str?.toLowerCase().replace(/\s/g, '') || '';
    return notices.filter(item => {
        const itemSem = normalize(item.targetAudience?.semester);
        const itemDept = normalize(item.targetAudience?.department);
        const itemSec = normalize(item.targetAudience?.section);
        const userSem = normalize(user?.semester);
        const userDept = normalize(user?.department);
        const userSec = normalize(user?.section);

        if (item.type === 'global') return activeTab === 'department';
        if (activeTab === 'section') return itemSec && itemSec === userSec && itemSem === userSem && itemDept === userDept;
        if (activeTab === 'semester') return !itemSec && itemSem === userSem && itemDept === userDept;
        if (activeTab === 'department') return !itemSec && !itemSem && itemDept === userDept;
        return false;
    });
  };

  const handleDownloadPdf = (item: any) => {
    setPendingDownloadItem(item);
    setDownloadModalVisible(true);
  };

  const executeDownload = async (item: any) => {
    try {
        const logoSrc = APP_LOGO_BASE64;
        const postDate = new Date(item.createdAt);
        const role = item.postedBy?.role === 'CR' ? 'Class Rep' : item.postedBy?.role || 'Class Rep';

        const html = `
        <html>
            <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; color: #1f2937; padding: 40px; position: relative; }
                        .watermark { position: fixed; top: 50%; left: 50%; width: 550px; height: 550px; transform: translate(-50%, -50%) rotate(-35deg); opacity: 0.07; z-index: -1; object-fit: contain; }
                        .header { border-bottom: 3px solid #111827; padding-bottom: 20px; margin-bottom: 30px; flex-direction: row; display: flex; align-items: center; justify-content: space-between; }
                        .logo-container { width: 120px; height: 120px; }
                        .header-text { text-align: right; }
                        .official-title { font-size: 28px; font-weight: 900; color: #111827; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
                        .university-name { font-size: 16px; font-weight: 700; color: #6b7280; margin-top: 4px; }
                        .notice-container { background: #fff; padding: 20px; border-radius: 8px; }
                        .notice-id { font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 800; margin-bottom: 20px; }
                        .notice-title { font-size: 32px; font-weight: 900; color: #111827; margin-bottom: 10px; line-height: 1.2; border-left: 10px solid #111827; padding-left: 20px; }
                        .notice-meta { font-size: 13px; color: #4b5563; margin-bottom: 40px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; display: flex; justify-content: space-between; }
                        .content { font-size: 16px; line-height: 1.8; color: #374151; text-align: justify; min-height: 400px; white-space: pre-wrap; }
                        .footer { margin-top: 60px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; }
                        .signature { margin-top: 40px; text-align: center; border: 1px dashed #d1d5db; padding: 15px; border-radius: 8px; }
                        .sig-text { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
                    </style>
            </head>
            <body>
                <img class="watermark" src="${logoSrc}" />
                <div class="header">
                    <img class="logo-container" src="${logoSrc}" />
                    <div class="header-text">
                        <h1 class="official-title">Official Notice</h1>
                        <p class="university-name">Varendra University • VU Time System</p>
                    </div>
                </div>
                <div class="notice-container">
                    <p class="notice-id">Notice ID: ${item._id?.substring(0, 8).toUpperCase() || 'VT-2026-X'}</p>
                    <h2 class="notice-title">${item.title}</h2>
                    <div class="notice-meta">
                        <span><strong>Posted On:</strong> ${postDate.toLocaleDateString()}</span>
                        <span><strong>Authority:</strong> ${item.author} (${role})</span>
                    </div>
                    <div class="content">${item.content}</div>
                </div>
                <div class="footer">
                    <p style="font-size: 10px;">This is a digitally verified notice generated via VUTime Application. All rights reserved.</p>
                </div>
                    <div class="signature">
                        <p class="sig-text">This is a system-generated document. No manual signature is required.</p>
                    </div>
            </body>
        </html>`;
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const displayNotices = getFilteredNotices();

  const renderNoticeItem = ({ item, index }: { item: any, index: number }) => {
    const isHighPriority = item.priority === 'High';
    const postDate = new Date(item.createdAt);
    const isRecent = (new Date().getTime() - postDate.getTime()) < (24 * 60 * 60 * 1000); 

    return (
      <Animated.View key={item._id} entering={FadeInDown.delay(index * 100).duration(400)}>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setSelectedNotice(item)}
        >
          {isHighPriority && <LinearGradient colors={['#EF4444', '#EF444400']} start={{x:0, y:0}} end={{x:0, y:1}} style={styles.priorityBar} />}
          <View style={styles.cardHeader}>
              <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                  <View style={[styles.priorityBadge, { backgroundColor: isHighPriority ? '#FEE2E2' : item.priority === 'Medium' ? '#FEF3C7' : '#DBEAFE' }]}>
                    <Text style={[styles.priorityText, { color: isHighPriority ? '#DC2626' : item.priority === 'Medium' ? '#D97706' : '#2563EB' }]}>{item.priority}</Text>
                  </View>
                  {isRecent && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
              </View>
              <Text style={[styles.dateText, { color: theme.icon }]}>{postDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.cardContent, { color: theme.text }]} numberOfLines={2}>{item.content}</Text>
          <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Ionicons name="person-circle-outline" size={16} color={theme.icon} />
                  <Text style={[styles.authorText, { color: theme.icon }]}>{item.author}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.icon} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Dynamic Tab Header */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
            {['section', 'semester', 'department'].map((tab) => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab as any)} style={[styles.tab, activeTab === tab && { backgroundColor: theme.primary }]}>
                    <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : theme.icon }]}>{tab === 'section' ? 'Section' : tab === 'semester' ? 'Semester' : 'Dept'}</Text>
                </TouchableOpacity>
            ))}
        </View>
      </View>

      {loading && !refreshing ? (
          <View style={styles.center}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={[styles.loadingText, { color: theme.icon }]}>Synchronizing Board...</Text>
          </View>
      ) : (
          <FlatList
            data={displayNotices}
            keyExtractor={(item) => item._id}
            renderItem={renderNoticeItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                    <View style={styles.emptyIconBox}>
                        <Ionicons name="notifications-off-outline" size={40} color={theme.icon} />
                    </View>
                    <Text style={[styles.emptyText, { color: theme.text }]}>No {activeTab} notices</Text>
                    <Text style={[styles.emptySubText, { color: theme.icon }]}>Pull down to refresh or check other categories.</Text>
                </View>
            }
          />
      )}

      {/* Modern Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedNotice}
        onRequestClose={() => setSelectedNotice(null)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                {selectedNotice && (
                    <>
                        <View style={styles.modalHeader}>
                            <View>
                                <View style={[styles.priorityBadge, { backgroundColor: selectedNotice.priority === 'High' ? '#FEE2E2' : selectedNotice.priority === 'Medium' ? '#FEF3C7' : '#DBEAFE', alignSelf: 'flex-start', marginBottom: 4 }]}>
                                    <Text style={[styles.priorityText, { color: selectedNotice.priority === 'High' ? '#DC2626' : selectedNotice.priority === 'Medium' ? '#D97706' : '#2563EB' }]}>{selectedNotice.priority}</Text>
                                </View>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>Notice Detail</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedNotice(null)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                            <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedNotice.title}</Text>
                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="calendar-outline" size={14} color={theme.icon} />
                                    <Text style={[styles.metaText, { color: theme.icon }]}>{new Date(selectedNotice.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Ionicons name="person-outline" size={14} color={theme.icon} />
                                    <Text style={[styles.metaText, { color: theme.icon }]}>{selectedNotice.author}</Text>
                                </View>
                            </View>
                            
                            <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
                            
                            <Text style={[styles.detailText, { color: theme.text }]}>
                                {selectedNotice.content}
                            </Text>
                        </ScrollView>
                        
                        <LinearGradient colors={[theme.surface + '00', theme.surface]} style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={[styles.downloadButton, { backgroundColor: theme.primary }]}
                                onPress={() => handleDownloadPdf(selectedNotice)}
                            >
                                <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                                <Text style={styles.downloadText}>Download Official PDF</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </>
                )}
            </View>
        </View>
      </Modal>

      <DownloadModal 
        visible={downloadModalVisible}
        onClose={() => setDownloadModalVisible(false)}
        onConfirm={() => {
            if (pendingDownloadItem) {
                executeDownload(pendingDownloadItem);
            }
        }}
        title="Official Notice PDF"
        description={`Do you want to download "${pendingDownloadItem?.title || 'this notice'}" as a system-verified PDF?`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 },
  
  tabWrapper: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '800' },

  listContent: { padding: 20, paddingBottom: 50 },
  card: { borderRadius: 24, padding: 20, borderWidth: 1, overflow: 'hidden', position: 'relative', marginBottom: 16 },
  priorityBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  newBadge: { backgroundColor: '#F97316', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  dateText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  cardContent: { fontSize: 14, lineHeight: 20, opacity: 0.7, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  authorText: { fontSize: 12, fontWeight: '700' },

  emptyState: { padding: 40, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubText: { fontSize: 13, textAlign: 'center', opacity: 0.6, lineHeight: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  detailTitle: { fontSize: 22, fontWeight: '900', marginBottom: 16, lineHeight: 30 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '700' },
  modalDivider: { height: 1, marginBottom: 24 },
  detailText: { fontSize: 16, lineHeight: 26, opacity: 0.8 },
  modalFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 28, paddingTop: 40 },
  downloadButton: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  downloadText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
