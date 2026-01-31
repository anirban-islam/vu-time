import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '../../constants/theme';
import RoutineCard from '../components/RoutineCard';
import { auth } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DownloadModal from '../components/DownloadModal';
import { APP_LOGO_BASE64 } from '../constants/Base64Assets';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Filter Constraints (Initialized in State)

export default function RoutineScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const theme = Colors[isDark ? 'dark' : 'light'];
  
  const [selectedDay, setSelectedDay] = useState('Sunday');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [routineData, setRoutineData] = useState<any>({});
  const [filteredRoutine, setFilteredRoutine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State (Use user preferences)
  const [selectedSemester, setSelectedSemester] = useState(user?.semester || 'All');
  const [selectedSection, setSelectedSection] = useState(user?.section || 'All');
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>(['A', 'B', 'C']); // Dynamic
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Download Modal State
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);

  // const SECTIONS = ['A', 'B', 'C', 'D', 'E']; // Removed hardcoded list

  // Check for missing academic info
  useEffect(() => {
    if (user && (!user.department || !user.semester || !user.section)) {
        setTimeout(() => setShowCompletionModal(true), 1500); // Wait a bit after login
    } else {
        setShowCompletionModal(false);
    }
  }, [user]);

  // Fetch Data
  useEffect(() => {
    loadCachedRoutine();
    fetchRoutine();
  }, [user?.department]); // Re-fetch or re-process if department changes

  const loadCachedRoutine = async () => {
    try {
        const cached = await AsyncStorage.getItem('cached_routine');
        if (cached) {
            const json = JSON.parse(cached);
            setRoutineData(json);
            processRoutineData(json);
        }
    } catch (e) {}
  };

  const processRoutineData = (json: any) => {
    const currentDept = user?.department || 'CSE';
    const deptData = json[currentDept] || {};
    const sems = Object.keys(deptData).sort();
    
    if (sems.length > 0) {
         setAvailableSemesters(['All', ...sems]);
         if (selectedSemester !== 'All' && !sems.includes(selectedSemester)) {
             setSelectedSemester('All');
         }
    } else {
        setAvailableSemesters(['All']);
        setSelectedSemester('All');
    }
  };
  // Dynamically extract Sections when Semester changes
  useEffect(() => {
      if (!routineData || !selectedSemester) return;

      const currentDept = user?.department || 'CSE';
      const deptData = routineData[currentDept];
      if (!deptData) return;

      const semesterData = deptData[selectedSemester];
      if (!semesterData) return;

      const sections = new Set<string>();
      sections.add('A'); 

      Object.keys(semesterData).forEach(day => {
          const dayClasses = semesterData[day];
          if (Array.isArray(dayClasses)) {
              dayClasses.forEach((cls: any) => {
                  if (cls.section && cls.section !== 'N/A' && cls.section.trim() !== '') {
                      sections.add(cls.section.trim());
                  }
              });
          }
      });

      const sortedSections = Array.from(sections).sort();
      setAvailableSections(sortedSections);

      if (!sortedSections.includes(selectedSection)) {
          setSelectedSection(sortedSections[0]);
      }
  }, [routineData, selectedSemester, user?.department]);

  const fetchRoutine = async () => {
    try {
        setLoading(true);
        const res = await auth.getRoutine();
        const json = res.data;
        
        if (json && !json.error) {
            setRoutineData(json);
            processRoutineData(json);
            await AsyncStorage.setItem('cached_routine', JSON.stringify(json));
        }
    } catch (error) {
        // Silently fail as we have cached data or empty state
    } finally {
        setLoading(false);
    }
  };
  
  // Filter Logic - CLEAN & ROBUST
  useEffect(() => {
      // 1. Guard Clause: No data? Stop.
      if (!routineData || Object.keys(routineData).length === 0) {
          setFilteredRoutine([]);
          return;
      }

      const currentDept = user?.department || 'CSE';
      const deptData = routineData[currentDept] || {};
      let combinedData: any[] = [];

      // 2. Get Data for Selected Semester(s)
      if (selectedSemester === 'All') {
          // Flatten all semesters for the selected day
          Object.keys(deptData).forEach(sem => {
              const semDayData = deptData[sem]?.[selectedDay] || [];
              combinedData = [...combinedData, ...semDayData];
          });
      } else {
          const semesterData = deptData[selectedSemester];
          if (semesterData) {
              combinedData = semesterData[selectedDay] || [];
          }
      }
      
      // 3. Filter by Section (Only if a specific section is selected and it's not 'N/A')
      const filtered = combinedData.filter((item: any) => {
          // If viewing 'All' semesters, we might want to show everything unless a section is specifically filtered
          // For now, let's keep the section filter active
          
          if (selectedSection === 'All') return true; // Add an 'All' option for sections too?

          // Rule 1: Always show items with NO section (Common labs/classes)
          if (!item.section || item.section === 'N/A' || item.section === '') return true; 

          // Rule 2: Show items matching the selected section
          return item.section.trim() === selectedSection;
      });

      // 4. Sort by Time (AM/PM aware)
      filtered.sort((a: any, b: any) => {
          const parseTime = (timeStr: string) => {
              if(!timeStr) return 0;
              const [time, modifier] = timeStr.split(' ');
              let [hours, minutes] = time.split(':').map(Number);
              if (hours === 12 && modifier === 'AM') hours = 0;
              if (hours !== 12 && modifier === 'PM') hours += 12;
              return hours * 60 + minutes;
          };
          // Sort by time first, then by semester if times are equal
          const timeDiff = parseTime(a.time) - parseTime(b.time);
          if (timeDiff !== 0) return timeDiff;
          return (a.semester || '').localeCompare(b.semester || '');
      });

      setFilteredRoutine(filtered);
  }, [routineData, selectedSemester, selectedDay, selectedSection, availableSemesters]);
  
  useEffect(() => {
    const todayIndex = new Date().getDay(); // 0 is Sunday
    setSelectedDay(DAYS[todayIndex]);
  }, []);

  const getDayDate = (dayName: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const currentDayIndex = today.getDay();
    const targetDayIndex = days.indexOf(dayName);
    
    // Calculate difference to get the target day in the current week
    // We want Sunday to be the start of the week? Or relative to today?
    // "Routine" usually implies "This Week's Routine"
    // Let's assume standard week Sunday-Saturday
    
    const diff = targetDayIndex - currentDayIndex;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    
    return targetDate;
  };

  const currentDate = getDayDate(selectedDay);
  const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Use the filtered list for rendering
  const currentRoutine = filteredRoutine;

  const handleDownload = () => {
    setDownloadModalVisible(true);
  };

  const executeDownload = async () => {
    try {
      const logoSrc = APP_LOGO_BASE64;


      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; color: #1f2937; padding: 40px; position: relative; }
              .watermark { position: fixed; top: 50%; left: 50%; width: 550px; height: 550px; transform: translate(-50%, -50%) rotate(-35deg); opacity: 0.07; z-index: -1; object-fit: contain; }
              .header { border-bottom: 3px solid #111827; padding-bottom: 20px; margin-bottom: 30px; flex-direction: row; display: flex; align-items: center; justify-content: space-between; }
              .logo-container { width: 120px; height: 120px; }
              .header-text { text-align: right; }
              .official-title { font-size: 28px; font-weight: 900; color: #111827; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
              .university-name { font-size: 16px; font-weight: 700; color: #6b7280; margin-top: 4px; }
              
              .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }
              .info-item { text-align: left; }
              .info-label { font-size: 10px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; font-weight: 800; }
              .info-value { font-size: 14px; font-weight: 700; color: #111827; }

              table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; }
              th { background-color: #f3f4f6; color: #111827; font-weight: 800; text-align: left; padding: 16px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #111827; }
              td { padding: 16px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
              
              .time-cell { font-weight: 900; color: #111827; font-size: 15px; }
              .type-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; }
              .type-lab { background-color: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; }
              .type-theory { background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
              
              .course-title { font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 6px; }
              .course-code { display: inline-block; background: #111827; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; color: #fff; margin-right: 6px; }
              .teacher { font-weight: 700; color: #374151; font-size: 14px; margin-bottom: 4px;}
              .room { color: #6b7280; font-size: 13px; font-weight: 600; }
              
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
                    <h1 class="official-title">Class Routine</h1>
                    <p class="university-name">Varendra University • VU Time System</p>
                </div>
            </div>
 
            <div class="container">
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Semester</div>
                        <div class="info-value">${selectedSemester === 'All' ? 'All Semesters' : selectedSemester}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Section</div>
                        <div class="info-value">${selectedSection === 'All' ? 'All' : selectedSection}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Day</div>
                        <div class="info-value">${selectedDay}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Date</div>
                        <div class="info-value">${currentDate.toLocaleDateString()}</div>
                    </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th width="20%">Time</th>
                      <th width="50%">Course Details</th>
                      <th width="30%">Location & Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${currentRoutine.length > 0 ? currentRoutine.map((item: any) => `
                      <tr>
                        <td>
                            <div class="time-cell">${item.time}</div>
                            <div style="margin-top:8px;">
                                <span class="type-badge ${item.type === 'Lab' ? 'type-lab' : 'type-theory'}">${item.type}</span>
                            </div>
                        </td>
                        <td>
                          <div class="course-title">${item.courseName}</div>
                          <span class="course-code">${item.courseCode}</span>
                          ${item.section && item.section !== 'N/A' ? `<span class="course-code" style="margin-left:5px;">Sec: ${item.section}</span>` : ''}
                        </td>
                        <td>
                            <div class="teacher">${item.teacherName}</div>
                            <div class="room">Room ${item.roomNumber}</div>
                        </td>
                      </tr>
                    `).join('') : `<tr><td colspan="3" style="text-align:center; padding: 40px; color: #6b7280;">No classes scheduled for today.</td></tr>`}
                  </tbody>
                </table>

                <div class="footer">
                  <p style="font-size: 10px;">This is a digitally verified schedule generated via VUTime Application. All rights reserved.</p>
                </div>
                <div class="signature">
                  <p class="sig-text">This is a system-generated document. No manual signature is required.</p>
                </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri);
      } else {
        const permission = await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf'
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF routine');
      console.error(error);
    }
  };

  // Only show full-screen loader if we have NO data yet.
  // Otherwise, allow Pull-to-Refresh to show the native spinner over existing content.
  if (loading && (!routineData || Object.keys(routineData).length === 0)) {
    return (
        <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ marginTop: 20, color: theme.text, fontSize: 16, fontWeight: '600' }}>Syncing Schedule...</Text>
            <Text style={{ marginTop: 8, color: theme.icon, fontSize: 13 }}>Getting the latest classes for you</Text>
        </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      
      
      <View style={styles.content}>
        
        {/* Header & Date */}
        <View style={styles.headerContainer}>
            <View>
                <Text style={[styles.screenTitle, { color: theme.text }]}>Class Schedule</Text>
                <Text style={[styles.dateSubtitle, { color: theme.icon }]}>
                    {formattedDate}
                </Text>
            </View>

            <TouchableOpacity 
                onPress={handleDownload}
                style={[styles.iconButton, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}
            >
                <Ionicons name="cloud-download-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
        </View>

        {/* Toolbar: Day Selector & Info */}
        <View style={styles.toolbar}>
             {/* Dropdown Trigger */}
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setShowDropdown(true)}
                style={[styles.daySelector, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            >
                <Ionicons name="calendar" size={18} color="#FFF" />
                <Text style={styles.daySelectorText}>{selectedDay}</Text>
                <Ionicons name="chevron-down" size={16} color="#FFF" />
            </TouchableOpacity>

            {/* Class Info Badge (Clickable for Filter) */}
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setShowFilterModal(true)}
                style={[styles.infoBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                     <View style={[styles.badgeIconBox, { backgroundColor: theme.primary + '15' }]}>
                        <Ionicons name="filter" size={12} color={theme.primary} />
                     </View>
                     <View>
                        <Text style={[styles.infoBadgeLabel, { color: theme.icon }]}>Filter</Text>
                        <Text style={[styles.infoBadgeText, { color: theme.text }]}>
                            {selectedSemester} · {selectedSection}
                        </Text>
                     </View>
                </View>
            </TouchableOpacity>
        </View>

        {/* Filter Modal - Modern Bottom Sheet */}
        <Modal
            visible={showFilterModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowFilterModal(false)}
        >
             <TouchableOpacity 
                style={styles.filterModalOverlay} 
                activeOpacity={1} 
                onPress={() => setShowFilterModal(false)}
             >
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={[styles.filterModalContent, { backgroundColor: theme.surface }]}
                >
                    {/* Drag Handle */}
                    <View style={styles.modalHandleContainer}>
                        <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                    </View>

                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Routine</Text>
                        <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                            <Ionicons name="close-circle" size={24} color={theme.icon} />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Semester Select */}
                    <Text style={[styles.filterLabel, { color: theme.text }]}>Start Semester</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.filterScroll}
                        contentContainerStyle={{ paddingRight: 20 }}
                    >
                        {availableSemesters.map(sem => (
                            <TouchableOpacity
                                key={sem}
                                style={[
                                    styles.filterChip, 
                                    selectedSemester === sem 
                                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                        : { backgroundColor: theme.background, borderColor: theme.border }
                                ]}
                                onPress={() => setSelectedSemester(sem)}
                            >
                                <Text style={[
                                    styles.filterChipText, 
                                    selectedSemester === sem ? { color: '#FFF' } : { color: theme.text }
                                ]}>{sem}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Section Select */}
                    <Text style={[styles.filterLabel, { color: theme.text, marginTop: 24 }]}>Select Section</Text>
                    <View style={styles.sectionRow}>
                        <TouchableOpacity
                            style={[
                                styles.sectionChip, 
                                selectedSection === 'All' 
                                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                    : { backgroundColor: theme.background, borderColor: theme.border }
                            ]}
                            onPress={() => setSelectedSection('All')}
                        >
                            <Text style={[
                                styles.sectionChipText, 
                                selectedSection === 'All' ? { color: '#FFF' } : { color: theme.text }
                            ]}>All</Text>
                        </TouchableOpacity>
                        {availableSections.map(sec => (
                            <TouchableOpacity
                                key={sec}
                                style={[
                                    styles.sectionChip, 
                                    selectedSection === sec 
                                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                        : { backgroundColor: theme.background, borderColor: theme.border }
                                ]}
                                onPress={() => setSelectedSection(sec)}
                            >
                                <Text style={[
                                    styles.sectionChipText, 
                                    selectedSection === sec ? { color: '#FFF' } : { color: theme.text }
                                ]}>{sec}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity 
                        style={[styles.applyButton, { backgroundColor: theme.primary }]}
                        onPress={() => setShowFilterModal(false)}
                    >
                        <Text style={styles.applyButtonText}>Apply Changes</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
             </TouchableOpacity>
        </Modal>

        {/* Dropdown Modal */}
        <Modal
            visible={showDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDropdown(false)}
        >
            <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={() => setShowDropdown(false)}
            >
                <View style={[styles.dropdownMenu, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.dropdownHeader, { color: theme.text }]}>Select Day</Text>
                    {DAYS.map((day) => (
                         <TouchableOpacity 
                            key={day} 
                            style={[
                                styles.dropdownItem, 
                                selectedDay === day && { backgroundColor: theme.primary + '15' }
                            ]}
                            onPress={() => {
                                setSelectedDay(day);
                                setShowDropdown(false);
                            }}
                        >
                            <Text style={[
                                styles.dropdownItemText, 
                                { color: theme.text },
                                selectedDay === day && { color: theme.primary, fontWeight: 'bold' }
                            ]}>
                                {day}
                            </Text>
                            {selectedDay === day && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                         </TouchableOpacity>
                    ))}
                </View>
            </TouchableOpacity>
        </Modal>

        {/* Profile Completion Modal */}
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
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Welcome to VUTime!</Text>
                    <Text style={[styles.modalSubtitle, { color: theme.icon }]}>
                        You haven't set your academic details yet. Please complete your profile to see your daily routine.
                    </Text>
                    
                    <TouchableOpacity 
                        style={[styles.modalButton, { backgroundColor: theme.primary }]}
                        onPress={() => {
                            setShowCompletionModal(false);
                            navigation.navigate('Profile');
                        }}
                    >
                        <Text style={styles.modalButtonText}>Setup Profile Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={{ marginTop: 16 }}
                        onPress={() => setShowCompletionModal(false)}
                    >
                        <Text style={{ color: theme.icon, fontSize: 14 }}>Maybe Later</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
        
        <DownloadModal 
            visible={downloadModalVisible}
            onClose={() => setDownloadModalVisible(false)}
            onConfirm={executeDownload}
            title="Class Routine PDF"
            description={`Do you want to download your ${selectedDay} routine as a professional PDF?`}
        />


            {/* Routine List */}
            <ScrollView 
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchRoutine} colors={[theme.primary]} tintColor={theme.primary} />
                }
            >
                {filteredRoutine.length > 0 ? (
                    filteredRoutine.map((item: any, index: number) => (
                        <RoutineCard 
                            key={item.id || index}
                            index={index}
                            courseName={item.courseName}
                            courseCode={item.courseCode}
                            teacherName={item.teacherName}
                            roomNumber={item.roomNumber}
                            time={item.time}
                            type={item.type}
                            section={item.section}
                            semester={item.semester}
                        />
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <View style={[styles.badgeIconBox, { width: 64, height: 64, borderRadius: 32, marginBottom: 16, backgroundColor: theme.warning + '15' }]}>
                            <Ionicons name="sunny-outline" size={32} color={theme.warning} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 6 }]}>No Classes Found</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.icon, fontSize: 13, textAlign: 'center', opacity: 0.7 }]}>
                            {currentRoutine && Object.keys(routineData).length > 0 
                                ? "Enjoy your free time!" 
                                : "Could not load data. Pull down to refresh."}
                        </Text>
                    </View>
                )}
            </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, marginTop: 10 },
  text: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  infoContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  placeholderBox: {
    height: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  dateSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  daySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    gap: 8,
    // Shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  daySelectorText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    minWidth: 110,
  },
  badgeIconBox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
  },
  infoBadgeLabel: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownMenu: {
    width: '80%',
    borderRadius: 16,
    padding: 16,
    maxHeight: '60%',
    alignSelf: 'center',
  },
  dropdownHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
      width: '100%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingTop: 10,
      minHeight: 350,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 20,
  },
  modalHandleContainer: {
      alignItems: 'center',
      paddingVertical: 10,
      marginBottom: 10,
  },
  modalHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      opacity: 0.5,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      letterSpacing: -0.5,
  },
  filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
      opacity: 0.8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  filterScroll: {
      flexGrow: 0,
      marginBottom: 10,
  },
  filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      marginRight: 8,
      minWidth: 50,
      alignItems: 'center',
  },
  filterChipText: {
      fontSize: 15,
      fontWeight: '600',
  },
  sectionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
  },
  sectionChip: {
      width: 42,
      height: 42,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
  },
  sectionChipText: {
      fontSize: 16,
      fontWeight: 'bold',
  },
  applyButton: {
      marginTop: 32,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
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
