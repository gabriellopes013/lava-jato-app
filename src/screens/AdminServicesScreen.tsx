import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
  ServiceItem,
} from '../services/serviceAdminService';

export default function AdminServicesScreen() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados de Edição/Cadastro
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'pequeno' | 'medio' | 'grande' | 'moto'>('pequeno');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');

  // Função helper segura para exibir alertas tanto na Web quanto no Mobile
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getAdminServices();
      setServices(data);
    } catch (error) {
      showAlert('Erro', 'Não foi possível carregar os serviços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setCategory('pequeno');
    setPrice('');
    setDurationMinutes('30');
    setModalVisible(true);
  };

  const handleOpenEdit = (item: ServiceItem) => {
    setEditingId(item.id || null);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price.toString());
    setDurationMinutes(item.duration_minutes.toString());
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name || !price || !durationMinutes) {
      showAlert('Atenção', 'Preencha o nome, preço e duração.');
      return;
    }

    try {
      setSaving(true);
      const parsedPrice = parseFloat(price.replace(',', '.'));
      const parsedDuration = parseInt(durationMinutes, 10);

      if (editingId) {
        await updateAdminService(editingId, {
          name,
          category,
          price: parsedPrice,
          duration_minutes: parsedDuration,
        });
        showAlert('Sucesso', 'Serviço atualizado!');
      } else {
        await createAdminService({
          name,
          category,
          price: parsedPrice,
          duration_minutes: parsedDuration,
        });
        showAlert('Sucesso', 'Novo serviço cadastrado!');
      }

      setModalVisible(false);
      loadServices();
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao salvar serviço.');
    } finally {
      setSaving(false);
    }
  };

  // Alterna o status instantaneamente sem recarregar a lista inteira
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    // 1. Atualização Otimista na tela (efeito instantâneo)
    setServices((prevServices) =>
      prevServices.map((service) =>
        service.id === id ? { ...service, active: nextStatus } : service
      )
    );

    // 2. Persistência silenciosa no banco de dados
    try {
      await updateAdminService(id, { active: nextStatus });
    } catch (error) {
      // Reverte em caso de falha de rede
      setServices((prevServices) =>
        prevServices.map((service) =>
          service.id === id ? { ...service, active: currentStatus } : service
        )
      );
      showAlert('Erro', 'Não foi possível alterar o status do serviço.');
    }
  };

  // Exclusão Direta ao Clicar
  const handleDelete = async (id: string) => {
    try {
      await deleteAdminService(id);
      loadServices();
    } catch (error) {
      showAlert('Erro', 'Falha ao deletar serviço.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestão de Serviços</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAdd}>
          <FontAwesome5 name="plus" size={14} color="#0f172a" style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Novo Serviço</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
      ) : services.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="concierge-bell" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>Nenhum serviço cadastrado</Text>
          <Text style={styles.emptySubtitle}>Cadastre serviços para permitir que os clientes realizem agendamentos.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.active && styles.cardInactive]}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.serviceDetails}>
                  ⏱ {item.duration_minutes} minutos  •  <Text style={styles.priceText}>R$ {Number(item.price).toFixed(2)}</Text>
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Switch
                  value={item.active}
                  onValueChange={() => handleToggleActive(item.id!, !!item.active)}
                  trackColor={{ false: '#334155', true: '#0284c7' }}
                  thumbColor={item.active ? '#38bdf8' : '#94a3b8'}
                />

                <TouchableOpacity onPress={() => handleOpenEdit(item)} style={styles.actionBtn}>
                  <FontAwesome5 name="pen" size={14} color="#38bdf8" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleDelete(item.id!)} style={styles.actionBtn}>
                  <FontAwesome5 name="trash-alt" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Cadastro/Edição */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar Serviço' : 'Novo Serviço'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome5 name="times" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Nome */}
            <Text style={styles.label}>Nome do Serviço *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Lavagem Completa + Cera"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
            />

            {/* Categoria */}
            <Text style={[styles.label, { marginTop: 12 }]}>Categoria de Veículo *</Text>
            <View style={styles.categoryContainer}>
              {(['pequeno', 'medio', 'grande', 'moto'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipSelected]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preço e Duração */}
            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Preço (R$) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="50.00"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Duração (min) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="40"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveButtonText}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar Serviço' : 'Cadastrar Serviço'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f1f5f9' },
  addButton: { flexDirection: 'row', backgroundColor: '#38bdf8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 16, marginBottom: 12 },
  cardInactive: { opacity: 0.5 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9', marginRight: 8 },
  categoryBadge: { backgroundColor: '#0369a1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryBadgeText: { color: '#e0f2fe', fontSize: 10, fontWeight: 'bold' },
  serviceDetails: { color: '#94a3b8', fontSize: 13 },
  priceText: { color: '#38bdf8', fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  actionBtn: { padding: 8, marginLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#cbd5e1', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, height: 44, color: '#ffffff', fontSize: 14 },
  categoryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  chip: { flex: 1, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 6, paddingVertical: 8, alignItems: 'center', marginHorizontal: 2 },
  chipSelected: { borderColor: '#38bdf8', backgroundColor: '#0369a1' },
  chipText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  chipTextSelected: { color: '#ffffff' },
  rowInputs: { flexDirection: 'row', marginBottom: 16 },
  saveButton: { backgroundColor: '#38bdf8', height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveButtonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
});