import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useState, useEffect } from 'react';
import { Image, Platform, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';
import { Colors } from '../../constants/theme';
import HeaderDateTime from '../components/HeaderDateTime';
import { useTheme } from '../context/ThemeContext';
import BusShuttleScreen from '../screens/BusShuttle';
import RoutineScreen from '../screens/Routine';
import TeacherScreen from '../screens/Teacher';
import HomeScreen from '../screens/Home';
import SettingsScreen from '../screens/Settings';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const { isDark, toggleTheme } = useTheme();
  const { token } = useAuth();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const checkNotifications = async () => {
        try {
            const res = await auth.getAllNotices(token || "guest_token");
            if (res.data?.success && res.data.data.length > 0) {
                const latestId = res.data.data[0]._id;
                const seenId = await AsyncStorage.getItem('last_seen_notice_id');
                setHasUnread(latestId !== seenId);
            }
        } catch (e) {}
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [token]);

  return (
    <Tab.Navigator
        screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerTitle: () => <HeaderDateTime />,
        headerTitleAlign: 'left', // Ensure title is aligned left next to logo
        headerShadowVisible: false,
        headerStyle: {
            backgroundColor: theme.background,
            elevation: 0,
            borderBottomWidth: 0.5,
            borderBottomColor: theme.border,
        },
        headerLeftContainerStyle: {
            paddingLeft: 16,
            paddingRight: 0,
        },
        headerRightContainerStyle: {
            paddingRight: 16,
        },
        headerLeft: () => (
             <Image 
                source={require('../../assets/images/logo.png')} 
                style={{ width: 60, height: 60 }} 
                resizeMode="contain" 
            />
        ),
        headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                 <TouchableOpacity 
                    onPress={toggleTheme} 
                    style={{ 
                        padding: 8, 
                        borderRadius: 20, 
                        backgroundColor: isDark ? '#333' : '#f0f0f0' // Subtle background for consistency
                    }}
                >
                    <Ionicons 
                        name={isDark ? "sunny" : "moon"} // Filled icons look more premium
                        size={20} 
                        color={isDark ? '#FDB813' : '#687076'} 
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                    navigation.navigate('Notifications');
                    setHasUnread(false);
                }}>
                    <View>
                        <Ionicons name="notifications-outline" size={24} color={theme.icon} />
                        {hasUnread && (
                            <View style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: '#EF4444',
                                borderWidth: 2,
                                borderColor: theme.background
                            }} />
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        ),
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.icon,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginBottom: 8,
        },
        tabBarStyle: {
            backgroundColor: theme.background,
            borderTopWidth: 0.5,
            borderTopColor: theme.border,
            height: Platform.OS === 'ios' ? 88 : 70,
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 25 : 10,
            elevation: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.03,
            shadowRadius: 10,
        },
        tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;

            if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Routine') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Teacher') {
              iconName = focused ? 'school' : 'school-outline';
            } else if (route.name === 'Bus Shuttle') {
              iconName = focused ? 'bus' : 'bus-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return (
                <View style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 50,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: focused ? theme.primary + '15' : 'transparent',
                    marginBottom: 4,
                }}>
                    <Ionicons 
                        name={iconName} 
                        size={focused ? 24 : 22} 
                        color={color} 
                    />
                </View>
            );
        },
        })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Routine" component={RoutineScreen} />
      <Tab.Screen name="Teacher" component={TeacherScreen} />
      <Tab.Screen name="Bus Shuttle" component={BusShuttleScreen} />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ headerShown: false }} // Assuming Settings has its own header or we want none
      />
    </Tab.Navigator>
  );
}
