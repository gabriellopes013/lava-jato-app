import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function AdminEmployeesScreen() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados do formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [role, setRole] = useState('Lavador');
  const [saving, setSaving] = useState(false);

  // Máscara para CPF: 000.000.000-00
  const handleCpfChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 11);
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    } else if (cleaned.length > 6 && cleaned.length <= 9) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    } else if (cleaned.length > 9) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
    }
    setCpf(formatted);
  };

  // Máscara para Telefone: (00) 00000-0000
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 11);
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 7) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length > 7) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setCpf('');
    setRole('Lavador');
    setModalVisible(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setFullName(item.full_name || '');
    setEmail(item.email || '');
    setPhone(item.phone || '');
    
    const rawCpf = item.cpf || '';
    if (rawCpf.length === 11) {
      setCpf(`${rawCpf.slice(0, 3)}.${rawCpf.slice(3, 6)}.${rawCpf.slice(6, 9)}-${rawCpf.slice(9, 11)}`);
    } else {
      setCpf(rawCpf);
    }

    setRole(item.role || 'Lavador');
    setModalVisible(true);
  };

  const handleSaveEmployee = async () => {
    if (!fullName.trim()) {
      Alert.alert('Atenção', 'Informe o nome do funcionário.');
      return;
    }
    if (!cpf.trim() || cpf.replace(/\D/g, '').length !== 11) {
      Alert.alert('Atenção', 'Informe um CPF válido para o login do funcionário.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        full_name: fullName,
        email,
        phone,
        cpf: cpf.replace(/\D/g, ''),
        role,
      };

      if (editingId) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
        if (error) throw error;
        Alert.alert('Sucesso', 'Funcionário atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('employees').insert([{ ...payload, active: true }]);
        if (error) throw error;
        Alert.alert('Sucesso', 'Funcionário cadastrado com sucesso!');
      }

      setModalVisible(false);
      loadEmployees();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar o funcionário.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadEmployees();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const activeCount = employees.filter((e) => e.active).length;

  return (
    <View style={styles.container}>
      {/* Header Compacto e Responsivo */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>Equipe</Text>
          <Text style={styles.headerSubtitle}>{activeCount} ativos</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreate}>
          <FontAwesome5 name="plus" size={12} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="users" size={48} color="#334155" />
          <Text style={styles.emptyText}>Nenhum funcionário cadastrado.</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const rawCpf = item.cpf || '';
            const formattedCpf = rawCpf.length === 11 
              ? `${rawCpf.slice(0, 3)}.${rawCpf.slice(3, 6)}.${rawCpf.slice(6, 9)}-${rawCpf.slice(9, 11)}` 
              : rawCpf;

            return (
              <TouchableOpacity 
                style={[styles.card, !item.active && { opacity: 0.6 }]}
                activeOpacity={0.8}
                onPress={() => handleOpenEdit(item)}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                    <Text style={styles.employeeName}>{item.full_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderColor: item.active ? '#22c55e' : '#ef4444' }]}>
                      <Text style={[styles.statusText, { color: item.active ? '#22c55e' : '#ef4444' }]}>
                        {item.active ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.employeeDetail}><FontAwesome5 name="briefcase" size={11} color="#94a3b8" /> {item.role}</Text>
                  <Text style={styles.employeeDetail}><FontAwesome5 name="id-card" size={11} color="#94a3b8" /> CPF: {formattedCpf}</Text>
                  <Text style={styles.employeeDetail}><FontAwesome5 name="phone" size={11} color="#94a3b8" /> {item.phone || 'Sem telefone'}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.toggleBtn, item.active ? styles.deactivateBtn : styles.activateBtn]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleActive(item.id, item.active);
                  }}
                >
                  <Text style={styles.toggleBtnText}>{item.active ? 'Desativar' : 'Ativar'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal de Cadastro / Edição com KeyboardAvoidingView e ScrollView */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <ScrollView contentContainerStyle={styles.modalScrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'Editar Funcionário' : 'Novo Funcionário'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome5 name="times" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João da Silva"
                placeholderTextColor="#64748b"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>CPF (Login) *</Text>
              <TextInput
                style={styles.input}
                placeholder="000.000.000-00"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                maxLength={14}
                value={cpf}
                onChangeText={handleCpfChange}
              />

              <Text style={styles.label}>Cargo / Função</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Lavador / Polidor"
                placeholderTextColor="#64748b"
                value={role}
                onChangeText={setRole}
              />

              <Text style={styles.label}>Telefone / WhatsApp</Text>
              <TextInput
                style={styles.input}
                placeholder="(31) 99999-9999"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                maxLength={15}
                value={phone}
                onChangeText={handlePhoneChange}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEmployee} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Salvar Alterações' : 'Cadastrar Funcionário'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8' },
  addBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0284c7', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  addBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#64748b', marginTop: 12, fontSize: 14 },
  card: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 14, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' },
  employeeName: { fontSize: 15, fontWeight: 'bold', color: '#f1f5f9', marginRight: 4 },
  employeeDetail: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  deactivateBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444' },
  activateBtn: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: '#22c55e' },
  toggleBtnText: { fontSize: 11, fontWeight: 'bold', color: '#ffffff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  modalScrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#ffffff', fontSize: 13, marginBottom: 14 },
  saveBtn: { backgroundColor: '#0284c7', height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});