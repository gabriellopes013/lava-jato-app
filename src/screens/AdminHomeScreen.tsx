import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

// Imports das telas
import AdminAppointmentsScreen from './AdminAppointmentsScreen';
import AdminQueueScreen from './AdminQueueScreen';
import AdminServicesScreen from './AdminServicesScreen';
import AdminOperatingHoursScreen from './AdminOperatingHoursScreen';
import AdminEmployeesScreen from './AdminEmployeesScreen';

const Drawer = createDrawerNavigator();

// Componente customizado para o menu lateral (para incluir o botão de Sair no rodapé do menu)
function CustomDrawerContent(props: any) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    props.navigation.replace('Login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 20 }}>
        <View style={styles.drawerHeader}>
          <MaterialCommunityIcons name="shield-crown" size={28} color="#38bdf8" style={{ marginRight: 10 }} />
          <View>
            <Text style={styles.drawerTitle}>Painel Admin</Text>
            <Text style={styles.drawerSubtitle}>Gerenciamento</Text>
          </View>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Botão Sair fixo na parte inferior do menu lateral */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome5 name="sign-out-alt" size={16} color="#ef4444" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Encerrar Sessão</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminHomeScreen() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
          borderBottomWidth: 1,
          borderBottomColor: '#334155',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#f1f5f9',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        drawerStyle: {
          backgroundColor: '#0f172a',
          width: 280,
        },
        drawerActiveTintColor: '#38bdf8',
        drawerInactiveTintColor: '#94a3b8',
        drawerActiveBackgroundColor: '#1e293b',
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 12,
          marginVertical: 4,
        },
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
      }}
    >
      <Drawer.Screen 
        name="Agendamentos" 
        component={AdminAppointmentsScreen} 
        options={{
          title: 'Agendamentos',
          drawerIcon: ({ color, size }) => <FontAwesome5 name="calendar-alt" size={size - 4} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="Fila" 
        component={AdminQueueScreen} 
        options={{
          title: 'Fila do Pátio',
          drawerIcon: ({ color, size }) => <FontAwesome5 name="stream" size={size - 4} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="Serviços" 
        component={AdminServicesScreen} 
        options={{
          title: 'Gerenciar Serviços',
          drawerIcon: ({ color, size }) => <FontAwesome5 name="concierge-bell" size={size - 4} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="Horários" 
        component={AdminOperatingHoursScreen} 
        options={{
          title: 'Horários de Funcionamento',
          drawerIcon: ({ color, size }) => <FontAwesome5 name="clock" size={size - 4} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="Funcionarios" 
        component={AdminEmployeesScreen} 
        options={{
          title: 'Funcionários',
          drawerIcon: ({ color, size }) => <FontAwesome5 name="users" size={size - 4} color={color} />,
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  drawerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});