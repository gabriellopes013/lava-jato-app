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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle, Vehicle } from '../services/vehicleService';

export default function GarageScreen({ navigation }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Controle de Edição vs Cadastro
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Campos do formulário
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cor, setCor] = useState('');
  const [categoria, setCategoria] = useState<'pequeno' | 'medio' | 'grande' | 'moto'>('pequeno');

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await getVehicles();
      setVehicles(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os veículos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleOpenAddModal = () => {
    setEditingVehicleId(null);
    setPlaca('');
    setMarca('');
    setModelo('');
    setCor('');
    setCategoria('pequeno');
    setModalVisible(true);
  };

  const handleOpenEditModal = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id || null);
    setPlaca(vehicle.plate);
    setMarca(vehicle.brand);
    setModelo(vehicle.model);
    setCor(vehicle.color || '');
    setCategoria(vehicle.category);
    setModalVisible(true);
  };

  const handleSaveVehicle = async () => {
    if (!placa || !marca || !modelo) {
      Alert.alert('Atenção', 'Preencha a placa, marca e modelo do veículo.');
      return;
    }

    try {
      setSaving(true);

      const vehicleData = {
        plate: placa,
        brand: marca,
        model: modelo,
        color: cor,
        category: categoria,
      };

      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehicleData);
        Alert.alert('Sucesso', 'Veículo atualizado com sucesso!');
      } else {
        await addVehicle(vehicleData);
        Alert.alert('Sucesso', 'Veículo cadastrado na garagem!');
      }

      setModalVisible(false);
      loadVehicles();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao salvar veículo.');
    } finally {
      setSaving(false);
    }
  };

  // Exclusão Direta ao Clicar (Sem Alerta de Confirmação)
  const handleDelete = async (id: string) => {
    try {
      await deleteVehicle(id);
      loadVehicles();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o veículo.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Garagem</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenAddModal}
        >
          <FontAwesome5 name="plus" size={14} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Veículos */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="car" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>Sua garagem está vazia</Text>
          <Text style={styles.emptySubtitle}>Cadastre seus veículos para agilizar seus agendamentos.</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleIconContainer}>
                <FontAwesome5 
                  name={item.category === 'moto' ? 'motorcycle' : 'car'} 
                  size={24} 
                  color="#818cf8" 
                />
              </View>

              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleModel}>{item.brand} {item.model}</Text>
                <Text style={styles.vehicleDetails}>
                  {item.color ? `${item.color} • ` : ''}Categoria: {item.category.toUpperCase()}
                </Text>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{item.plate}</Text>
                </View>
              </View>

              {/* Ações: Editar e Deletar */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={() => handleOpenEditModal(item)}
                  style={styles.actionButton}
                >
                  <FontAwesome5 name="pen" size={14} color="#818cf8" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id!)}
                  style={styles.actionButton}
                >
                  <FontAwesome5 name="trash-alt" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal de Cadastro / Edição */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome5 name="times" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Placa do Veículo *</Text>
              <TextInput
                style={[styles.input, { textTransform: 'uppercase' }]}
                placeholder="ABC-1D23"
                placeholderTextColor="#64748b"
                value={placa}
                onChangeText={(t) => setPlaca(t.toUpperCase())}
                maxLength={8}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Marca *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Fiat"
                  placeholderTextColor="#64748b"
                  value={marca}
                  onChangeText={setMarca}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Modelo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Uno"
                  placeholderTextColor="#64748b"
                  value={modelo}
                  onChangeText={setModelo}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cor</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Preto"
                placeholderTextColor="#64748b"
                value={cor}
                onChangeText={setCor}
              />
            </View>

            {/* Categoria */}
            <Text style={styles.label}>Categoria *</Text>
            <View style={styles.categoryContainer}>
              {(['pequeno', 'medio', 'grande', 'moto'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    categoria === cat && styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategoria(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      categoria === cat && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveVehicle}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving 
                  ? 'Salvando...' 
                  : editingVehicleId ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 24,
  },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleModel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  vehicleDetails: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  plateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  plateText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 14,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 6,
  },
  categoryChip: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  categoryChipSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#312e81',
  },
  categoryChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});