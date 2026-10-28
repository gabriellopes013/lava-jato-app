import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export interface AppointmentAdmin {
  id: string;
  user_name: string;
  user_phone: string;
  plate: string;
  brand: string;
  model: string;
  category: 'pequeno' | 'medio' | 'grande';
  service_title: string;
  price: number;
  date: string;
  time: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado' | string;
}

export default function AdminDashboardScreen() {
  const [appointments, setAppointments] = useState<AppointmentAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Estado para Edição Rápida
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentAdmin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editCategory, setEditCategory] = useState<'pequeno' | 'medio' | 'grande'>('pequeno');
  const [editPrice, setEditPrice] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const { data: rawAppointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          vehicle:vehicles (plate, brand, model, category)
        `);

      if (error) throw error;

      const userIds = Array.from(
        new Set((rawAppointments || []).map((item: any) => item.user_id).filter(Boolean))
      );

      let profilesMap: Record<string, { full_name: string; phone: string }> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);

        (profilesData || []).forEach((p: any) => {
          profilesMap[p.id] = {
            full_name: p.full_name || 'Cliente',
            phone: p.phone || 'Sem telefone',
          };
        });
      }

      const formatted: AppointmentAdmin[] = (rawAppointments || []).map((item: any) => {
        const profile = profilesMap[item.user_id] || { full_name: 'Cliente', phone: 'Sem telefone' };
        const veh = Array.isArray(item.vehicle) ? item.vehicle[0] : item.vehicle;

        return {
          id: item.id,
          user_name: profile.full_name,
          user_phone: profile.phone,
          plate: veh?.plate || 'SEM PLACA',
          brand: veh?.brand || 'Marca',
          model: veh?.model || 'Modelo',
          category: (veh?.category as 'pequeno' | 'medio' | 'grande') || 'pequeno',
          service_title: item.service_title || 'Serviço Geral',
          price: item.price || 0,
          date: item.date || item.appointment_date || item.scheduled_at || '',
          time: item.time || item.scheduled_time || '--:--',
          status: item.status ? String(item.status).toLowerCase() : 'pendente',
        };
      });

      setAppointments(formatted);
    } catch (error: any) {
      console.error('Erro ao carregar fila:', error);
      Alert.alert('Erro', 'Não foi possível carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: AppointmentAdmin['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  };

  const handleOpenEditModal = (app: AppointmentAdmin) => {
    setSelectedAppointment(app);
    setEditCategory(app.category);
    setEditPrice(app.price.toString());
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAppointment) return;

    try {
      setUpdating(true);
      const numericPrice = parseFloat(editPrice) || selectedAppointment.price;

      const { error } = await supabase
        .from('appointments')
        .update({ price: numericPrice })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      Alert.alert('Sucesso', 'Agendamento ajustado!');
      setModalVisible(false);
      loadAppointments();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredAppointments = appointments.filter(
    (app) =>
      app.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalConcluidos = appointments.filter((a) => a.status === 'concluido').length;
  const faturamentoDia = appointments
    .filter((a) => a.status === 'concluido')
    .reduce((sum, a) => sum + a.price, 0);

  // Tratamento seguro do Badge de Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return { label: 'Aguardando', color: '#f59e0b', bg: '#451a03' };
      case 'em_andamento':
      case 'andamento':
        return { label: 'Em Lavagem', color: '#38bdf8', bg: '#0c4a6e' };
      case 'concluido':
      case 'finalizado':
        return { label: 'Concluído', color: '#34d399', bg: '#064e3b' };
      case 'cancelado':
        return { label: 'Cancelado', color: '#f87171', bg: '#450a0a' };
      default:
        return { label: status ? status.toUpperCase() : 'PENDENTE', color: '#f59e0b', bg: '#451a03' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header local simples */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Fila do Dia</Text>
          <Text style={styles.headerSubtitle}>Acompanhamento em Tempo Real</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadAppointments}>
          <FontAwesome5 name="sync-alt" size={14} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Cards de Resumo */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{appointments.length}</Text>
          <Text style={styles.metricLabel}>Agendados</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#34d399' }]}>{totalConcluidos}</Text>
          <Text style={styles.metricLabel}>Concluídos</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#818cf8' }]}>R$ {faturamentoDia.toFixed(0)}</Text>
          <Text style={styles.metricLabel}>Faturado</Text>
        </View>
      </View>

      {/* Campo de Busca */}
      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={14} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por placa, modelo ou cliente..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Fila de Agendamentos */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      ) : filteredAppointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="calendar-times" size={40} color="#334155" />
          <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.timeBadge}>
                    <FontAwesome5 name="clock" size={12} color="#818cf8" style={{ marginRight: 4 }} />
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleTitle}>{item.brand} {item.model}</Text>
                    <Text style={styles.clientName}>
                      <FontAwesome5 name="user" size={11} color="#94a3b8" /> {item.user_name} • {item.user_phone}
                    </Text>
                    <Text style={styles.serviceTitle}>{item.service_title}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={styles.plateTag}>
                      <Text style={styles.plateText}>{item.plate}</Text>
                    </View>
                    <Text style={styles.categoryTag}>
                      {item.category.toUpperCase()}
                    </Text>
                    <Text style={styles.priceText}>R$ {item.price.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionEditBtn}
                    onPress={() => handleOpenEditModal(item)}
                  >
                    <FontAwesome5 name="cog" size={12} color="#818cf8" />
                    <Text style={styles.actionEditBtnText}>Ajustar</Text>
                  </TouchableOpacity>

                  <View style={styles.statusButtonsRow}>
                    {item.status === 'pendente' && (
                      <TouchableOpacity
                        style={[styles.statusBtn, { backgroundColor: '#0284c7' }]}
                        onPress={() => handleUpdateStatus(item.id, 'em_andamento')}
                      >
                        <Text style={styles.statusBtnText}>Iniciar</Text>
                      </TouchableOpacity>
                    )}

                    {(item.status === 'em_andamento' || item.status === 'andamento') && (
                      <TouchableOpacity
                        style={[styles.statusBtn, { backgroundColor: '#16a34a' }]}
                        onPress={() => handleUpdateStatus(item.id, 'concluido')}
                      >
                        <Text style={styles.statusBtnText}>Concluir</Text>
                      </TouchableOpacity>
                    )}

                    {item.status !== 'cancelado' && item.status !== 'concluido' && item.status !== 'finalizado' && (
                      <TouchableOpacity
                        style={[styles.statusBtn, { backgroundColor: '#dc2626', marginLeft: 6 }]}
                        onPress={() => handleUpdateStatus(item.id, 'cancelado')}
                      >
                        <Text style={styles.statusBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal de Edição Rápida */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajustar Agendamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome5 name="times" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSub}>
                Veículo: <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedAppointment?.brand} {selectedAppointment?.model}</Text> ({selectedAppointment?.plate})
              </Text>

              <Text style={styles.label}>Categoria do Carro</Text>
              <View style={styles.categoryContainer}>
                {(['pequeno', 'medio', 'grande'] as const).map((cat) => {
                  const isSelected = editCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                      onPress={() => setEditCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                        {cat.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>Valor do Serviço (R$)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editPrice}
                onChangeText={setEditPrice}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
                disabled={updating}
              >
                <Text style={styles.saveButtonText}>
                  {updating ? 'Salvando...' : 'Confirmar Ajustes'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8' },
  refreshBtn: { width: 36, height: 36, backgroundColor: '#1e293b', borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  metricLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  searchContainer: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, alignItems: 'center', height: 42, marginBottom: 16 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 13 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  timeText: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 10, marginBottom: 10 },
  vehicleTitle: { fontSize: 15, fontWeight: 'bold', color: '#f1f5f9' },
  clientName: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  serviceTitle: { fontSize: 12, color: '#818cf8', fontWeight: '600', marginTop: 4 },
  plateTag: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#4f46e5', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  plateText: { color: '#818cf8', fontWeight: 'bold', fontSize: 11 },
  categoryTag: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginTop: 4 },
  priceText: { fontSize: 15, fontWeight: 'bold', color: '#34d399', marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionEditBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  actionEditBtnText: { color: '#818cf8', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  statusButtonsRow: { flexDirection: 'row' },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  modalSub: { fontSize: 13, color: '#94a3b8', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#cbd5e1', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#ffffff', fontSize: 14 },
  categoryContainer: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  categoryChip: { flex: 1, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  categoryChipSelected: { borderColor: '#4f46e5', backgroundColor: '#312e81' },
  categoryChipText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  categoryChipTextSelected: { color: '#ffffff' },
  saveButton: { backgroundColor: '#4f46e5', height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});