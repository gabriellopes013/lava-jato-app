import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function AdminRegisterScreen({ navigation }) {
  const [empresa, setEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [chave, setChave] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (chave !== 'ADMIN123') {
      Alert.alert('Erro', 'Palavra-chave de administrador inválida.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          role: 'admin',
          company_name: empresa,
          cnpj: cnpj,
          phone: telefone,
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erro no registo', error.message);
    } else {
      Alert.alert('Sucesso', 'Administrador registado com sucesso!');
      navigation.navigate('Login');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.topGradient} />

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="car-wash" size={24} color="#818cf8" />
          </View>
          <Text style={styles.title}>Criar Nova Conta</Text>
          <Text style={styles.subtitle}>Preencha os dados abaixo para registar</Text>
        </View>

        {/* Tipo de Conta */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo de Conta: *</Text>
          <TouchableOpacity 
            style={styles.inputContainer} 
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                'Tipo de Conta',
                'Selecione o perfil que deseja registar:',
                [
                  { text: 'Administrador (Lava Rápido)', style: 'cancel' },
                  { text: 'Cliente (Dono do Veículo)', onPress: () => navigation.replace('ClientRegister') }
                ]
              );
            }}
          >
            <FontAwesome5 name="user-tag" size={16} color="#94a3b8" style={styles.inputIcon} />
            <Text style={styles.inputTextActive}>Administrador (Lava Rápido / Empresa)</Text>
            <FontAwesome5 name="chevron-down" size={14} color="#94a3b8" style={styles.chevron} />
          </TouchableOpacity>
        </View>

        {/* Palavra-chave */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Palavra-chave de Acesso Admin *</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="key" size={16} color="#f59e0b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Chave de verificação"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={chave}
              onChangeText={setChave}
            />
          </View>
          <Text style={styles.helperText}>
            <FontAwesome5 name="shield-alt" size={10} color="#fbbf24" /> Necessária para libertar registo de administradores.
          </Text>
        </View>

        {/* Nome da Empresa */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome da Empresa *</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="building" size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ex: Lava Rápido Express"
              placeholderTextColor="#64748b"
              value={empresa}
              onChangeText={setEmpresa}
            />
          </View>
        </View>

        {/* CNPJ */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CNPJ *</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="id-card" size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="00.000.000/0001-00"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              value={cnpj}
              onChangeText={setCnpj}
            />
          </View>
        </View>

        {/* Telefone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefone / WhatsApp *</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="phone" size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="(31) 99999-9999"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={telefone}
              onChangeText={setTelefone}
            />
          </View>
        </View>

        {/* E-mail */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail *</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="envelope" size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* Senha */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha *</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="lock" size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
          </View>
        </View>

        {/* Botão Cadastrar */}
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <FontAwesome5 name="user-plus" size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>{loading ? 'A registar...' : 'Registar'}</Text>
        </TouchableOpacity>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Já possui uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Faça Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#6366f1', 
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#0f172a',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  inputTextActive: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 10,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(251, 191, 36, 0.8)',
    marginTop: 6,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  footerLink: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '500',
  },
});