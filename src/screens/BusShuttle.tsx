import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, Platform } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';

export default function BusShuttleScreen() {
  const { isDark } = useTheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);

  // Form States
  const [newSchedule, setNewSchedule] = useState({ tripName: '', fromUni: '', fromCity: '' });
  const [newRoute, setNewRoute] = useState({ routeName: '', stops: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
      try {
          const [scheduleRes, routeRes] = await Promise.all([
              auth.getBusSchedules(),
              auth.getBusRoutes()
          ]);
          
          if (scheduleRes.data.success) setSchedules(scheduleRes.data.data);
          if (routeRes.data.success) setRoutes(routeRes.data.data);
      } catch (error) {
          console.log("Error fetching bus data", error);
      } finally {
          setLoading(false);
          setRefreshing(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, []);

  const onRefresh = () => {
      setRefreshing(true);
      fetchData();
  };

  const handleAddSchedule = async () => {
      if (!newSchedule.tripName) return Alert.alert("Error", "Trip Name is required");
      if (!token) return Alert.alert("Error", "Not authenticated");

      setSubmitting(true);
      try {
        const res = await auth.createBusSchedule(token, newSchedule);
        if (res.data.success) {
            setSchedules([...schedules, res.data.data]);
            setShowAddSchedule(false);
            setNewSchedule({ tripName: '', fromUni: '', fromCity: '' });
        }
      } catch (e) {
          Alert.alert("Error", "Failed to add schedule");
      } finally {
          setSubmitting(false);
      }
  };

  const handleAddRoute = async () => {
    if (!newRoute.routeName || !newRoute.stops) return Alert.alert("Error", "Name and Stops are required");
    if (!token) return Alert.alert("Error", "Not authenticated");
    
    setSubmitting(true);
    try {
      const res = await auth.createBusRoute(token, newRoute);
      if (res.data.success) {
          setRoutes([...routes, res.data.data]);
          setShowAddRoute(false);
          setNewRoute({ routeName: '', stops: '' });
      }
    } catch (e) {
        Alert.alert("Error", "Failed to add route");
    } finally {
        setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
      if (!token) return;
      Alert.alert("Confirm", "Delete this trip?", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: 'destructive', onPress: async () => {
              try {
                  await auth.deleteBusSchedule(token, id);
                  setSchedules(schedules.filter(s => s._id !== id));
              } catch(e) { Alert.alert("Error", "Failed to delete"); }
          }}
      ]);
  };

  const handleDeleteRoute = async (id: string) => {
    if (!token) return;
    Alert.alert("Confirm", "Delete this route?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: 'destructive', onPress: async () => {
            try {
                await auth.deleteBusRoute(token, id);
                setRoutes(routes.filter(r => r._id !== id));
            } catch(e) { Alert.alert("Error", "Failed to delete"); }
        }}
    ]);
  };

  if (loading) {
      return (
          <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={theme.primary} size="large" />
          </View>
      );
  }

  return (
    <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Mobility Hub</Text>
        <Text style={[styles.screenSub, { color: theme.icon }]}>Shuttle & Routes • {routes.length} Pathways</Text>
      </View>

      {/* Routes Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <View style={[styles.sectionIconBox, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="map" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Active Routes</Text>
            </View>
            {user?.role === 'Admin' && (
                <TouchableOpacity onPress={() => setShowAddRoute(true)} style={[styles.addButton, { backgroundColor: theme.primary + '10' }]}>
                    <Ionicons name="add" size={20} color={theme.primary} />
                </TouchableOpacity>
            )}
        </View>

        {routes.length === 0 ? (
            <Text style={{color: theme.icon, fontStyle: 'italic', marginLeft: 4}}>No routes found.</Text>
        ) : (
            routes.map((route) => (
                <View key={route._id} style={[styles.routeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.routeHeader}>
                        <View style={[styles.routeBadge, { backgroundColor: theme.primary }]}>
                            <Ionicons name="bus-outline" size={16} color="#FFF" />
                            <Text style={styles.routeBadgeText}>{route.routeName}</Text>
                        </View>
                        {user?.role === 'Admin' && (
                            <TouchableOpacity onPress={() => handleDeleteRoute(route._id)}>
                                <Ionicons name="trash-outline" size={18} color={theme.error} />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <View style={styles.routeBody}>
                        <Text style={[styles.routeStops, { color: theme.icon }]}>
                            {route.stops}
                        </Text>
                    </View>
                </View>
            ))
        )}
      </View>

      {/* Schedule Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <View style={[styles.sectionIconBox, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="time" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Departure Grid</Text>
            </View>
            {user?.role === 'Admin' && (
                <TouchableOpacity onPress={() => setShowAddSchedule(true)} style={[styles.addButton, { backgroundColor: theme.primary + '10' }]}>
                    <Ionicons name="add" size={20} color={theme.primary} />
                </TouchableOpacity>
            )}
        </View>

        <View style={[styles.tableCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: theme.primary + '10', borderBottomColor: theme.border }]}>
                <Text style={[styles.colTrip, styles.headerText, { color: theme.text }]}>Trip</Text>
                <Text style={[styles.colTime, styles.headerText, { color: theme.text }]}>From Uni</Text>
                <Text style={[styles.colTime, styles.headerText, { color: theme.text }]}>From City</Text>
                {user?.role === 'Admin' && <View style={{width: 30}} />}
            </View>

            {/* Table Body */}
            {schedules.length === 0 ? (
                 <View style={{padding: 20, alignItems: 'center'}}>
                     <Text style={{color: theme.icon}}>No schedules available.</Text>
                 </View>
            ) : (
                schedules.map((item, index) => (
                    <View 
                        key={item._id} 
                        style={[
                            styles.tableRow, 
                            { borderBottomColor: theme.border },
                            index === schedules.length - 1 && { borderBottomWidth: 0 }
                        ]}
                    >
                        <View style={styles.colTrip}>
                            <View style={[styles.tripBadge, { backgroundColor: theme.primary + '20' }]}>
                                <Text style={[styles.tripText, { color: theme.primary }]}>{item.tripName}</Text>
                            </View>
                        </View>
                        <Text style={[styles.colTime, styles.cellText, { color: theme.text }]}>{item.fromUni || '-'}</Text>
                        <Text style={[styles.colTime, styles.cellText, { color: theme.text }]}>{item.fromCity || '-'}</Text>
                        
                        {user?.role === 'Admin' && (
                            <TouchableOpacity onPress={() => handleDeleteSchedule(item._id)} style={{width: 30, alignItems: 'center'}}>
                                <Ionicons name="trash-outline" size={16} color={theme.error} />
                            </TouchableOpacity>
                        )}
                    </View>
                ))
            )}
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* Add Schedule Modal */}
      <Modal visible={showAddSchedule} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalTitle, {color: theme.text}]}>Add New Schedule</Text>
                
                <TextInput 
                    placeholder="Trip Name (e.g. Trip-1)" 
                    placeholderTextColor={theme.icon}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={newSchedule.tripName}
                    onChangeText={t => setNewSchedule({...newSchedule, tripName: t})}
                />
                <TextInput 
                    placeholder="From Uni (e.g. 08:30 AM)" 
                    placeholderTextColor={theme.icon}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={newSchedule.fromUni}
                    onChangeText={t => setNewSchedule({...newSchedule, fromUni: t})}
                />
                <TextInput 
                    placeholder="From City (e.g. 09:15 AM)" 
                    placeholderTextColor={theme.icon}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={newSchedule.fromCity}
                    onChangeText={t => setNewSchedule({...newSchedule, fromCity: t})}
                />

                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setShowAddSchedule(false)} style={styles.btnCancel}>
                        <Text style={{color: theme.icon}}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddSchedule} style={[styles.btnSave, {backgroundColor: theme.primary}]}>
                        {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{color: '#fff', fontWeight: 'bold'}}>Save</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Add Route Modal */}
      <Modal visible={showAddRoute} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalTitle, {color: theme.text}]}>Add New Route</Text>
                
                <TextInput 
                    placeholder="Route Name (e.g. Route-1)" 
                    placeholderTextColor={theme.icon}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={newRoute.routeName}
                    onChangeText={t => setNewRoute({...newRoute, routeName: t})}
                />
                <TextInput 
                    placeholder="Stops (e.g. Stop A -> Stop B)" 
                    placeholderTextColor={theme.icon}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, height: 100 }]}
                    multiline
                    value={newRoute.stops}
                    onChangeText={t => setNewRoute({...newRoute, stops: t})}
                />

                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setShowAddRoute(false)} style={styles.btnCancel}>
                        <Text style={{color: theme.icon}}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddRoute} style={[styles.btnSave, {backgroundColor: theme.primary}]}>
                        {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{color: '#fff', fontWeight: 'bold'}}>Save</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginBottom: 32, marginTop: 20 },
  screenTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  screenSub: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  
  section: { marginBottom: 32 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  addButton: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  tableCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1 },
  tableHeader: { paddingVertical: 12 },
  
  colTrip: { width: '25%', alignItems: 'center', justifyContent: 'center' },
  colTime: { flex: 1, textAlign: 'center' },

  headerText: { fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, textAlign: 'center' },
  cellText: { fontWeight: '700', fontSize: 14 },
  
  tripBadge: { 
    paddingHorizontal: 12, height: 28, borderRadius: 10, 
    alignItems: 'center', justifyContent: 'center' 
  },
  tripText: { fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },

  routeCard: { borderRadius: 24, borderWidth: 1, marginBottom: 16, padding: 20 },
  routeHeader: { flexDirection: 'row', marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' },
  routeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 6 },
  routeBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  routeBody: {},
  routeStops: { fontSize: 15, lineHeight: 24, fontWeight: '500', opacity: 0.8 },

  // Modal STyles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  btnCancel: { padding: 12 },
  btnSave: { padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
});
