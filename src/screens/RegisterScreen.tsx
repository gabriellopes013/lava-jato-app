import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function RegisterScreen({ navigation }) {
  // Controle do perfil e do Modal Dropdown
  const [tipoConta, setTipoConta] = useState<'admin' | 'cliente'>('admin');
  const [modalVisible, setModalVisible] = useState(false);

  // Estados com os valores limpos (apenas números, enviados ao banco)
  const [chave, setChave] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados com os valores mascarados (apenas exibição visual)
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [telefoneDisplay, setTelefoneDisplay] = useState('');

  // FUNÇÕES DE MÁSCARA
  const handleCpfChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 11);
    setCpf(raw);

    // Formatação visual: 000.000.000-00
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setCpfDisplay(formatted);
  };

  const handleCnpjChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 14);
    setCnpj(raw);

    // Formatação visual: 00.000.000/0001-00
    let formatted = raw;
    if (raw.length > 12) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
    } else if (raw.length > 8) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    } else if (raw.length > 5) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2)}`;
    }
    setCnpjDisplay(formatted);
  };

  const handlePhoneChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 11);
    setTelefone(raw);

    // Formatação visual: (62) 99295-3535 ou (62) 3295-3535
    let formatted = raw;
    if (raw.length > 6) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, raw.length > 10 ? 7 : 6)}-${raw.slice(raw.length > 10 ? 7 : 6)}`;
    } else if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length > 0) {
      formatted = `(${raw}`;
    }
    setTelefoneDisplay(formatted);
  };

  const handleRegister = async () => {
    if (!email || !senha || !telefone) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (tipoConta === 'admin') {
      if (chave !== 'ADMIN123') {
        Alert.alert('Erro', 'Palavra-chave de administrador inválida.');
        return;
      }
      if (!empresa || !cnpj) {
        Alert.alert('Erro', 'Preencha o nome da empresa e o CNPJ.');
        return;
      }
    } else {
      if (!nome || !cpf) {
        Alert.alert('Erro', 'Preencha seu nome completo e CPF.');
        return;
      }
    }

    setLoading(true);

    // Envia os dados com os valores limpos (apenas números em telefone, CPF e CNPJ)
    const metaData = tipoConta === 'admin'
      ? { role: 'admin', company_name: empresa, cnpj: cnpj, phone: telefone }
      : { role: 'cliente', full_name: nome, cpf: cpf, phone: telefone };

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: metaData },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Erro no cadastro', error.message);
    } else {
      Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
      navigation.navigate('Login');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Linha superior com gradiente dinâmico */}
          <View style={[
            styles.topGradient, 
            { backgroundColor: tipoConta === 'admin' ? '#6366f1' : '#34d399' }
          ]} />

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="car-wash" size={24} color="#818cf8" />
            </View>
            <Text style={styles.title}>Criar Nova Conta</Text>
            <Text style={styles.subtitle}>Preencha os dados abaixo para cadastrar</Text>
          </View>

          {/* CAMPO DE SELEÇÃO CUSTOMIZADO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Conta: *</Text>
            <TouchableOpacity 
              style={styles.selectButton} 
              activeOpacity={0.7}
              onPress={() => setModalVisible(true)}
            >
              <FontAwesome5 name="user-tag" size={16} color="#818cf8" style={styles.inputIcon} />
              <Text style={styles.selectButtonText}>
                {tipoConta === 'admin' 
                  ? 'Administrador (Lava Rápido / Empresa)' 
                  : 'Cliente (Dono do Veículo)'}
              </Text>
              <FontAwesome5 name="chevron-down" size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* MODAL DE SELEÇÃO DAS OPÇÕES */}
          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1} 
              onPress={() => setModalVisible(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione o Tipo de Conta</Text>

                <TouchableOpacity 
                  style={[
                    styles.optionButton, 
                    tipoConta === 'admin' && styles.optionButtonSelected
                  ]}
                  onPress={() => {
                    setTipoConta('admin');
                    setModalVisible(false);
                  }}
                >
                  <FontAwesome5 name="user-shield" size={18} color={tipoConta === 'admin' ? '#818cf8' : '#94a3b8'} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Administrador</Text>
                    <Text style={styles.optionSubtitle}>Dono ou gestor do lava-jato / empresa</Text>
                  </View>
                  {tipoConta === 'admin' && <FontAwesome5 name="check" size={16} color="#818cf8" />}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.optionButton, 
                    tipoConta === 'cliente' && styles.optionButtonSelected
                  ]}
                  onPress={() => {
                    setTipoConta('cliente');
                    setModalVisible(false);
                  }}
                >
                  <FontAwesome5 name="car" size={18} color={tipoConta === 'cliente' ? '#34d399' : '#94a3b8'} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Cliente</Text>
                    <Text style={styles.optionSubtitle}>Proprietário do veículo que agendará serviços</Text>
                  </View>
                  {tipoConta === 'cliente' && <FontAwesome5 name="check" size={16} color="#34d399" />}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ================= CAMPOS EXCLUSIVOS DO ADMIN ================= */}
          {tipoConta === 'admin' && (
            <>
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
                  <FontAwesome5 name="shield-alt" size={10} color="#fbbf24" /> Necessária para liberar cadastro de administradores.
                </Text>
              </View>

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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CNPJ *</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="id-card" size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="00.000.000/0001-00"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    value={cnpjDisplay}
                    onChangeText={handleCnpjChange}
                    maxLength={18}
                  />
                </View>
              </View>
            </>
          )}

          {/* ================= CAMPOS EXCLUSIVOS DO CLIENTE ================= */}
          {tipoConta === 'cliente' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Completo *</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="user" size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome completo"
                    placeholderTextColor="#64748b"
                    value={nome}
                    onChangeText={setNome}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CPF *</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="address-card" size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="000.000.000-00"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    value={cpfDisplay}
                    onChangeText={handleCpfChange}
                    maxLength={14}
                  />
                </View>
              </View>
            </>
          )}

          {/* ================= CAMPOS COMPARTILHADOS ================= */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone / WhatsApp *</Text>
            <View style={styles.inputContainer}>
              <FontAwesome5 name="phone" size={16} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="(62) 99295-3535"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={telefoneDisplay}
                onChangeText={handlePhoneChange}
                maxLength={15}
              />
            </View>
          </View>

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
            <Text style={styles.buttonText}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 32,
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  selectButtonText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  optionButtonSelected: {
    borderColor: '#818cf8',
    backgroundColor: '#1e1b4b',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});