import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  Animated,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle, Vehicle } from '../services/vehicleService';

// Base inicial estática
const BASE_VEHICLES: Record<string, { model: string; category: 'pequeno' | 'medio' | 'grande' }[]> = {
  Chevrolet: [
    { model: 'Onix (Hatch)', category: 'pequeno' },
    { model: 'Onix Plus (Sedan)', category: 'medio' },
    { model: 'Tracker (SUV)', category: 'medio' },
    { model: 'Cruze (Sedan / Hatch)', category: 'medio' },
    { model: 'Equinox (SUV Grande)', category: 'grande' },
    { model: 'S10 (Picape)', category: 'grande' },
    { model: 'Montana (Picape)', category: 'grande' },
  ],
  Fiat: [
    { model: 'Mobi (Hatch)', category: 'pequeno' },
    { model: 'Argo (Hatch)', category: 'pequeno' },
    { model: 'Cronos (Sedan)', category: 'medio' },
    { model: 'Pulse (SUV)', category: 'medio' },
    { model: 'Fastback (SUV)', category: 'medio' },
    { model: 'Toro (Picape)', category: 'grande' },
    { model: 'Strada (Picape)', category: 'medio' },
  ],
  Volkswagen: [
    { model: 'Gol / Polo (Hatch)', category: 'pequeno' },
    { model: 'Virtus (Sedan)', category: 'medio' },
    { model: 'Nivus (SUV)', category: 'medio' },
    { model: 'T-Cross (SUV)', category: 'medio' },
    { model: 'Taos (SUV Grande)', category: 'grande' },
    { model: 'Amarok (Picape)', category: 'grande' },
  ],
  Toyota: [
    { model: 'Yaris (Hatch)', category: 'pequeno' },
    { model: 'Yaris (Sedan)', category: 'medio' },
    { model: 'Corolla (Sedan)', category: 'medio' },
    { model: 'Corolla Cross (SUV)', category: 'medio' },
    { model: 'Hilux (Picape)', category: 'grande' },
    { model: 'SW4 (SUV Grande)', category: 'grande' },
  ],
  Jeep: [
    { model: 'Renegade (SUV)', category: 'medio' },
    { model: 'Compass (SUV)', category: 'medio' },
    { model: 'Commander (SUV 7L)', category: 'grande' },
  ],
  Ford: [
    { model: 'Ka (Hatch)', category: 'pequeno' },
    { model: 'Ka+ (Sedan)', category: 'medio' },
    { model: 'Territory (SUV)', category: 'grande' },
    { model: 'Maverick (Picape)', category: 'grande' },
    { model: 'Ranger (Picape)', category: 'grande' },
  ],
  Honda: [
    { model: 'City (Hatch)', category: 'pequeno' },
    { model: 'City (Sedan)', category: 'medio' },
    { model: 'Civic (Sedan)', category: 'medio' },
    { model: 'HR-V (SUV)', category: 'medio' },
    { model: 'CR-V (SUV Grande)', category: 'grande' },
  ],
  Hyundai: [
    { model: 'HB20 (Hatch)', category: 'pequeno' },
    { model: 'HB20S (Sedan)', category: 'medio' },
    { model: 'Creta (SUV)', category: 'medio' },
    { model: 'Tucson (SUV Grande)', category: 'grande' },
  ],
  Nissan: [
    { model: 'March (Hatch)', category: 'pequeno' },
    { model: 'Versa (Sedan)', category: 'medio' },
    { model: 'Kicks (SUV)', category: 'medio' },
    { model: 'Frontier (Picape)', category: 'grande' },
  ],
  Renault: [
    { model: 'Kwid / Sandero (Hatch)', category: 'pequeno' },
    { model: 'Logan (Sedan)', category: 'medio' },
    { model: 'Duster (SUV)', category: 'medio' },
    { model: 'Oroch (Picape)', category: 'grande' },
  ],
};

export default function GarageScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dynamicDatabase, setDynamicDatabase] = useState(BASE_VEHICLES);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Campos do formulário
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cor, setCor] = useState('');
  const [categoria, setCategoria] = useState<'pequeno' | 'medio' | 'grande'>('pequeno');

  // Controle dos Dropdowns
  const [showMarcaDropdown, setShowMarcaDropdown] = useState(false);
  const [showModeloDropdown, setShowModeloDropdown] = useState(false);

  // Animações Fade-In (1000ms) dos Campos Sequenciais
  const fadeMarcaInput = useRef(new Animated.Value(0)).current;
  const fadeModeloInput = useRef(new Animated.Value(0)).current;
  const fadeRestInput = useRef(new Animated.Value(0)).current;

  // Animações Fade-In dos Dropdowns
  const fadeMarcaDropdown = useRef(new Animated.Value(0)).current;
  const fadeModeloDropdown = useRef(new Animated.Value(0)).current;

  const triggerFade = (animVal: Animated.Value) => {
    animVal.setValue(0);
    const useNative = Platform.OS !== 'web';
    Animated.timing(animVal, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: useNative,
    }).start();
  };

  // Carrega os veículos cadastrados e mescla com a base de sugestões
  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await getVehicles();
      setVehicles(data);

      // Mescla novos modelos cadastrados por clientes na base de aprendizado do app
      const updatedDB = { ...BASE_VEHICLES };

      data.forEach((v) => {
        if (v.brand && v.model) {
          const brandFormatted = v.brand.trim();
          const categoryValid = (v.category as 'pequeno' | 'medio' | 'grande') || 'pequeno';

          if (!updatedDB[brandFormatted]) {
            updatedDB[brandFormatted] = [];
          }

          const exists = updatedDB[brandFormatted].some((m) => m.model.toLowerCase() === v.model.toLowerCase());
          if (!exists) {
            updatedDB[brandFormatted].push({
              model: v.model,
              category: categoryValid,
            });
          }
        }
      });

      setDynamicDatabase(updatedDB);
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
    setShowMarcaDropdown(false);
    setShowModeloDropdown(false);

    fadeMarcaInput.setValue(0);
    fadeModeloInput.setValue(0);
    fadeRestInput.setValue(0);

    setModalVisible(true);
  };

  const handleOpenEditModal = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id || null);
    setPlaca(vehicle.plate);
    setMarca(vehicle.brand);
    setModelo(vehicle.model);
    setCor(vehicle.color || '');
    setCategoria((vehicle.category as 'pequeno' | 'medio' | 'grande') || 'pequeno');
    setShowMarcaDropdown(false);
    setShowModeloDropdown(false);

    fadeMarcaInput.setValue(1);
    fadeModeloInput.setValue(1);
    fadeRestInput.setValue(1);

    setModalVisible(true);
  };

  // 1. Digitação da Placa (Revela Marca)
  const handlePlacaChange = (text: string) => {
    const formatted = text.toUpperCase();
    setPlaca(formatted);
    if (formatted.length >= 7 && fadeMarcaInput._value === 0) {
      triggerFade(fadeMarcaInput);
    }
  };

  // 2. Digitação da Marca (Revela Modelo)
  const handleMarcaChange = (text: string) => {
    setMarca(text);
    setModelo('');
    if (text.length > 0) {
      if (!showMarcaDropdown) {
        setShowMarcaDropdown(true);
        triggerFade(fadeMarcaDropdown);
      }
      if (fadeModeloInput._value === 0) {
        triggerFade(fadeModeloInput);
      }
    } else {
      setShowMarcaDropdown(false);
    }
  };

  const handleSelectMarca = (brandName: string) => {
    setMarca(brandName);
    setShowMarcaDropdown(false);
    setModelo('');
    if (fadeModeloInput._value === 0) {
      triggerFade(fadeModeloInput);
    }
  };

  // 3. Digitação do Modelo (Revela Cor e Categoria)
  const handleModeloChange = (text: string) => {
    setModelo(text);
    if (text.length > 0) {
      if (!showModeloDropdown) {
        setShowModeloDropdown(true);
        triggerFade(fadeModeloDropdown);
      }
      if (fadeRestInput._value === 0) {
        triggerFade(fadeRestInput);
      }
    } else {
      setShowModeloDropdown(false);
    }
  };

  const handleSelectModeloObject = (item: { model: string; category: 'pequeno' | 'medio' | 'grande' }) => {
    setModelo(item.model);
    setCategoria(item.category);
    setShowModeloDropdown(false);
    if (fadeRestInput._value === 0) {
      triggerFade(fadeRestInput);
    }
  };

  const handleSaveVehicle = async () => {
    if (!placa || !marca || !modelo) {
      Alert.alert('Atenção', 'Preencha a placa, marca e modelo do veículo.');
      return;
    }

    try {
      setSaving(true);

      const vehicleData = {
        plate: placa.toUpperCase(),
        brand: marca.trim(),
        model: modelo.trim(),
        color: cor.trim(),
        category: categoria,
      };

      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehicleData);
      } else {
        await addVehicle(vehicleData);
      }

      setModalVisible(false);
      loadVehicles(); // Recarrega e inclui o novo modelo na base de dados
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao salvar veículo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVehicle(id);
      loadVehicles();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o veículo.');
    }
  };

  const filteredBrands = Object.keys(dynamicDatabase).filter((b) =>
    b.toLowerCase().includes(marca.toLowerCase())
  );

  const availableModels = dynamicDatabase[marca] || [];
  const filteredModels = availableModels.filter((m) =>
    m.model.toLowerCase().includes(modelo.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Garagem</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
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
                <FontAwesome5 name="car" size={24} color="#818cf8" />
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

              <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.actionButton}>
                  <FontAwesome5 name="pen" size={14} color="#818cf8" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleDelete(item.id!)} style={styles.actionButton}>
                  <FontAwesome5 name="trash-alt" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal de Cadastro Sequencial com Fade-In */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* CAMPO 1: Placa (Sempre visível) */}
              <Text style={styles.label}>1. Placa do Veículo *</Text>
              <TextInput
                style={[styles.input, { textTransform: 'uppercase', fontWeight: 'bold' }]}
                placeholder="ABC1D23"
                placeholderTextColor="#64748b"
                value={placa}
                onChangeText={handlePlacaChange}
                maxLength={8}
              />

              {/* CAMPO 2: Marca (Aparece em Fade-In ao digitar a Placa) */}
              {(placa.length >= 7 || editingVehicleId) && (
                <Animated.View style={{ opacity: fadeMarcaInput }}>
                  <Text style={[styles.label, { marginTop: 12 }]}>2. Marca *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Digite a marca (ex: Chevrolet, Toyota)..."
                    placeholderTextColor="#64748b"
                    value={marca}
                    onChangeText={handleMarcaChange}
                    onFocus={() => {
                      if (marca.length > 0) {
                        setShowMarcaDropdown(true);
                        triggerFade(fadeMarcaDropdown);
                      }
                    }}
                  />

                  {showMarcaDropdown && filteredBrands.length > 0 && (
                    <Animated.View style={[styles.dropdownList, { opacity: fadeMarcaDropdown }]}>
                      <ScrollView style={{ maxHeight: 130 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {filteredBrands.map((brandKey) => (
                          <TouchableOpacity
                            key={brandKey}
                            style={styles.dropdownItem}
                            onPress={() => handleSelectMarca(brandKey)}
                          >
                            <Text style={styles.dropdownItemText}>{brandKey}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  )}
                </Animated.View>
              )}

              {/* CAMPO 3: Modelo (Aparece em Fade-In ao digitar a Marca) */}
              {(marca.length >= 1 || editingVehicleId) && (
                <Animated.View style={{ opacity: fadeModeloInput }}>
                  <Text style={[styles.label, { marginTop: 12 }]}>3. Modelo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Digite o modelo (ex: Onix, Corolla)..."
                    placeholderTextColor="#64748b"
                    value={modelo}
                    onChangeText={handleModeloChange}
                    onFocus={() => {
                      if (modelo.length > 0) {
                        setShowModeloDropdown(true);
                        triggerFade(fadeModeloDropdown);
                      }
                    }}
                  />

                  {showModeloDropdown && filteredModels.length > 0 && (
                    <Animated.View style={[styles.dropdownList, { opacity: fadeModeloDropdown }]}>
                      <ScrollView style={{ maxHeight: 130 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {filteredModels.map((item, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.dropdownItem}
                            onPress={() => handleSelectModeloObject(item)}
                          >
                            <Text style={styles.dropdownItemText}>{item.model} ({item.category.toUpperCase()})</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  )}
                </Animated.View>
              )}

              {/* CAMPO 4 & 5: Cor e Categoria (Aparecem em Fade-In ao digitar o Modelo) */}
              {(modelo.length >= 1 || editingVehicleId) && (
                <Animated.View style={{ opacity: fadeRestInput }}>
                  <Text style={[styles.label, { marginTop: 12 }]}>Cor</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Preto, Branco, Prata"
                    placeholderTextColor="#64748b"
                    value={cor}
                    onChangeText={setCor}
                  />

                  <Text style={[styles.label, { marginTop: 16 }]}>Categoria do Veículo *</Text>
                  <View style={styles.categoryContainer}>
                    {(['pequeno', 'medio', 'grande'] as const).map((cat) => {
                      const isSelected = categoria === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                          onPress={() => setCategoria(cat)}
                        >
                          <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                            {cat.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveVehicle} disabled={saving}>
                    <Text style={styles.saveButtonText}>
                      {saving ? 'Salvando...' : editingVehicleId ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f1f5f9' },
  addButton: { flexDirection: 'row', backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 6 },
  listContent: { paddingBottom: 24 },
  vehicleCard: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 16, marginBottom: 12, alignItems: 'center' },
  vehicleIconContainer: { width: 48, height: 48, backgroundColor: '#0f172a', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  vehicleInfo: { flex: 1 },
  vehicleModel: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  vehicleDetails: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  plateBadge: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#4f46e5', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6 },
  plateText: { color: '#818cf8', fontSize: 12, fontWeight: 'bold' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: 8, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155', padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#cbd5e1', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, height: 44, color: '#ffffff', fontSize: 14 },
  dropdownList: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#4f46e5', borderRadius: 8, marginTop: 4 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  dropdownItemText: { color: '#ffffff', fontSize: 13 },
  categoryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 6 },
  categoryChip: { flex: 1, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 6, paddingVertical: 8, alignItems: 'center', marginHorizontal: 2 },
  categoryChipSelected: { borderColor: '#4f46e5', backgroundColor: '#312e81' },
  categoryChipText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  categoryChipTextSelected: { color: '#ffffff' },
  saveButton: { backgroundColor: '#4f46e5', height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});