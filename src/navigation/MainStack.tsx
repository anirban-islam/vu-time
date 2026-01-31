import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AppTabs from './AppTabs';
import HeaderDateTime from '../components/HeaderDateTime';
import NoticeDashboardScreen from '../screens/NoticeDashboard';
import StudentDashboardScreen from '../screens/StudentDashboard';
import CoverPageBuilderScreen from '../screens/CoverPageBuilder';
import ResourcesScreen from '../screens/Resources';
import MyCoursesScreen from '../screens/MyCourses';
import NoticeListScreen from '../screens/NoticeList';
import NotificationsScreen from '../screens/Notifications';
import CRListScreen from '../screens/CRList';
import SettingsScreen from '../screens/Settings';
import ProfileDetailsScreen from '../screens/ProfileDetails';
import ManageResourcesScreen from '../screens/ManageResources';
import AdminDashboardScreen from '../screens/AdminDashboard';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Platform } from 'react-native';

const Stack = createNativeStackNavigator();

export default function MainStack() {
    const { isDark } = useTheme();
    const theme = Colors[isDark ? 'dark' : 'light'];
  
    return (
      <Stack.Navigator>
        <Stack.Screen 
          name="MainTabs" 
          component={AppTabs} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Notices" 
          component={NoticeListScreen}
          options={{
            headerShown: true,
            title: 'Notice Board',
            headerStyle: {
                backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
            headerShadowVisible: false,
            headerTitleStyle: {
                fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen}
          options={{
            headerShown: true,
            title: 'Notifications',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            headerShown: true,
            title: 'Settings',
            headerStyle: {
                backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
            headerShadowVisible: false,
            headerTitleStyle: {
                fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="NoticeDashboard" 
          component={NoticeDashboardScreen}
          options={{
            headerShown: true,
            title: 'Notice Dashboard',
            headerStyle: {
                backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="StudentDashboard" 
          component={StudentDashboardScreen}
          options={{
            headerShown: true,
            title: 'Student Dashboard',
            headerStyle: {
                backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="CoverPageBuilder" 
          component={CoverPageBuilderScreen}
          options={{
            headerShown: true,
            title: 'Cover Page Builder',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="CRList" 
          component={CRListScreen}
          options={{
            headerShown: true,
            title: 'Class Representatives',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="Resources" 
          component={ResourcesScreen}
          options={{
            headerShown: true,
            title: 'Student Resources',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="MyCourses" 
          component={MyCoursesScreen}
          options={{
            headerShown: true,
            title: 'My Courses & Stats',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileDetailsScreen}
          options={{
            headerShown: true,
            title: 'Profile Details',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="ManageResources" 
          component={ManageResourcesScreen}
          options={{
            headerShown: true,
            title: 'Manage Resources',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboardScreen}
          options={{
            headerShown: true,
            title: 'Admin Dashboard',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
      </Stack.Navigator>
    );
}
