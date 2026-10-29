import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function LoginScreen({ navigation }: any) {
  const [emailOrCpf, setEmailOrCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // Alerta universal para Web e Mobile
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    if (!emailOrCpf || !senha) {
      showAlert('Erro', 'Por favor, preencha o e-mail/CPF e a senha.');
      return;
    }

    setLoading(true);

    const cleanInput = emailOrCpf.trim();
    
    // Identifica se é CPF estritamente se tiver 11 dígitos numéricos ou formatação típica de CPF (com ponto/traço e tamanho de CPF)
    const rawNumbers = cleanInput.replace(/\D/g, '');
    const isCpf = rawNumbers.length === 11 && (cleanInput.includes('.') || cleanInput.includes('-') || cleanInput.length === 11);

    // SE FOR CPF -> FLUXO DE LOGIN DE FUNCIONÁRIO
    if (isCpf) {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('cpf', rawNumbers)
        .single();

      setLoading(false);

      if (employeeError || !employeeData) {
        showAlert('Erro no login', 'Funcionário não encontrado com este CPF.');
        return;
      }

      if (!employeeData.active) {
        showAlert('Acesso Negado', 'Sua conta de funcionário está desativada.');
        return;
      }

      if (employeeData.password !== senha) {
        showAlert('Erro no login', 'Senha incorreta.');
        return;
      }

      navigation.replace('EmployeeHome', { employeeId: employeeData.id });
      return;
    }

    // SE FOR E-MAIL -> FLUXO NORMAL DE CLIENTE / ADMIN (VIA SUPABASE AUTH)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanInput,
      password: senha,
    });

    if (authError) {
      setLoading(false);
      showAlert('Erro no login', authError.message);
      return;
    }

    const userId = authData.user.id;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    setLoading(false);

    if (profileError) {
      showAlert('Erro', 'Não foi possível identificar o perfil do usuário.');
      return;
    }

    if (profileData?.role === 'cliente') {
      navigation.replace('ClientHome');
    } else if (profileData?.role === 'admin') {
      navigation.replace('AdminHome');
    } else {
      showAlert('Erro', 'Tipo de conta desconhecido.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topGradient} />

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="car-wash" size={24} color="#818cf8" />
          </View>
          <Text style={styles.title}>Acesso ao Sistema</Text>
          <Text style={styles.subtitle}>Insira suas credenciais para continuar</Text>
        </View>

        {/* E-mail ou CPF */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail ou CPF *</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="user" size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail (Admin/Cliente) ou CPF (Funcionário)"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              value={emailOrCpf}
              onChangeText={setEmailOrCpf}
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

        {/* Botão Entrar */}
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <FontAwesome5 name="sign-in-alt" size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar no Sistema'}</Text>
        </TouchableOpacity>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#10b981',
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