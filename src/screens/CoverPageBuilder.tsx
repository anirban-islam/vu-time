import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight, FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/api';
import DownloadModal from '../components/DownloadModal';
import { VU_LOGO_BASE64, DEPT_LOGO_BASE64 } from '../constants/Base64Assets';

export default function CoverPageBuilderScreen() {
    const { isDark } = useTheme();
    const theme = Colors[isDark ? 'dark' : 'light'];
    const { user } = useAuth();

    // Mode: 'home' | 'builder'
    const [viewMode, setViewMode] = useState<'home' | 'builder'>('home');
    // Type: 'assignment' | 'lab_report'
    const [coverType, setCoverType] = useState<'assignment' | 'lab_report'>('assignment');

    // Data State
    const [availableCourses, setAvailableCourses] = useState<any[]>([]);
    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [generating, setGenerating] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Download Modal State (for history)
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [pendingHistoryUri, setPendingHistoryUri] = useState('');

    // Form State
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [experimentNo, setExperimentNo] = useState('');
    const [experimentName, setExperimentName] = useState('');
    const [submissionDate, setSubmissionDate] = useState(new Date().toLocaleDateString('en-GB').replace(/\//g, '-')); // DD-MM-YYYY
    
    // Teacher 1
    const [teacherName, setTeacherName] = useState('');
    const [teacherDesignation, setTeacherDesignation] = useState('');

    // Teacher 2 (Lab Report only)
    const [teacherName2, setTeacherName2] = useState('');
    const [teacherDesignation2, setTeacherDesignation2] = useState('');

    // Derived state for filtered courses
    const filteredCourses = availableCourses.filter(c => {
        if (coverType === 'lab_report') {
            // Strictly show Lab courses for Lab Reports
            return c.type === 'Lab';
        }
        // Show Theory/All courses for Assignments
        return c.type === 'Theory' || !c.type;
    });

    const historyKey = `cover_history_${user?.email || 'guest'}`;
    const formKey = `cover_page_data_${user?.email || 'guest'}`;

    useEffect(() => {
        if (user) {
            fetchCourses();
            loadSavedData();
            loadHistory();
        }
    }, [user]);

    const loadHistory = async () => {
        try {
            const saved = await AsyncStorage.getItem(historyKey);
            if (saved) setHistory(JSON.parse(saved));
            else setHistory([]);
        } catch (e) { console.log(e); }
    };
    // Load Routine to populate Courses
    const fetchCourses = async () => {
        setCoursesLoading(true);
        try {
            const [routineRes, teacherRes] = await Promise.all([
                auth.getRoutine(),
                auth.getTeachers()
            ]);
            
            const routineData = routineRes.data;
            const teachersData = teacherRes.data;
            
            if (teachersData && Array.isArray(teachersData)) {
                setAllTeachers(teachersData);
            }

            if (routineData && !routineData.error) {
                const userDept = (user?.department || '').trim();
                const userSem = (user?.semester || '').trim();
                const userSec = (user?.section || '').trim();
                
                // Find matching department (case-insensitive)
                const deptKey = Object.keys(routineData).find(k => k.toLowerCase() === userDept.toLowerCase());
                const deptData = deptKey ? routineData[deptKey] : null;
                
                if (!deptData) {
                    setAvailableCourses([]);
                    return;
                }

                // Find matching semester (case-insensitive)
                const semKey = Object.keys(deptData).find(k => k.toLowerCase() === userSem.toLowerCase());
                const semData = semKey ? deptData[semKey] : null;

                if (!semData) {
                    setAvailableCourses([]);
                    return;
                }
                
                const coursesMap = new Map();
                
                Object.values(semData).forEach((dayClasses: any) => {
                    if (Array.isArray(dayClasses)) {
                        dayClasses.forEach((cls: any) => {
                            const clsSection = (cls.section || '').trim();
                            if (clsSection && clsSection !== 'N/A' && clsSection.toLowerCase() !== userSec.toLowerCase()) return;

                            // Split multiple teachers (e.g. "Mr. X, Ms. Y" or "Mr. X & Ms. Y")
                            const rawNames = cls.teacherName.split(/,|&/).map((n: string) => n.trim()).filter((n: string) => n.length > 0);

                            if (!coursesMap.has(cls.courseCode)) {
                                coursesMap.set(cls.courseCode, {
                                    code: cls.courseCode,
                                    title: cls.courseName,
                                    type: cls.type, // Store the course type (Theory or Lab)
                                    teachers: rawNames 
                                });
                            } else {
                                const existing = coursesMap.get(cls.courseCode);
                                rawNames.forEach((name: string) => {
                                    if (!existing.teachers.includes(name)) {
                                        existing.teachers.push(name);
                                    }
                                });
                            }
                        });
                    }
                });
                
                setAvailableCourses(Array.from(coursesMap.values()));
            }
        } catch (error) {
            console.log('Error fetching courses:', error);
        } finally {
            setCoursesLoading(false);
        }
    };

    const findTeacherDesignation = (name: string) => {
        if (!name) return '';
        // Try to match name exactly or partially
        const found = allTeachers.find(t => 
            t.name.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(t.name.toLowerCase())
        );
        return found ? found.designation : '';
    };

    const handleCourseSelect = (course: any) => {
        setCourseCode(course.code);
        setCourseTitle(course.title);
        
        // Clear previous teacher data first
        setTeacherName('');
        setTeacherDesignation('');
        setTeacherName2('');
        setTeacherDesignation2('');

        // Auto-select teachers with dynamic designation lookup
        if (course.teachers && course.teachers.length > 0) {
            const t1 = course.teachers[0];
            setTeacherName(t1);
            setTeacherDesignation(findTeacherDesignation(t1)); 
        }
        
        if (course.teachers && course.teachers.length > 1) {
            const t2 = course.teachers[1];
            setTeacherName2(t2);
            setTeacherDesignation2(findTeacherDesignation(t2));
        }
        
        setShowCourseModal(false);
    };

    const loadSavedData = async () => {
        try {
            const saved = await AsyncStorage.getItem(formKey); 
            if (saved) {
                const data = JSON.parse(saved);
                if (data.courseCode) setCourseCode(data.courseCode);
                if (data.courseTitle) setCourseTitle(data.courseTitle);
                if (data.teacherName) setTeacherName(data.teacherName);
                if (data.teacherDesignation) setTeacherDesignation(data.teacherDesignation);
                if (data.teacherName2) setTeacherName2(data.teacherName2);
                if (data.teacherDesignation2) setTeacherDesignation2(data.teacherDesignation2);
            }
        } catch (e) { console.log(e); }
    };

    const saveData = async () => {
        const data = { courseCode, courseTitle, teacherName, teacherDesignation, teacherName2, teacherDesignation2 };
        await AsyncStorage.setItem(formKey, JSON.stringify(data));
    };

    useEffect(() => { saveData(); }, [courseCode, courseTitle, teacherName, teacherDesignation, teacherName2, teacherDesignation2]);

    const getBase64Image = async (requireSource: any) => {
        try {
            const asset = Asset.fromModule(requireSource);
            // Ensure download
            await asset.downloadAsync();
            
            if (asset.localUri) {
                const base64 = await readAsStringAsync(asset.localUri, { encoding: 'base64' });
                // Robust mime type check or default to png
                let mimeType = 'image/png';
                if (asset.name?.toLowerCase().endsWith('jpg') || asset.name?.toLowerCase().endsWith('jpeg')) {
                    mimeType = 'image/jpeg';
                }
                return `data:${mimeType};base64,${base64}`;
            }
        } catch (e) { console.log("Image Load Error", e); }
        // Return null or empty if failed
        return null;
    };

    const confirmGeneration = () => {
        if (!courseCode || !courseTitle || !teacherName) {
            Alert.alert("Missing Info", "Please fill in Course Code, Title, and Teacher Name.");
            return;
        }
        setShowConfirmModal(true);
    };

    const finalGenerate = async () => {
        setShowConfirmModal(false);
        setGenerating(true);

        // Load logos with improved robustness for production
        // Load logos with improved robustness for production
        // Use pre-loaded base64 assets to ensure they appear in PDFs
        const vuLogo = VU_LOGO_BASE64;
        const deptLogo = DEPT_LOGO_BASE64;

        const studentName = (user?.name || 'STUDENT NAME').toUpperCase();
        const studentId = user?.studentId || '00000000';
        const section = user?.section || 'A';
        const semester = user?.semester || '1st';
        const batch = user?.batch || 'N/A'; 

        if (!vuLogo || !deptLogo) {
             console.log("Warning: Logos failed to load in Base64");
        }

        let contentHtml = '';

        // Improved Layout Logic
        if (coverType === 'lab_report') {
            contentHtml = `
            <div style="text-align: center; margin-top: 20px;">
                <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">Lab Report</h1>
                <div style="font-size: 14px; margin-bottom: 5px;">Course Code: ${courseCode}</div>
                <div style="font-size: 14px;">Course Title: ${courseTitle}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid black;">
                <tr>
                    <td style="width: 25%; border: 1px solid black; padding: 8px; font-weight: bold; text-align: center; font-size: 14px;">Experiment No:</td>
                    <td style="border: 1px solid black; padding: 8px; text-align: center; font-size: 14px;">${experimentNo || '00'}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black; padding: 8px; font-weight: bold; text-align: center; font-size: 14px;">Name of Experiment</td>
                    <td style="border: 1px solid black; padding: 8px; text-align: center; font-size: 14px;">${experimentName || 'Experiment Name'}</td>
                </tr>
            </table>

            <div style="margin-top: 30px; line-height: 1.6; font-size: 14px;">
                <div style="font-weight: bold; width: 100px; display: inline-block;">Name</div> : ${studentName}<br>
                <div style="font-weight: bold; width: 100px; display: inline-block;">Student ID</div> : ${studentId}<br>
                <div style="font-weight: bold; width: 100px; display: inline-block;">Section</div> : ${section}<br>
                <div style="font-weight: bold; width: 100px; display: inline-block;">Semester</div> : ${semester}<br>
                <div style="font-weight: bold; width: 100px; display: inline-block;">Course Code</div> : ${courseCode}<br>
                <div style="font-weight: bold; width: 100px; display: inline-block;">Course Title</div> : ${courseTitle}
            </div>
            `;
        } else {
            contentHtml = `
            <div style="margin-top: 50px; text-align: center; margin-bottom: 50px;">
                <div style="border: 2px dashed #EF4444; padding: 10px 30px; display: inline-block; color: #EF4444; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                    ASSIGNMENT
                </div>
            </div>

            <div style="margin-bottom: 40px; font-size: 15px;">
                <div style="display: flex; margin-bottom: 10px;">
                    <strong style="width: 160px;">Course Title</strong>
                    <span>: ${courseTitle}</span>
                </div>
                <div style="display: flex; margin-bottom: 10px;">
                    <strong style="width: 160px;">Course Code</strong>
                    <span>: ${courseCode}</span>
                </div>
                <div style="display: flex; margin-bottom: 10px;">
                    <strong style="width: 160px;">Date Of Submission</strong>
                    <span>: ${submissionDate}</span>
                </div>
            </div>
            `;
        }

        // --- Teacher HTML Logic ---
        let teacherHtml = '';
        if (coverType === 'lab_report' && teacherName2) {
             // Two Teachers Logic - Exact match for user request
             teacherHtml = `
                <div style="margin-bottom: 20px;">
                    <strong style="font-size: 14px;">01</strong><br>
                    <div style="padding-left: 0px;">
                        <span style="font-weight: bold; display: inline-block; width: 85px;">Name</span> : <strong>${teacherName}</strong><br>
                        <span style="font-weight: bold; display: inline-block; width: 85px;">Designation</span> : ${teacherDesignation}<br>
                        Department of CSE, Varendra University
                    </div>
                </div>
                <div>
                     <strong style="font-size: 14px;">02</strong><br>
                    <div style="padding-left: 0px;">
                        <span style="font-weight: bold; display: inline-block; width: 85px;">Name</span> : <strong>${teacherName2}</strong><br>
                        <span style="font-weight: bold; display: inline-block; width: 85px;">Designation</span> : ${teacherDesignation2}<br>
                        Department of CSE, Varendra University
                    </div>
                </div>
             `;
        } else {
            // Single Teacher
             teacherHtml = `
                <div style="margin-top: 10px;">
                    <span style="font-weight: bold; display: inline-block; width: 85px;">Name</span> : <strong>${teacherName}</strong><br>
                    <span style="font-weight: bold; display: inline-block; width: 85px;">Designation</span> : ${teacherDesignation}<br>
                    Department of CSE, Varendra University
                </div>
             `;
        }

        const html = `
        <html>
          <head>
            <style>
              @page { size: A4; margin: 0; }
              body { 
                  font-family: 'Times New Roman', serif; 
                  width: 210mm; 
                  height: 297mm;
                  margin: 0 auto;
                  padding: 40px; 
                  box-sizing: border-box;
              }
              .header { 
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center; 
                  border-bottom: 2px solid #000; 
                  padding-bottom: 10px; 
                  margin-bottom: 5px; 
                  width: 100%;
              }
              .logo { height: 60px; width: auto; object-fit: contain; }
              .header-bottom-line { border-bottom: 1px solid #000; margin-bottom: 20px; height: 1px; }
              
              .submission-table { width: 100%; border: 1px solid black; border-collapse: collapse; margin-top: 40px; }
              .submission-table td { border: 1px solid black; padding: 15px; vertical-align: top; width: 50%; }
              
              .footer-sig { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
              .sig-line { border-top: 1px solid black; width: 200px; text-align: center; padding-top: 5px; font-weight: bold; font-size: 12px; }
              .grade-box { border: 1px solid black; width: 120px; height: 35px; }
            </style>
          </head>
          <body>
            <div class="header">
                <img src="${deptLogo}" class="logo" style="height: 70px;" />
                <img src="${vuLogo}" class="logo" style="height: 60px;" />
            </div>
            <div class="header-bottom-line"></div>
            
            ${contentHtml}

            <table class="submission-table">
                <tr>
                    <td style="background-color: #ffffff; text-align: center; font-weight: bold; font-size: 15px;">Submitted By</td>
                    <td style="background-color: #ffffff; text-align: center; font-weight: bold; font-size: 15px;">Submitted To</td>
                </tr>
                <tr>
                    <!-- Submitted By Column -->
                    <td style="font-size: 14px; line-height: 1.6; padding-left: 20px;">
                        <div>
                            <div style="display: inline-block; width: 80px; font-weight: bold;">Name</div> 
                            <div style="display: inline-block; font-weight: bold;">: ${studentName}</div>
                        </div>
                        <div>
                            <div style="display: inline-block; width: 80px; font-weight: bold;">Student ID</div> 
                            <div style="display: inline-block; font-weight: bold;">: ${studentId}</div>
                        </div>
                        <div>
                            <div style="display: inline-block; width: 80px; font-weight: bold;">Section</div> 
                            <div style="display: inline-block; font-weight: bold;">: ${section}</div>
                        </div>
                        <div>
                            <div style="display: inline-block; width: 80px; font-weight: bold;">Semester</div> 
                            <div style="display: inline-block; font-weight: bold;">: ${semester}</div>
                        </div>
                        <div>
                            <div style="display: inline-block; width: 80px; font-weight: bold;">Batch</div> 
                            <div style="display: inline-block; font-weight: bold;">: ${batch}</div>
                        </div>
                        <div style="margin-top: 5px;">Department of CSE, Varendra University</div>
                    </td>
                    
                    <!-- Submitted To Column -->
                    <td style="font-size: 14px; line-height: 1.5; padding-left: 20px;">
                        ${teacherHtml}
                    </td>
                </tr>
            </table>

            <div class="footer-sig">
                <div>
                   <!-- Signature -->
                    <div class="sig-line">Signature of Course Teacher</div>
                    <div style="margin-top: 5px; font-weight: bold; font-size: 13px; text-align: center;">Grade/Mark</div>
                </div>
                <div class="grade-box"></div>
            </div>
          </body>
        </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            
            // Save to history + Download Link
            const newItem = { type: coverType, course: courseCode, date: new Date().toISOString(), uri };
            const updatedHistory = [newItem, ...history];
            setHistory(updatedHistory);
            await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

            setGenerating(false);

            if (Platform.OS === "ios") { await Sharing.shareAsync(uri); } 
            else { await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' }); }
        } catch (error) { 
            setGenerating(false);
            Alert.alert('Error', 'Failed to generate PDF'); 
        }
    };

    const redownloadPdf = (uri: string) => {
        setPendingHistoryUri(uri);
        setHistoryModalVisible(true);
    };

    const executeRedownload = async (uri: string) => {
        if (uri) {
            try {
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            } catch (e) { Alert.alert("Error", "File not found on device."); }
        }
    };

    const startBuilder = (type: 'assignment' | 'lab_report') => {
        setCoverType(type);
        setViewMode('builder');
    };

    const isProfileComplete = user?.department && user?.semester && user?.section;

    if (!isProfileComplete) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                <View style={{ backgroundColor: theme.primary + '15', padding: 25, borderRadius: 100, marginBottom: 25 }}>
                    <Ionicons name="school-outline" size={80} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 12 }}>Academic Profile Incomplete</Text>
                <Text style={{ fontSize: 16, color: theme.icon, textAlign: 'center', marginBottom: 30, lineHeight: 24 }}>Please set your department, semester, and section in your profile to use the Cover Page Builder.</Text>
                <TouchableOpacity 
                    style={{ backgroundColor: theme.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, width: '100%' }}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Set Academic Info Now</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (viewMode === 'home') {
        return (
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Cover Page Builder</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>Select a template to get started</Text>
                </View>

                {/* Options Grid */}
                <View style={styles.grid}>
                    <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.surface }]} onPress={() => startBuilder('assignment')}>
                        <View style={[styles.iconBox, { backgroundColor: '#EF4444' + '15' }]}>
                             <Ionicons name="document-text-outline" size={32} color="#EF4444" />
                        </View>
                        <Text style={[styles.optionTitle, { color: theme.text }]}>Assignment</Text>
                        <Text style={[styles.optionDesc, { color: theme.icon }]}>Standard assignment cover page</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.surface }]} onPress={() => startBuilder('lab_report')}>
                        <View style={[styles.iconBox, { backgroundColor: '#3B82F6' + '15' }]}>
                             <Ionicons name="flask-outline" size={32} color="#3B82F6" />
                        </View>
                        <Text style={[styles.optionTitle, { color: theme.text }]}>Lab Report</Text>
                        <Text style={[styles.optionDesc, { color: theme.icon }]}>Lab report with multiple teachers</Text>
                    </TouchableOpacity>
                </View>

                {/* History */}
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent History</Text>
                {history.length === 0 ? (
                    <View style={[styles.emptyHistory, { borderColor: theme.border }]}>
                        <Text style={{ color: theme.icon }}>No covers generated yet.</Text>
                    </View>
                ) : (
                    history.slice(0, 5).map((item, index) => (
                         <Animated.View entering={FadeInUp.delay(index * 100)} key={index} style={[styles.historyItem, { backgroundColor: theme.surface }]}>
                             <Ionicons name={item.type === 'assignment' ? 'document-text' : 'flask'} size={24} color={theme.primary} />
                             <View style={{ flex: 1 }}>
                                 <Text style={[styles.historyTitle, { color: theme.text }]}>{item.course}</Text>
                                 <Text style={[styles.historySub, { color: theme.icon }]}>
                                     {item.type === 'assignment' ? 'Assignment' : 'Lab Report'} • {new Date(item.date).toLocaleDateString()}
                                 </Text>
                             </View>
                             {/* Re-download Button */}
                             <TouchableOpacity onPress={() => redownloadPdf(item.uri)} style={{ padding: 10 }}>
                                 <Ionicons name="download-outline" size={20} color={theme.text} />
                             </TouchableOpacity>
                         </Animated.View>
                    ))
                )}
            </ScrollView>
        );
    }



    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={[styles.builderHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                <TouchableOpacity onPress={() => setViewMode('home')} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.builderTitle, { color: theme.text }]}>New {coverType === 'assignment' ? 'Assignment' : 'Lab Report'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                keyboardShouldPersistTaps="handled"
            >
                
                {/* 1. Course Selection Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                     <Text style={[styles.sectionHeader, { color: theme.icon }]}>Course Information</Text>
                     <TouchableOpacity 
                        style={[styles.courseSelectorCard, { backgroundColor: theme.primary, shadowColor: theme.primary }]} 
                        onPress={() => setShowCourseModal(true)}
                        activeOpacity={0.9}
                     >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Selected Course</Text>
                                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>
                                    {courseCode || "Select Course"}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '500' }} numberOfLines={1}>
                                    {courseTitle || "Tap to choose from routine"}
                                </Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="library" size={24} color="#FFF" />
                            </View>
                        </View>
                     </TouchableOpacity>
                </Animated.View>

                {/* 2. Details Section */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ marginTop: 25 }}>
                    <Text style={[styles.sectionHeader, { color: theme.icon }]}>{coverType === 'assignment' ? 'Submission Details' : 'Experiment Details'}</Text>
                    
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <View style={{ flex: 0.4 }}>
                                <View style={{ marginBottom: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.icon, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>Exp No.</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48, elevation: 1 }}>
                                        <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
                                            <Ionicons name="flask-outline" size={18} color={theme.primary} />
                                        </View>
                                        <TextInput 
                                            style={{ flex: 1, fontSize: 15, color: theme.text, height: '100%', fontWeight: '500' }} 
                                            value={experimentNo} 
                                            onChangeText={setExperimentNo} 
                                            placeholder="01" 
                                            placeholderTextColor={theme.icon}
                                            keyboardType="numeric"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ marginBottom: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.icon, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>Exp Name</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48, elevation: 1 }}>
                                        <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
                                            <Ionicons name="text-outline" size={18} color={theme.primary} />
                                        </View>
                                        <TextInput 
                                            style={{ flex: 1, fontSize: 15, color: theme.text, height: '100%', fontWeight: '500' }} 
                                            value={experimentName} 
                                            onChangeText={setExperimentName} 
                                            placeholder="Logic Gates" 
                                            placeholderTextColor={theme.icon}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.icon, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>Submission Date</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48, elevation: 1 }}>
                            <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
                                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                            </View>
                            <TextInput 
                                style={{ flex: 1, fontSize: 15, color: theme.text, height: '100%', fontWeight: '500' }} 
                                value={submissionDate} 
                                onChangeText={setSubmissionDate} 
                                placeholder="DD-MM-YYYY" 
                                placeholderTextColor={theme.icon}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>
                    
                    {/* Editable Course Title if needed */}
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.icon, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>Course Title (Editable)</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48, elevation: 1 }}>
                            <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
                                <Ionicons name="book-outline" size={18} color={theme.primary} />
                            </View>
                            <TextInput 
                                style={{ flex: 1, fontSize: 15, color: theme.text, height: '100%', fontWeight: '500' }} 
                                value={courseTitle} 
                                onChangeText={setCourseTitle} 
                                placeholder="Course Title" 
                                placeholderTextColor={theme.icon}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* 3. Teacher Information */}
                <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ marginTop: 10 }}>
                    <Text style={[styles.sectionHeader, { color: theme.icon }]}>Teacher Information {coverType === 'lab_report' && '(01)'}</Text>
                    <View style={[styles.teacherCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.icon, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>Teacher's Name</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48, elevation: 1 }}>
                                <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
                                    <Ionicons name="person-outline" size={18} color={theme.primary} />
                                </View>
                                <TextInput 
                                    style={{ flex: 1, fontSize: 15, color: theme.text, height: '100%', fontWeight: '500' }} 
                                    value={teacherName} 
                                    onChangeText={setTeacherName} 
                                    placeholder="Mr. John Doe" 
                                    placeholderTextColor={theme.icon}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>
                         <View style={{ marginTop: -10 }}>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.icon, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>Designation</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48, elevation: 1 }}>
                                    <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
                                        <Ionicons name="ribbon-outline" size={18} color={theme.primary} />
                                    </View>
                                    <TextInput 
                                        style={{ flex: 1, fontSize: 15, color: theme.text, height: '100%', fontWeight: '500' }} 
                                        value={teacherDesignation} 
                                        onChangeText={setTeacherDesignation} 
                                        placeholder="Lecturer" 
                                        placeholderTextColor={theme.icon}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                         </View>
                    </View>
                </Animated.View>

                {/* 4. Second Teacher (Lab Only) */}
                {coverType === 'lab_report' && (
                    <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ marginTop: 15 }}>
                         <Text style={[styles.sectionHeader, { color: theme.icon }]}>Teacher Information (02) <Text style={{ fontSize: 11, fontWeight: 'normal', opacity: 0.7 }}>(Optional)</Text></Text>
                        <View style={[styles.teacherCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.icon, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>Teacher's Name</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48, elevation: 1 }}>
                                    <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
                                        <Ionicons name="person-outline" size={18} color={theme.primary} />
                                    </View>
                                    <TextInput 
                                        style={{ flex: 1, fontSize: 15, color: theme.text, height: '100%', fontWeight: '500' }} 
                                        value={teacherName2} 
                                        onChangeText={setTeacherName2} 
                                        placeholder="Ms. Jane Doe" 
                                        placeholderTextColor={theme.icon}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                            <View style={{ marginTop: -10 }}>
                                <View style={{ marginBottom: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.icon, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>Designation</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48, elevation: 1 }}>
                                        <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
                                            <Ionicons name="ribbon-outline" size={18} color={theme.primary} />
                                        </View>
                                        <TextInput 
                                            style={{ flex: 1, fontSize: 15, color: theme.text, height: '100%', fontWeight: '500' }} 
                                            value={teacherDesignation2} 
                                            onChangeText={setTeacherDesignation2} 
                                            placeholder="Lecturer" 
                                            placeholderTextColor={theme.icon}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Generate Button */}
                <Animated.View entering={FadeInDown.delay(500).duration(500)}>
                    <TouchableOpacity 
                        style={[styles.generateBtn, { backgroundColor: theme.primary, opacity: generating ? 0.7 : 1, marginTop: 25, shadowColor: theme.primary }]} 
                        onPress={confirmGeneration}
                        disabled={generating}
                        activeOpacity={0.8}
                    >
                        {generating ? (
                            <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 10 }} />
                        ) : (
                            <Ionicons name="print" size={24} color="#FFF" style={{ marginRight: 10 }} />
                        )}
                        <Text style={styles.generateBtnText}>{generating ? "Generating..." : "Generate PDF Cover"}</Text>
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <DownloadModal 
                visible={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={finalGenerate}
                title="Ready to Generate?"
                description={`This will create a PDF for your ${coverType === 'assignment' ? 'Assignment' : 'Lab Report'} in ${courseCode}.`}
                icon="document-text-outline"
            />

            <DownloadModal 
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                onConfirm={() => executeRedownload(pendingHistoryUri)}
                title="Download History"
                description="Would you like to re-download or share this previously generated cover page?"
                icon="time-outline"
            />

            <Modal visible={showCourseModal} transparent animationType="slide" onRequestClose={() => setShowCourseModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Select Course</Text>
                        {filteredCourses.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                                <Ionicons name="documents-outline" size={48} color={theme.icon} style={{ marginBottom: 15 }} />
                                <Text style={{ textAlign: 'center', color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                                    No {coverType === 'lab_report' ? 'Lab' : 'Theory'} Courses Found
                                </Text>
                                <Text style={{ textAlign: 'center', color: theme.icon, marginBottom: 20, lineHeight: 20 }}>
                                    We couldn't find any courses matching your profile. Please check your academic info.
                                </Text>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setShowCourseModal(false);
                                        navigation.navigate('Profile');
                                    }}
                                    style={{ backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Update Profile Info</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredCourses}
                                keyExtractor={(item) => item.code}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={[styles.courseItem, { borderBottomColor: theme.border }]} onPress={() => handleCourseSelect(item)}>
                                        <Text style={[styles.courseCode, { color: theme.primary }]}>{item.code}</Text>
                                        <Text style={[styles.courseTitle, { color: theme.text }]}>{item.title}</Text>
                                        <Text style={[styles.teacherList, { color: theme.icon }]}>
                                            {item.teachers.join(', ')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.border }]} onPress={() => setShowCourseModal(false)}>
                            <Text style={{ color: theme.text }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { marginTop: 20, marginBottom: 30 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
    subtitle: { fontSize: 16 },
    grid: { flexDirection: 'row', gap: 15, marginBottom: 40 },
    optionCard: { flex: 1, padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    iconBox: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    optionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    optionDesc: { fontSize: 12, textAlign: 'center' },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    historyItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 10, gap: 15 },
    historyTitle: { fontSize: 16, fontWeight: 'bold' },
    historySub: { fontSize: 12, marginTop: 2 },
    emptyHistory: { padding: 30, borderWidth: 1, borderStyle: 'dashed', borderRadius: 15, alignItems: 'center' },

    // Builder Styles
    builderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
    backBtn: { padding: 5 },
    builderTitle: { fontSize: 18, fontWeight: 'bold' },
    
    sectionHeader: { fontSize: 14, fontWeight: '700', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    
    courseSelectorCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    
    teacherCard: {
        borderRadius: 20,
        padding: 20,
        paddingBottom: 10,
        marginBottom: 10,
        borderWidth: 1,
    },

    card: { borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: { height: 50, borderRadius: 10, paddingHorizontal: 16, borderWidth: 1, fontSize: 16 },
    inputContainer: { height: 50, borderRadius: 10, paddingHorizontal: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { flexDirection: 'row' },
    generateBtn: { flexDirection: 'row', height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    courseItem: { paddingVertical: 15, borderBottomWidth: 1 },
    courseCode: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    courseTitle: { fontSize: 14, marginBottom: 4 },
    teacherList: { fontSize: 12, fontStyle: 'italic' },
    closeBtn: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },

    // Confirm Modal
    confirmModal: { width: '85%', alignSelf: 'center', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 'auto', marginTop: 'auto' },
    confirmIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    confirmTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    confirmDesc: { textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    confirmActions: { flexDirection: 'row', gap: 15, width: '100%' },
    confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
