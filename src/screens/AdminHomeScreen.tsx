import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

// Imports das telas oficiais do Admin
import AdminServicesScreen from './AdminServicesScreen';
import AdminOperatingHoursScreen from './AdminOperatingHoursScreen';

// Componente temporário apenas para o Painel/Fila
function AppointmentsDashboardScreen() {
  return (
    <View style={styles.centerTab}>
      <FontAwesome5 name="list-alt" size={48} color="#334155" />
      <Text style={styles.tabTitle}>Painel de Agendamentos</Text>
      <Text style={styles.tabSubtitle}>Em breve você verá e gerenciará os agendamentos de todos os clientes aqui.</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function AdminHomeScreen({ navigation }: any) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {/* Header Admin */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="shield-crown" size={24} color="#38bdf8" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Painel Administrador</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome5 name="sign-out-alt" size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Navegação por Abas */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#38bdf8',
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
            if (route.name === 'Fila') {
              return <FontAwesome5 name="tasks" size={size - 2} color={color} />;
            } else if (route.name === 'Serviços') {
              return <FontAwesome5 name="concierge-bell" size={size - 2} color={color} />;
            } else if (route.name === 'Horários') {
              return <FontAwesome5 name="clock" size={size - 2} color={color} />;
            }
          },
        })}
      >
        <Tab.Screen name="Fila" component={AppointmentsDashboardScreen} />
        <Tab.Screen name="Serviços" component={AdminServicesScreen} />
        <Tab.Screen name="Horários" component={AdminOperatingHoursScreen} />
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
  centerTab: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 16,
  },
  tabSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
});