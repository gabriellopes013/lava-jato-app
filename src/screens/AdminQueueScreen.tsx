import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../services/supabase';

export default function AdminQueueScreen({ route, navigation }: any) {
  // Recebe o agendamento vindo da navegação (caso enviado)
  const initialAppointment = route?.params?.appointment;

  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(initialAppointment || null);

  // Carrega a fila de lavagem do banco
  const loadQueue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['pending', 'aguardando', 'em_lavagem', 'finalizado', 'in_progress', 'completed'])
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Se recebemos um item via parâmetro e ele não está na lista selecionada, definimos ele
      if (initialAppointment && !selectedItem) {
        setSelectedItem(initialAppointment);
      }

      setQueueItems(data || []);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Atualiza o status do veículo no Supabase
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setQueueItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );

      if (selectedItem?.id === id) {
        setSelectedItem((prev: any) => ({ ...prev, status: newStatus }));
      }

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        loadQueue();
      }
    } catch (error) {
      console.error('Erro ao mudar status:', error);
    }
  };

  // Helper para rótulo e cor do status
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'in_progress' || s === 'em_lavagem') {
      return { label: 'EM LAVAGEM', bg: '#0284c7', color: '#ffffff' };
    }
    if (s === 'completed' || s === 'finalizado') {
      return { label: 'FINALIZADO', bg: '#16a34a', color: '#ffffff' };
    }
    return { label: 'AGUARDANDO', bg: '#eab308', color: '#0f172a' };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <FontAwesome5 name="arrow-left" size={14} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Fila de Lavagem</Text>
          <Text style={styles.headerSubtitle}>Gerenciamento de pátio e check-in</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadQueue}>
          <FontAwesome5 name="sync-alt" size={14} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Painel do Veículo Selecionado com QR Code Explícito */}
        {selectedItem ? (
          <View style={styles.qrCardContainer}>
            <View style={styles.qrCardHeader}>
              <View>
                <Text style={styles.qrCardTitle}>
                  {selectedItem.brand} {selectedItem.model}
                </Text>
                <Text style={styles.qrCardSub}>
                  {selectedItem.user_name || 'Cliente'} • {selectedItem.user_phone || 'Sem fone'}
                </Text>
              </View>

              <View style={styles.plateBadge}>
                <Text style={styles.plateBadgeText}>{selectedItem.plate || 'SEM PLACA'}</Text>
              </View>
            </View>

            {/* Exibição do QR Code Explícito */}
            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={selectedItem.id}
                size={160}
                color="#0f172a"
                backgroundColor="#ffffff"
              />
              <Text style={styles.qrCodeHint}>Escaneie para validar a entrada no pátio</Text>
            </View>

            {/* Ações de Mudança de Status */}
            <View style={styles.statusActionsRow}>
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: '#eab308' }]}
                onPress={() => handleUpdateStatus(selectedItem.id, 'pending')}
              >
                <Text style={styles.statusBtnText}>Aguardando</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: '#0284c7' }]}
                onPress={() => handleUpdateStatus(selectedItem.id, 'in_progress')}
              >
                <Text style={styles.statusBtnText}>Em Lavagem</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: '#16a34a' }]}
                onPress={() => handleUpdateStatus(selectedItem.id, 'completed')}
              >
                <Text style={styles.statusBtnText}>Finalizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyQrContainer}>
            <FontAwesome5 name="qrcode" size={32} color="#64748b" />
            <Text style={styles.emptyQrText}>Selecione um veículo da fila para ver o QR Code</Text>
          </View>
        )}

        {/* Seção da Lista de Fila */}
        <Text style={styles.sectionTitle}>Veículos no Pátio ({queueItems.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 20 }} />
        ) : queueItems.length === 0 ? (
          <View style={styles.emptyListContainer}>
            <Text style={{ color: '#94a3b8' }}>Nenhum veículo na fila no momento.</Text>
          </View>
        ) : (
          queueItems.map((item) => {
            const badge = getStatusBadge(item.status);
            const isSelected = selectedItem?.id === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.queueItemCard, isSelected && styles.queueItemCardSelected]}
                onPress={() => setSelectedItem(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {item.brand} {item.model}
                  </Text>
                  <Text style={styles.itemSub}>{item.plate} • {item.service_type || 'Serviço'}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.statusTag, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusTagText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.itemPrice}>R$ {parseFloat(item.price || 0).toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 16 },
  backBtn: { width: 36, height: 36, backgroundColor: '#1e293b', borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8' },
  refreshBtn: { width: 36, height: 36, backgroundColor: '#1e293b', borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  
  qrCardContainer: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  qrCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qrCardTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: 'bold' },
  qrCardSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  plateBadge: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#38bdf8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  plateBadgeText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 12 },
  
  qrCodeWrapper: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, alignItems: 'center', alignSelf: 'center', width: '100%' },
  qrCodeHint: { color: '#64748b', fontSize: 11, marginTop: 10, fontWeight: '600' },
  
  statusActionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statusBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 11 },

  emptyQrContainer: { backgroundColor: '#1e293b', borderRadius: 12, padding: 24, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  emptyQrText: { color: '#94a3b8', fontSize: 13, marginTop: 8 },

  sectionTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyListContainer: { paddingVertical: 20, alignItems: 'center' },

  queueItemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  queueItemCardSelected: { borderColor: '#38bdf8', backgroundColor: '#162032' },
  itemTitle: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 14 },
  itemSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  statusTagText: { fontSize: 10, fontWeight: 'bold' },
  itemPrice: { color: '#34d399', fontSize: 13, fontWeight: 'bold' },
});