import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getClientProfile, updateClientProfile, ClientProfile } from '../services/profileClientService';
import { supabase } from '../services/supabase';

export default function ClientProfileScreen() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getClientProfile();
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as informações do perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!fullName) {
      Alert.alert('Atenção', 'O nome completo não pode ficar em branco.');
      return;
    }

    try {
      setSaving(true);
      await updateClientProfile({
        full_name: fullName,
        phone: phone,
      });
      Alert.alert('Sucesso', 'Perfil do cliente atualizado com sucesso!');
      loadProfile();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('E-mail enviado', 'Verifique sua caixa de entrada para redefinir a senha.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <FontAwesome5 name="user-circle" size={64} color="#34d399" />
          <Text style={styles.userName}>{profile?.full_name || 'Cliente'}</Text>
          <Text style={styles.userRole}>Perfil Cliente</Text>
        </View>

        {/* E-mail (Apenas Leitura) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail</Text>
          <View style={[styles.inputContainer, styles.readOnlyInput]}>
            <FontAwesome5 name="envelope" size={14} color="#64748b" style={styles.icon} />
            <Text style={styles.readOnlyText}>{profile?.email}</Text>
          </View>
        </View>

        {/* CPF (Apenas Leitura) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CPF</Text>
          <View style={[styles.inputContainer, styles.readOnlyInput]}>
            <FontAwesome5 name="id-card" size={14} color="#64748b" style={styles.icon} />
            <Text style={styles.readOnlyText}>{profile?.cpf || 'Não informado'}</Text>
          </View>
        </View>

        {/* Nome Completo (Editável) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo *</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="user" size={14} color="#94a3b8" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Seu nome"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        {/* Telefone (Editável) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefone / WhatsApp</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="phone" size={14} color="#94a3b8" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <FontAwesome5 name="save" size={14} color="#0f172a" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Salvar Alterações'}</Text>
        </TouchableOpacity>

        {/* Redefinição de Senha */}
        <TouchableOpacity style={styles.resetButton} onPress={handlePasswordReset}>
          <FontAwesome5 name="key" size={14} color="#818cf8" style={{ marginRight: 8 }} />
          <Text style={styles.resetButtonText}>Enviar e-mail para redefinir senha</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0f172a',
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    marginTop: 10,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 10,
  },
  userRole: {
    fontSize: 12,
    color: '#34d399',
    fontWeight: '600',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  readOnlyInput: {
    backgroundColor: '#111827',
    borderColor: '#1e293b',
  },
  readOnlyText: {
    color: '#64748b',
    fontSize: 14,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#34d399',
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 15,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
});