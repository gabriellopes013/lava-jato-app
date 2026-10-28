import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../services/supabase';

export default function AdminQueueScreen() {
  const [activeTab, setActiveTab] = useState<'in_queue' | 'in_progress' | 'completed'>('in_queue');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getTodayISO = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const loadQueueData = async () => {
    try {
      setLoading(true);

      const { data: rawAppointments, error } = await supabase.from('appointments').select('*');
      if (error) throw error;

      // Busca os veículos e perfis de forma segura um a um ou em lote limpo
      const formatted = await Promise.all(
        (rawAppointments || []).map(async (item: any) => {
          let veh: any = {};
          let prof: any = {};

          if (item.vehicle_id) {
            const { data: vData } = await supabase.from('vehicles').select('*').eq('id', item.vehicle_id).single();
            if (vData) veh = vData;
          }

          if (item.user_id) {
            const { data: pData } = await supabase.from('profiles').select('*').eq('id', item.user_id).single();
            if (pData) prof = pData;
          }

          let dateISO = '';
          if (item.scheduled_at) {
            const d = new Date(item.scheduled_at);
            if (!isNaN(d.getTime())) {
              dateISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
          }

          let durationText = '--';
          if (item.started_at && item.finished_at) {
            const start = new Date(item.started_at).getTime();
            const finish = new Date(item.finished_at).getTime();
            const diffMinutes = Math.floor((finish - start) / (1000 * 60));
            durationText = diffMinutes >= 60 ? `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}min` : `${diffMinutes} min`;
          }

          return {
            id: item.id,
            user_name: prof.full_name || item.user_name || 'Cliente Sem Nome',
            user_phone: prof.phone || item.user_phone || 'Sem telefone',
            plate: (veh.plate || item.plate || 'SEM PLACA').toUpperCase(),
            brand: veh.brand || item.brand || '',
            model: veh.model || item.model || 'Veículo',
            service_title: item.service_type || 'Serviço Geral',
            status: item.status || 'pending',
            dateStr: dateISO,
            washer_name: item.washer_name || 'Lavador Automático',
            durationText,
          };
        })
      );

      setAppointments(formatted);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueueData(); }, []);

  const todayStr = getTodayISO();

  const waitingList = appointments.filter((a) => a.dateStr === todayStr && a.status === 'in_queue');
  const washingList = appointments.filter((a) => a.dateStr === todayStr && a.status === 'in_progress');
  const finishedList = appointments.filter((a) => a.dateStr === todayStr && a.status === 'completed');

  const currentList = activeTab === 'in_queue' ? waitingList : activeTab === 'in_progress' ? washingList : finishedList;

  return (
    <View style={styles.container}>
      {/* Header alinhado corretamente igual às outras telas */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Painel do Pátio</Text>
          <Text style={styles.headerSubtitle}>Monitor de Operação (Check-ins do Dia)</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadQueueData}>
          <FontAwesome5 name="sync-alt" size={14} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Navegação de Abas Responsiva */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'in_queue' && styles.tabItemActive]} 
          onPress={() => setActiveTab('in_queue')}
        >
          <FontAwesome5 name="clock" size={12} color={activeTab === 'in_queue' ? '#38bdf8' : '#94a3b8'} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, activeTab === 'in_queue' && styles.tabTextActive]} numberOfLines={1}>
            Aguardando ({waitingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'in_progress' && styles.tabItemActive]} 
          onPress={() => setActiveTab('in_progress')}
        >
          <FontAwesome5 name="soap" size={12} color={activeTab === 'in_progress' ? '#0284c7' : '#94a3b8'} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, activeTab === 'in_progress' && styles.tabTextActive]} numberOfLines={1}>
            Lavando ({washingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'completed' && styles.tabItemActive]} 
          onPress={() => setActiveTab('completed')}
        >
          <FontAwesome5 name="check-circle" size={12} color={activeTab === 'completed' ? '#22c55e' : '#94a3b8'} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]} numberOfLines={1}>
            Prontos ({finishedList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#38bdf8" /></View>
      ) : currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="inbox" size={48} color="#334155" />
          <Text style={styles.emptyText}>Nenhum veículo nesta fase.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {currentList.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <View style={styles.plateTag}><Text style={styles.plateText}>{item.plate}</Text></View>
                <Text style={styles.vehicleTitle}>{item.brand ? `${item.brand} ` : ''}{item.model}</Text>
                <Text style={styles.detailText}><FontAwesome5 name="phone" size={12} color="#94a3b8" /> {item.user_phone}</Text>
                <Text style={styles.serviceText}>Serviço: {item.service_title}</Text>
                
                {activeTab !== 'in_queue' && (
                  <Text style={styles.washerText}><FontAwesome5 name="user-cog" size={12} color="#38bdf8" /> Responsável: {item.washer_name}</Text>
                )}
                {activeTab === 'completed' && (
                  <Text style={styles.durationText}><FontAwesome5 name="stopwatch" size={12} color="#22c55e" /> Tempo: {item.durationText}</Text>
                )}
              </View>

              {activeTab === 'in_queue' && (
                <View style={styles.qrWrapper}>
                  <QRCode value={item.id} size={110} color="#0f172a" backgroundColor="#ffffff" />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 16 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8' },
  refreshBtn: { 
    width: 36, 
    height: 36, 
    backgroundColor: '#1e293b', 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: '#334155' 
  },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: '#1e293b', 
    borderRadius: 12, 
    padding: 4, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#334155',
    gap: 4
  },
  tabItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 4,
    borderRadius: 8 
  },
  tabItemActive: { 
    backgroundColor: '#0f172a', 
    borderWidth: 1, 
    borderColor: '#38bdf8' 
  },
  tabText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: 'bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#64748b', marginTop: 12, fontSize: 16 },
  card: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1, borderColor: '#334155', padding: 16, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: 12 },
  plateTag: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#38bdf8', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  plateText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  vehicleTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  detailText: { color: '#cbd5e1', fontSize: 13, marginTop: 2 },
  serviceText: { color: '#38bdf8', fontSize: 13, fontWeight: '600', marginTop: 4 },
  washerText: { color: '#93c5fd', fontSize: 13, fontWeight: '600', marginTop: 6 },
  durationText: { color: '#4ade80', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  qrWrapper: { backgroundColor: '#ffffff', padding: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});