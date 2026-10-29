import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function EmployeeHomeScreen({ navigation, route }: any) {
  const employeeId = route?.params?.employeeId || null;

  const [loading, setLoading] = useState(true);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [queueList, setQueueList] = useState<any[]>([]);
  const [employeeName, setEmployeeName] = useState('Funcionário');
  
  // Métricas do funcionário e Histórico do Dia
  const [completedCount, setCompletedCount] = useState(0);
  const [completedListToday, setCompletedListToday] = useState<any[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Estado para busca rápida por Placa
  const [searchPlateInput, setSearchPlateInput] = useState('');
  const [startingByPlate, setStartingByPlate] = useState(false);

  // Alerta universal web/mobile
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const loadEmployeeData = async () => {
    try {
      setLoading(true);

      // 1. Busca dados do funcionário logado
      let activeEmpTargetId = employeeId;
      if (activeEmpTargetId) {
        const { data: empData } = await supabase
          .from('employees')
          .select('*')
          .eq('id', activeEmpTargetId)
          .single();
        if (empData) {
          setEmployeeName(empData.full_name || empData.name || 'Funcionário');
        }
      } else {
        const { data: empData } = await supabase.from('employees').select('*').eq('active', true).limit(1);
        if (empData && empData.length > 0) {
          activeEmpTargetId = empData[0].id;
          setEmployeeName(empData[0].full_name || empData[0].name);
        }
      }

      // 2. Busca o serviço atual em andamento deste funcionário
      if (activeEmpTargetId) {
        const { data: activeTaskData } = await supabase
          .from('appointments')
          .select(`
            *,
            vehicles (brand, model, plate, category)
          `)
          .eq('employee_id', activeEmpTargetId)
          .eq('status', 'in_progress')
          .limit(1);

        if (activeTaskData && activeTaskData.length > 0) {
          let clientName = 'Cliente';
          let clientPhone = '';
          if (activeTaskData[0].user_id) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('full_name, phone, name, telefone')
              .eq('id', activeTaskData[0].user_id)
              .single();
            if (prof) {
              clientName = prof.full_name || prof.name || 'Cliente';
              clientPhone = prof.phone || prof.telefone || '';
            }
          }

          setCurrentTask({
            ...activeTaskData[0],
            client_name: clientName,
            client_phone: clientPhone,
          });
        } else {
          setCurrentTask(null);
        }
      }

      // 3. Busca a fila de veículos no pátio com status 'pending' ou 'in_queue'
      const { data: rawAppointments, error: appErr } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['pending', 'in_queue'])
        .order('scheduled_at', { ascending: true });

      if (appErr) throw appErr;

      const formattedQueue = await Promise.all(
        (rawAppointments || []).map(async (item) => {
          let vehData: any = {};
          let clientName = 'Cliente';

          if (item.vehicle_id) {
            const { data: v } = await supabase.from('vehicles').select('*').eq('id', item.vehicle_id).single();
            if (v) vehData = v;
          }

          if (item.user_id) {
            const { data: p } = await supabase.from('profiles').select('*').eq('id', item.user_id).single();
            if (p) clientName = p.full_name || p.name || p.nome || 'Cliente';
          }

          return {
            ...item,
            vehicles: vehData,
            client_name: clientName,
          };
        })
      );

      setQueueList(formattedQueue);

      // 4. Calcula métricas de lavagens concluídas hoje e monta o histórico detalhado
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: completedData } = await supabase
        .from('appointments')
        .select(`
          *,
          vehicles (brand, model, plate)
        `)
        .eq('status', 'completed');

      if (completedData) {
        const myCompletedToday = completedData.filter((item) => {
          const isToday = item.finished_at ? item.finished_at.startsWith(todayStr) : (item.scheduled_at && item.scheduled_at.startsWith(todayStr));
          const isMine = activeEmpTargetId ? item.employee_id === activeEmpTargetId : true;
          return isToday && isMine;
        });

        setCompletedCount(myCompletedToday.length);
        setCompletedListToday(myCompletedToday);
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados do funcionário:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [employeeId]);

  // Iniciar Serviço digitando a Placa
  const handleStartServiceByPlate = async () => {
    if (currentTask) {
      showAlert('Atenção', 'Você já possui um veículo em atendimento! Finalize o serviço atual antes de iniciar outro.');
      return;
    }

    const plateClean = searchPlateInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!plateClean) {
      showAlert('Atenção', 'Digite a placa do veículo para iniciar o atendimento.');
      return;
    }

    try {
      setStartingByPlate(true);

      const { data: vehiclesData, error: vehErr } = await supabase
        .from('vehicles')
        .select('id, plate')
        .ilike('plate', `%${plateClean}%`);

      if (vehErr) throw vehErr;
      if (!vehiclesData || vehiclesData.length === 0) {
        showAlert('Não encontrado', 'Nenhum veículo cadastrado com esta placa.');
        setStartingByPlate(false);
        return;
      }

      const vehicleIds = vehiclesData.map((v) => v.id);

      const { data: appointmentsData, error: appErr } = await supabase
        .from('appointments')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .in('status', ['pending', 'in_queue'])
        .limit(1);

      if (appErr) throw appErr;
      if (!appointmentsData || appointmentsData.length === 0) {
        showAlert('Não encontrado', 'Este veículo não possui agendamento ativo pendente.');
        setStartingByPlate(false);
        return;
      }

      const targetApp = appointmentsData[0];
      const nowISO = new Date().toISOString();

      // Inicia o serviço, grava o horário de início (started_at), status 'in_progress' e amarra ao funcionário
      const { error: updateErr } = await supabase
        .from('appointments')
        .update({
          status: 'in_progress',
          employee_id: employeeId || null,
          started_at: nowISO,
        })
        .eq('id', targetApp.id);

      if (updateErr) throw updateErr;

      showAlert('Sucesso!', 'Serviço iniciado! Mãos à obra.');
      setSearchPlateInput('');
      loadEmployeeData();
    } catch (err: any) {
      showAlert('Erro', err.message || 'Não foi possível iniciar o atendimento.');
    } finally {
      setStartingByPlate(false);
    }
  };

  // Finalizar Serviço com Cálculo de Tempo
  const handleCompleteService = async (appointmentId: string, startedAtStr?: string) => {
    try {
      const finishedAtDate = new Date();
      const finishedAtISO = finishedAtDate.toISOString();

      const updatePayload: any = {
        status: 'completed',
        finished_at: finishedAtISO,
      };

      // Se houver horário de início registrado, calculamos a duração exata em minutos
      if (startedAtStr) {
        const start = new Date(startedAtStr).getTime();
        const finish = finishedAtDate.getTime();
        const diffMinutes = Math.max(1, Math.floor((finish - start) / (1000 * 60)));
        updatePayload.duration_minutes = diffMinutes;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointmentId);

      if (error) throw error;

      showAlert('Parabéns!', 'Serviço finalizado com sucesso! Funcionário liberado.');
      setCurrentTask(null);
      loadEmployeeData();
    } catch (e: any) {
      showAlert('Erro', e.message || 'Não foi possível finalizar o serviço.');
    }
  };

  const handleLogout = () => {
    if (navigation && typeof navigation.replace === 'function') {
      navigation.replace('Login');
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Login');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header do Funcionário */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.welcomeText}>Olá, {employeeName} 👋</Text>
          <Text style={styles.headerSubtitle}>Painel Operacional da Equipe</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <FontAwesome5 name="sign-out-alt" size={14} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          
          {/* MÉTRICA DE PRODUTIVIDADE CLICÁVEL (ABRE O HISTÓRICO DO DIA) */}
          <TouchableOpacity style={styles.metricsRow} onPress={() => setHistoryModalVisible(true)}>
            <View style={styles.metricCard}>
              <FontAwesome5 name="car-side" size={20} color="#38bdf8" style={{ marginBottom: 6 }} />
              <Text style={styles.metricValue}>{completedCount}</Text>
              <Text style={styles.metricLabel}>Lavagens Realizadas Hoje (Toque para ver histórico)</Text>
            </View>
          </TouchableOpacity>

          {/* BUSCA RÁPIDA POR PLACA PARA INICIAR ATENDIMENTO */}
          <View style={styles.plateSearchBox}>
            <Text style={styles.plateSearchTitle}>🚗 Iniciar Atendimento por Placa</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput
                style={styles.plateInput}
                placeholder="Digite a placa (Ex: ABC-1234)"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                value={searchPlateInput}
                onChangeText={setSearchPlateInput}
              />
              <TouchableOpacity 
                style={[styles.plateBtn, currentTask && { opacity: 0.5 }]} 
                onPress={handleStartServiceByPlate} 
                disabled={startingByPlate}
              >
                {startingByPlate ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.plateBtnText}>Iniciar</Text>
                )}
              </TouchableOpacity>
            </View>
            {currentTask && (
              <Text style={styles.warningLockedText}>⚠️ Você está ocupado com um veículo no momento.</Text>
            )}
          </View>

          {/* Seção 1: Atendimento Atual */}
          <Text style={styles.sectionTitle}>🚗 Veículo em Atendimento Agora</Text>
          {currentTask ? (
            <View style={styles.currentTaskCard}>
              <View style={styles.taskBadge}>
                <Text style={styles.taskBadgeText}>EM ANDAMENTO</Text>
              </View>

              <Text style={styles.carTitle}>
                {currentTask.vehicles?.brand || ''} {currentTask.vehicles?.model || 'Veículo'}
              </Text>
              <View style={styles.plateContainer}>
                <Text style={styles.plateText}>{currentTask.vehicles?.plate || 'SEM PLACA'}</Text>
              </View>

              <Text style={styles.clientInfo}>
                👤 Cliente: {currentTask.client_name} {currentTask.client_phone ? `• 📱 ${currentTask.client_phone}` : ''}
              </Text>
              <Text style={styles.serviceInfo}>✨ Serviço: {currentTask.service_type}</Text>

              <TouchableOpacity
                style={styles.finishBtn}
                onPress={() => handleCompleteService(currentTask.id, currentTask.started_at)}
              >
                <FontAwesome5 name="check-circle" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.finishBtnText}>Finalizar Lavagem</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.freeBox}>
              <FontAwesome5 name="smile" size={28} color="#34d399" style={{ marginBottom: 8 }} />
              <Text style={styles.freeTitle}>Você está livre no momento!</Text>
              <Text style={styles.freeSubtitle}>Digite a placa do veículo acima para puxar para o seu atendimento.</Text>
            </View>
          )}

          {/* Seção 2: Fila de Veículos no Pátio */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📋 Fila de Veículos no Pátio ({queueList.length})</Text>
          {queueList.length === 0 ? (
            <View style={styles.emptyQueueBox}>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum veículo aguardando no pátio.</Text>
            </View>
          ) : (
            queueList.map((item) => (
              <View key={item.id} style={styles.queueCard}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.queueCarTitle}>
                    {item.vehicles?.brand || ''} {item.vehicles?.model || 'Veículo'} ({item.vehicles?.plate || 'PLACA'})
                  </Text>
                  <Text style={styles.queueService}>{item.service_type}</Text>
                  <Text style={styles.queueClient}>Cliente: {item.client_name}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL DE HISTÓRICO DE LAVAGENS DO DIA */}
      <Modal visible={historyModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Histórico de Lavagens de Hoje</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <FontAwesome5 name="times" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {completedListToday.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Nenhuma lavagem concluída hoje ainda.</Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
                {completedListToday.map((item) => (
                  <View key={item.id} style={styles.historyCardItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyCarTitle}>
                        {item.vehicles?.brand || ''} {item.vehicles?.model || 'Veículo'} ({item.vehicles?.plate || 'PLACA'})
                      </Text>
                      <Text style={styles.historyServiceText}>✨ {item.service_type}</Text>
                      <Text style={styles.historyTimeText}>
                        ⏱ Tempo gasto: {item.duration_minutes ? `${item.duration_minutes} min` : 'Não registrado'}
                      </Text>
                    </View>
                    <View style={styles.historyDoneBadge}>
                      <FontAwesome5 name="check" size={10} color="#34d399" />
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setHistoryModalVisible(false)}>
              <Text style={styles.closeModalBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 16 },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  logoutBtn: { width: 36, height: 36, backgroundColor: '#1e293b', borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  metricsRow: { flexDirection: 'row', marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: '#1e293b', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8', marginTop: 2 },
  metricLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center' },

  plateSearchBox: { backgroundColor: '#1e293b', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#0284c7', marginBottom: 20 },
  plateSearchTitle: { fontSize: 13, fontWeight: 'bold', color: '#38bdf8' },
  plateInput: { flex: 1, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#ffffff', fontSize: 13 },
  plateBtn: { backgroundColor: '#0284c7', paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  plateBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  warningLockedText: { color: '#f59e0b', fontSize: 11, marginTop: 8, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
  currentTaskCard: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#0284c7', padding: 16 },
  taskBadge: { backgroundColor: '#0c4a6e', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
  taskBadgeText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  carTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  plateContainer: { backgroundColor: '#0f172a', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#38bdf8', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 10 },
  plateText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 12 },
  clientInfo: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  serviceInfo: { color: '#34d399', fontSize: 13, fontWeight: '600', marginBottom: 16 },
  finishBtn: { flexDirection: 'row', backgroundColor: '#16a34a', height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  finishBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  freeBox: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 24, alignItems: 'center' },
  freeTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  freeSubtitle: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  emptyQueueBox: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  queueCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  queueCarTitle: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 13 },
  queueService: { color: '#38bdf8', fontSize: 12, marginTop: 2 },
  queueClient: { color: '#94a3b8', fontSize: 11, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  historyCardItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  historyCarTitle: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 13 },
  historyServiceText: { color: '#38bdf8', fontSize: 12, marginTop: 2 },
  historyTimeText: { color: '#34d399', fontSize: 11, marginTop: 4, fontWeight: '600' },
  historyDoneBadge: { width: 24, height: 24, backgroundColor: 'rgba(52, 211, 153, 0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#34d399' },
  closeModalBtn: { backgroundColor: '#0284c7', height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  closeModalBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});