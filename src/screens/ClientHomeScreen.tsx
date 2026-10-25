import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

// Import das telas oficiais das abas do cliente
import GarageScreen from './GarageScreen';
import AppointmentsScreen from './AppointmentsScreen';
import ClientProfileScreen from './ClientProfileScreen';

const Tab = createBottomTabNavigator();

export default function ClientHomeScreen({ navigation }: any) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {/* Top Header Compartilhado */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="car-wash" size={24} color="#34d399" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Portal do Cliente</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome5 name="sign-out-alt" size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Navegação por Abas Inferiores */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#34d399',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            backgroundColor: '#1e293b',
            borderTopColor: '#334155',
            height: Platform.OS === 'ios' ? 88 : 64,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Garagem') {
              return <FontAwesome5 name="car" size={size - 2} color={color} />;
            } else if (route.name === 'Agendamentos') {
              return <FontAwesome5 name="calendar-check" size={size - 2} color={color} />;
            } else if (route.name === 'Perfil') {
              return <FontAwesome5 name="user" size={size - 2} color={color} />;
            }
          },
        })}
      >
        <Tab.Screen name="Garagem" component={GarageScreen} />
        <Tab.Screen name="Agendamentos" component={AppointmentsScreen} />
        <Tab.Screen name="Perfil" component={ClientProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
});