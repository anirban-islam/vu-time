import React, { useEffect, useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    ScrollView, 
    TouchableOpacity, 
    RefreshControl, 
    ActivityIndicator, 
    Image, 
    Linking, 
    Share, 
    Dimensions,
    Alert
} from 'react-native';
import { Colors, Spacing, Layout } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeroSlider from '../components/HeroSlider';
import DownloadModal from '../components/DownloadModal';
import * as Print from 'expo-print';
import { APP_LOGO_BASE64 } from '../constants/Base64Assets';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { openAppUrl, handleCall, handleWhatsApp } from '../utils/linking';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { isDark } = useTheme();
  const { user, loadUser, token } = useAuth();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const navigation: any = useNavigation();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notices, setNotices] = useState<any[]>([]);
  const [crs, setCrs] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [developer, setDeveloper] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'section' | 'semester' | 'department'>('section');
  
  // Download Modal State
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [pendingDownloadItem, setPendingDownloadItem] = useState<any>(null);

  const isProfileComplete = user?.semester && user?.section && user?.department;

  useEffect(() => {
    loadCachedData();
    loadDashboardData();
  }, [user, token]);

  const loadCachedData = async () => {
    try {
        const cachedDev = await AsyncStorage.getItem('cached_developer');
        if (cachedDev) setDeveloper(JSON.parse(cachedDev));
        
        const cachedNotices = await AsyncStorage.getItem('cached_notices');
        if (cachedNotices) setNotices(JSON.parse(cachedNotices));
        
        const cachedCrs = await AsyncStorage.getItem('cached_crs');
        if (cachedCrs) setCrs(JSON.parse(cachedCrs));
        
        const cachedBanners = await AsyncStorage.getItem('cached_banners');
        if (cachedBanners) setBanners(JSON.parse(cachedBanners));
    } catch (e) {}
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const activeToken = token;

      try {
          const devRes = await auth.getDeveloperProfile();
          if (devRes.data.success) {
              setDeveloper(devRes.data.data);
              await AsyncStorage.setItem('cached_developer', JSON.stringify(devRes.data.data));
          }
      } catch (e) {}
      
      if (activeToken) {
        try {
            const noticeRes = await auth.getAllNotices(activeToken);
            if (noticeRes.data.success) {
                setNotices(noticeRes.data.data);
                await AsyncStorage.setItem('cached_notices', JSON.stringify(noticeRes.data.data));
            }
        } catch (e) {}
      }

      try {
        const activeSafeToken = activeToken || "guest_token";  
        const crRes = await auth.getAllCRs(activeSafeToken, { params: { timestamp: new Date().getTime() } });
        if (crRes.data?.success) {
           const crData = crRes.data.data.filter((u: any) => u.role !== 'Admin');
           setCrs(crData);
           await AsyncStorage.setItem('cached_crs', JSON.stringify(crData));
        }
      } catch (e) {}

      try {
        const bannerRes = await auth.getBanners();
        if (bannerRes.data.success) {
            const mapped = bannerRes.data.data.map((b: any) => ({
                id: b._id, title: b.title, subtitle: b.subtitle || '', image: b.imageUrl,
            }));
            setBanners(mapped);
            await AsyncStorage.setItem('cached_banners', JSON.stringify(mapped));
        }
      } catch (e) {}
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUser(); 
    if (isProfileComplete) loadDashboardData();
    else setRefreshing(false);
  };



  const executeDownload = async (noticeItem: any) => {
    try {
        const logoSrc = APP_LOGO_BASE64;
        
        const postDate = new Date(noticeItem.createdAt);
        const role = noticeItem.postedBy?.role === 'CR' ? 'Class Rep' : noticeItem.postedBy?.role || 'Class Rep';

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
                    <p class="notice-id">Notice ID: ${noticeItem._id?.substring(0, 8).toUpperCase() || 'VT-2026-X'}</p>
                    <h2 class="notice-title">${noticeItem.title}</h2>
                    <div class="notice-meta">
                        <span><strong>Posted On:</strong> ${postDate.toLocaleDateString()}</span>
                        <span><strong>Authority:</strong> ${noticeItem.author} (${role})</span>
                    </div>
                    <div class="content">${noticeItem.content}</div>
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
         console.error("PDF generation failed", error);
    }
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

  const renderNoticeItem = ({ item }: { item: any }) => {
    const isHighPriority = item.priority === 'High';
    const postDate = new Date(item.createdAt);
    const isRecent = (new Date().getTime() - postDate.getTime()) < (24 * 60 * 60 * 1000); 
    const role = item.postedBy?.role === 'CR' ? 'Class Rep' : item.postedBy?.role || 'Class Rep';

    const handleDownload = () => {
        setPendingDownloadItem(item);
        setDownloadModalVisible(true);
    };

    return (
      <Animated.View key={item._id || item.id} entering={FadeInDown.duration(400)} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {isHighPriority && <LinearGradient colors={['#EF4444', '#EF444400']} start={{x:0, y:0}} end={{x:0, y:1}} style={styles.priorityBar} />}
        <View style={styles.cardHeader}>
            <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                <View style={[styles.priorityBadge, { backgroundColor: isHighPriority ? '#FEE2E2' : item.priority === 'Medium' ? '#FEF3C7' : '#DBEAFE' }]}>
                  <Text style={[styles.priorityText, { color: isHighPriority ? '#DC2626' : item.priority === 'Medium' ? '#D97706' : '#2563EB' }]}>{item.priority}</Text>
                </View>
                {isRecent && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
            </View>
            <Text style={[styles.dateText, { color: theme.icon }]}>{postDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.cardContent, { color: theme.text }]} numberOfLines={3}>{item.content}</Text>
        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <View style={[styles.roleBadge, { backgroundColor: role === 'Admin' ? '#DBEAFE' : '#DCFCE7' }]}>
                    <Text style={[styles.roleBadgeText, { color: role === 'Admin' ? '#1E40AF' : '#166534' }]}>{role}</Text>
                </View>
                <Text style={[styles.authorText, { color: theme.icon }]}>{item.author}</Text>
            </View>
            <TouchableOpacity onPress={handleDownload} style={styles.downloadIcon}><Ionicons name="cloud-download-outline" size={20} color={theme.primary} /></TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderCRItem = ({ item }: { item: any }) => (
    <Animated.View key={item._id || item.id} entering={FadeInRight.duration(400)} style={[styles.crCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.crHeader}>
            {item.avatar ? <Image source={{ uri: item.avatar }} style={styles.crAvatar} /> : (
                <View style={[styles.crAvatarPlaceholder, { backgroundColor: theme.primary + '15' }]}><Text style={[styles.crInitials, { color: theme.primary }]}>{item.name?.substring(0, 2).toUpperCase()}</Text></View>
            )}
            <View style={styles.crInfo}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <Text style={[styles.crName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.crTag}><Text style={styles.crTagText}>CR</Text></View>
                </View>
                <Text style={[styles.crSub, { color: theme.icon }]} numberOfLines={1}>
                    {item.department} • {item.semester} • Sec {item.section}
                </Text>
            </View>
        </View>
        <View style={styles.crActions}>
            <TouchableOpacity onPress={() => handleCall(item.contact)} style={[styles.crActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}><Ionicons name="call-outline" size={18} color={theme.primary} /><Text style={[styles.crActionText, { color: theme.text }]}>Call</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => handleWhatsApp(item.contact)} style={[styles.crActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}><Ionicons name="logo-whatsapp" size={18} color="#22C55E" /><Text style={[styles.crActionText, { color: theme.text }]}>WhatsApp</Text></TouchableOpacity>
        </View>
    </Animated.View>
  );

  const getGreeting = () => {
    const hr = new Date().getHours();
    return hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : hr < 21 ? 'Good Evening' : 'Good Night';
  };

  const displayNotices = getFilteredNotices();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        
        {/* Premium Welcome Header */}
        <Animated.View entering={FadeInDown.duration(800)} style={styles.headerSection}>
            <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarContainer}>
                        <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.avatarGlow}>
                            {user?.avatar ? (
                                <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
                            ) : (
                                <View style={[styles.headerAvatar, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="person" size={22} color={theme.icon} />
                                </View>
                            )}
                        </LinearGradient>
                        <View style={[styles.statusIndicator, { backgroundColor: '#10B981' }]} />
                    </TouchableOpacity>
                    <View style={styles.nameContainer}>
                        <Text style={[styles.greetingText, { color: theme.icon }]}>{getGreeting()}</Text>
                        <Text style={[styles.mainName, { color: theme.text }]}>{user?.name?.split(' ')[0]}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('SupportChat' as any)} style={[styles.headerActionBtn, { borderColor: theme.border }]}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings' as any)} style={[styles.headerActionBtn, { borderColor: theme.border }]}>
                        <Ionicons name="cog-outline" size={22} color={theme.text} />
                    </TouchableOpacity>
                </View>
            </View>
            
            <View style={styles.headerBadges}>
                <View style={[styles.badgePill, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="school-outline" size={12} color={theme.primary} />
                    <Text style={[styles.badgeText, { color: theme.primary }]}>{user?.department}</Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: theme.secondary + '15' }]}>
                    <Ionicons name="calendar-outline" size={12} color={theme.secondary} />
                    <Text style={[styles.badgeText, { color: theme.secondary }]}>{user?.semester}</Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.badgeText, { color: theme.text }]}>Sec {user?.section}</Text>
                </View>
            </View>
        </Animated.View>

        {/* Hero Slider */}
        {banners.length > 0 && (
            <View style={styles.sliderContainer}><HeroSlider data={banners} /></View>
        )}

        {/* Improved Notices Section */}
        <View style={styles.section}>
            <View style={styles.tabContainer}>
                {['section', 'semester', 'department'].map((tab) => (
                    <TouchableOpacity key={tab} onPress={() => setActiveTab(tab as any)} style={[styles.tab, activeTab === tab && { backgroundColor: theme.primary }]}>
                        <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : theme.icon }]}>{tab === 'section' ? 'Section' : tab === 'semester' ? 'Semester' : 'Dept'}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && notices.length === 0 ? <ActivityIndicator color={theme.primary} size="large" style={{marginTop: 40}} /> : (
                <View style={styles.noticeList}>
                    {displayNotices.length > 0 ? (
                        <>
                            {displayNotices.slice(0, 5).map((notice) => renderNoticeItem({ item: notice }))}
                            {displayNotices.length > 5 && (
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Notices' as any)}
                                    style={[styles.seeMoreBtn, { borderColor: theme.border }]}
                                >
                                    <Text style={[styles.seeMoreText, { color: theme.primary }]}>See More Notices</Text>
                                    <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                            <Ionicons name="notifications-off-outline" size={32} color={theme.icon} />
                            <Text style={[styles.emptyText, { color: theme.icon }]}>No {activeTab} notices</Text>
                        </View>
                    )}
                </View>
            )}
        </View>

        {/* Class Representatives */}
        <View style={styles.section}>
            <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={[styles.sectionHeading, { color: theme.text }]}>Class Representatives</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CRList' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>See All</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.primary} />
                </TouchableOpacity>
            </View>
            {loading && crs.length === 0 ? (
                <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crList}>
                    {crs.length > 0 ? crs.map((cr) => renderCRItem({ item: cr })) : (
                        <View style={[styles.emptyCR, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={{color: theme.icon}}>No Class Reps found</Text></View>
                    )}
                </ScrollView>
            )}
        </View>
        
        {/* Designer Developer Card */}
        {developer && (
            <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
                <View style={[styles.devCardContainer, { shadowColor: theme.primary }]}>
                    <LinearGradient 
                        colors={isDark ? ['#1E293B', '#0F172A'] : ['#4F46E5', '#6366F1']} 
                        start={{x:0, y:0}} end={{x:1, y:1}} 
                        style={styles.devCardInner}
                    >
                        <View style={styles.devHeader}>
                            <View style={styles.devAvatarContainer}>
                                <Image 
                                    source={developer.avatarUrl ? { uri: developer.avatarUrl } : require('../../assets/images/logo.png')} 
                                    style={styles.devAvatar} 
                                />
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-sharp" size={10} color="#fff" />
                                </View>
                            </View>
                            <View style={styles.devInfo}>
                                <Text style={styles.devName}>{developer.name}</Text>
                                <Text style={styles.devRole}>{developer.role}</Text>
                            </View>
                            <Ionicons name="code-working" size={24} color="rgba(255,255,255,0.4)" />
                        </View>
                        
                        <Text style={styles.devMission} numberOfLines={2}>
                            "{developer.missionStatement}"
                        </Text>
                        
                        <View style={styles.devFooter}>
                             <View style={styles.socialGroup}>
                                {developer.socials?.github && (
                                    <TouchableOpacity onPress={() => openLink(developer.socials.github)} style={styles.devSocialBtn}>
                                        <Ionicons name="logo-github" size={17} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                {developer.socials?.linkedin && (
                                    <TouchableOpacity onPress={() => openLink(developer.socials.linkedin)} style={styles.devSocialBtn}>
                                        <Ionicons name="logo-linkedin" size={17} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                {developer.socials?.facebook && (
                                    <TouchableOpacity onPress={() => openLink(developer.socials.facebook)} style={styles.devSocialBtn}>
                                        <Ionicons name="logo-facebook" size={17} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                {developer.socials?.instagram && (
                                    <TouchableOpacity onPress={() => openLink(developer.socials.instagram)} style={styles.devSocialBtn}>
                                        <Ionicons name="logo-instagram" size={17} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                {developer.socials?.website && (
                                    <TouchableOpacity onPress={() => openLink(developer.socials.website)} style={styles.devSocialBtn}>
                                        <Ionicons name="globe-outline" size={17} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                {developer.socials?.email && (
                                    <TouchableOpacity onPress={() => openLink(`mailto:${developer.socials.email}`)} style={styles.devSocialBtn}>
                                        <Ionicons name="mail" size={17} color="#fff" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.madeInTag}>
                                <Text style={styles.madeInText}>VUTIME CORE</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>
            </Animated.View>
        )}

        <View style={{height: 40}} /> 
      </ScrollView>

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
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  // Header
  headerSection: { marginBottom: 28, marginTop: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarContainer: { position: 'relative' },
  avatarGlow: { width: 56, height: 56, borderRadius: 28, padding: 2, justifyContent: 'center', alignItems: 'center' },
  headerAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#fff' },
  statusIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  nameContainer: { justifyContent: 'center' },
  greetingText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 },
  mainName: { fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: -2 },
  headerActionBtn: { width: 44, height: 44, borderRadius: 22, borderWidh: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)' },
  
  headerBadges: { flexDirection: 'row', gap: 8 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },

  sliderContainer: { marginBottom: 30, borderRadius: 12, overflow: 'hidden' },

  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '800' },

  section: { marginBottom: 32 },
  sectionHeader: { marginBottom: 16 },
  sectionHeading: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },

  // Notice Card
  noticeList: { gap: 16 },
  card: { borderRadius: 24, padding: 20, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  priorityBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  newBadge: { backgroundColor: '#F97316', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  dateText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8, lineHeight: 22 },
  cardContent: { fontSize: 14, lineHeight: 20, opacity: 0.7, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  authorText: { fontSize: 12, fontWeight: '700' },
  downloadIcon: { padding: 4 },

  // CR Cards
  crList: { gap: 14 },
  crCard: { width: 260, borderRadius: 24, padding: 18, borderWidth: 1 },
  crHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  crAvatar: { width: 50, height: 50, borderRadius: 25 },
  crAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  crInitials: { fontSize: 18, fontWeight: '800' },
  crInfo: { flex: 1 },
  crName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  crSub: { fontSize: 12, fontWeight: '600' },
  crTag: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  crTagText: { fontSize: 8, color: '#166534', fontWeight: '900' },
  crActions: { flexDirection: 'row', gap: 8 },
  crActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, gap: 5 },
  crActionText: { fontSize: 11, fontWeight: '700' },

  emptyState: { padding: 40, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontWeight: '700', fontSize: 15 },
  emptyCR: { width: 220, height: 140, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1 },

  // Developer Card
  devCardContainer: {
    borderRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  devCardInner: { borderRadius: 28, padding: 24, overflow: 'hidden' },
  devHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  devAvatarContainer: { position: 'relative' },
  devAvatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10B981', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  devInfo: { flex: 1 },
  devName: { color: '#fff', fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  devRole: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  devMission: { color: '#fff', fontSize: 13, fontWeight: '600', fontStyle: 'italic', opacity: 0.9, lineHeight: 20, marginBottom: 20 },
  devFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  socialGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  devSocialBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  madeInTag: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  madeInText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  seeMoreBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8
  },
  seeMoreText: { fontSize: 14, fontWeight: '700' },
});
