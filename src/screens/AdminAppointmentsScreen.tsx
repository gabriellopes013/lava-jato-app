import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { allocateEmployeeByTimeSlot } from '../services/appointmentService';

export interface Appointment {
  id: string;
  user_name: string;
  user_phone: string;
  plate: string;
  brand: string;
  model: string;
  category: string;
  service_title: string;
  price: number;
  dateStr: string;
  dateFormatted: string;
  time: string;
  status: string;
  employee_name?: string;
}

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

export default function AdminAppointmentsScreen({ navigation }: any) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modais
  const [cancelledModalVisible, setCancelledModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // Navegação do Calendário
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Estado do Modal de Outras Datas
  const [modalTab, setModalTab] = useState<'futuros' | 'historico'>('futuros');
  const [dateSearchQuery, setDateSearchQuery] = useState('');

  // Estados para o Modal de Novo Encaixe Inteligente por CPF
  const [walkInModalVisible, setWalkInModalVisible] = useState(false);
  const [searchCpfQuery, setSearchCpfQuery] = useState('');
  const [foundClient, setFoundClient] = useState<any>(null);
  const [clientVehicles, setClientVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [cpfNotFoundMessage, setCpfNotFoundMessage] = useState(false);

  // Campos para cadastro rápido caso o cliente/carro não exista
  const [clientNameInput, setClientNameInput] = useState('');
  const [clientPhoneInput, setClientPhoneInput] = useState('');
  const [clientCpfInput, setClientCpfInput] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [brandInput, setBrandInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('pequeno');
  
  // Serviços filtrados por categoria
  const [selectedService, setSelectedService] = useState<any>(null);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [savingWalkIn, setSavingWalkIn] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleCpfMask = (text: string, setter: (val: string) => void) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 11);
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    } else if (cleaned.length > 6 && cleaned.length <= 9) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    } else if (cleaned.length > 9) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
    }
    setter(formatted);
  };

  const getTodayISO = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateInputChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }

    setDateSearchQuery(formatted);
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { data: rawAppointments, error } = await supabase.from('appointments').select('*');
      if (error) throw error;

      const formatted = await Promise.all(
        (rawAppointments || []).map(async (item: any) => {
          let veh: any = {};
          let prof: any = {};
          let empName = 'Não atribuído';

          if (item.vehicle_id) {
            const { data: vData } = await supabase.from('vehicles').select('*').eq('id', item.vehicle_id).single();
            if (vData) veh = vData;
          }

          if (item.user_id) {
            const { data: pData } = await supabase.from('profiles').select('*').eq('id', item.user_id).single();
            if (pData) prof = pData;
          }

          if (item.employee_id) {
            const { data: eData } = await supabase.from('employees').select('*').eq('id', item.employee_id).single();
            if (eData) empName = eData.name || eData.full_name;
          }

          return {
            ...formatAppointmentItem(item, veh, prof),
            employee_name: empName,
          };
        })
      );

      setAppointments(formatted);
    } catch (error: any) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServicesForCategory = async (category: string) => {
    try {
      const cleanCategory = (category || 'pequeno').toLowerCase();
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('category', cleanCategory);

      if (error) throw error;

      setServicesList(data || []);
      if (data && data.length > 0) {
        setSelectedService(data[0]);
      } else {
        setSelectedService(null);
      }
    } catch (e) {
      console.error('Erro ao carregar serviços por categoria:', e);
      setServicesList([]);
      setSelectedService(null);
    }
  };

  const formatAppointmentItem = (item: any, veh: any, prof: any): Appointment => {
    let timeFormatted = '--:--';
    let dateFormatted = '';
    let dateISO = '';

    if (item.scheduled_at) {
      const dateObj = new Date(item.scheduled_at);
      if (!isNaN(dateObj.getTime())) {
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        timeFormatted = `${hours}:${minutes}`;

        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');

        dateISO = `${year}-${month}-${day}`;
        dateFormatted = `${day}/${month}/${year}`;
      }
    }

    return {
      id: item.id,
      user_name: prof.full_name || prof.name || prof.nome || item.user_name || 'Cliente',
      user_phone: prof.phone || prof.telefone || item.user_phone || 'Sem telefone',
      plate: (veh.plate || veh.placa || item.plate || item.placa || 'SEM PLACA').toUpperCase(),
      brand: veh.brand || veh.marca || item.brand || item.marca || '',
      model: veh.model || veh.modelo || item.model || item.modelo || 'Veículo',
      category: (veh.category || veh.categoria || 'pequeno').toLowerCase(),
      service_title: item.service_type || item.service_title || 'Serviço Geral',
      price: parseFloat(item.price || 0),
      dateStr: dateISO,
      dateFormatted: dateFormatted,
      time: timeFormatted,
      status: item.status ? String(item.status).toLowerCase() : 'pending',
    };
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (walkInModalVisible) {
      loadServicesForCategory(categoryInput);
    }
  }, [categoryInput, walkInModalVisible]);

  const handleSearchClientByCpf = async () => {
    const cleanCpf = searchCpfQuery.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      showAlert('Atenção', 'Informe um CPF válido com 11 dígitos para a busca.');
      return;
    }

    try {
      setLoading(true);
      setCpfNotFoundMessage(false);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('cpf', cleanCpf)
        .limit(1);

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        const client = profiles[0];
        setFoundClient(client);
        setClientNameInput(client.full_name || '');
        setClientPhoneInput(client.phone || '');
        setClientCpfInput(searchCpfQuery);
        setCpfNotFoundMessage(false);

        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', client.id);

        setClientVehicles(vehicles || []);
        if (vehicles && vehicles.length > 0) {
          const firstVeh = vehicles[0];
          setSelectedVehicle(firstVeh);
          const cat = (firstVeh.category || 'pequeno').toLowerCase();
          setCategoryInput(cat);
          loadServicesForCategory(cat);
        }
      } else {
        setFoundClient(null);
        setClientCpfInput(searchCpfQuery);
        setClientVehicles([]);
        setSelectedVehicle(null);
        setCpfNotFoundMessage(true);
        loadServicesForCategory(categoryInput);
      }
    } catch (e: any) {
      showAlert('Erro', e.message || 'Erro ao buscar cliente por CPF.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWalkIn = async () => {
    if (!selectedService) {
      showAlert('Atenção', 'Selecione um serviço válido disponível para esta categoria de veículo.');
      return;
    }

    try {
      setSavingWalkIn(true);
      let targetUserId = foundClient ? foundClient.id : null;
      let targetVehicleId = selectedVehicle ? selectedVehicle.id : null;

      if (!targetUserId) {
        if (!clientNameInput.trim()) {
          showAlert('Atenção', 'Informe o nome do cliente.');
          setSavingWalkIn(false);
          return;
        }
        const cleanCpf = clientCpfInput.replace(/\D/g, '');
        if (cleanCpf.length !== 11) {
          showAlert('Atenção', 'Informe um CPF válido para o cadastro.');
          setSavingWalkIn(false);
          return;
        }

        const { data: newProfile, error: profErr } = await supabase
          .from('profiles')
          .insert([{ full_name: clientNameInput, phone: clientPhoneInput, cpf: cleanCpf }])
          .select()
          .single();

        if (profErr) {
          if (profErr.code === '23505') {
            throw new Error('Este CPF já está cadastrado no sistema.');
          }
          throw profErr;
        }
        targetUserId = newProfile.id;
      }

      if (!targetVehicleId) {
        if (!plateInput.trim()) {
          showAlert('Atenção', 'Informe a placa do veículo.');
          setSavingWalkIn(false);
          return;
        }
        const { data: newVeh, error: vehErr } = await supabase
          .from('vehicles')
          .insert([{
            user_id: targetUserId,
            plate: plateInput.toUpperCase(),
            brand: brandInput,
            model: modelInput || 'Veículo',
            category: categoryInput.toLowerCase(),
          }])
          .select()
          .single();

        if (vehErr) throw vehErr;
        targetVehicleId = newVeh.id;
      }

      const nowISO = new Date().toISOString();
      const durationMinutes = selectedService.duration_minutes || 30;

      const assignedEmployeeId = await allocateEmployeeByTimeSlot(nowISO, durationMinutes);

      const servicePrice = selectedService.price || 50.0;
      const serviceNameToSave = selectedService.title || selectedService.name || 'Serviço';

      const { error: appError } = await supabase.from('appointments').insert([
        {
          user_id: targetUserId,
          vehicle_id: targetVehicleId,
          service_type: serviceNameToSave,
          price: servicePrice,
          status: 'pending',
          scheduled_at: nowISO,
          employee_id: assignedEmployeeId,
        },
      ]);

      if (appError) throw appError;

      showAlert('Sucesso', 'Encaixe realizado e funcionário alocado com sucesso!');
      setWalkInModalVisible(false);
      setSearchCpfQuery('');
      setFoundClient(null);
      setClientVehicles([]);
      setSelectedVehicle(null);
      setClientNameInput('');
      setClientPhoneInput('');
      setClientCpfInput('');
      setPlateInput('');
      setBrandInput('');
      setModelInput('');
      setCpfNotFoundMessage(false);
      loadAppointments();
    } catch (error: any) {
      showAlert('Erro', error.message || 'Não foi possível concluir o encaixe.');
    } finally {
      setSavingWalkIn(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: 'cancelled' } : app))
      );
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
  };

  const handleRollback = async (id: string) => {
    try {
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: 'pending' } : app))
      );
      await supabase.from('appointments').update({ status: 'pending' }).eq('id', id);
    } catch (error) {
      console.error('Erro ao restaurar:', error);
    }
  };

  const handleGoToQueue = async (app: Appointment) => {
    try {
      setAppointments((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'in_queue' } : a))
      );
      await supabase.from('appointments').update({ status: 'in_queue' }).eq('id', app.id);
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('Fila');
      }
    } catch (e) {
      console.error('Erro ao enviar para a fila:', e);
    }
  };

  const todayStr = getTodayISO();
  const todayActiveAppointments = appointments.filter((app) => app.dateStr === todayStr && app.status === 'pending');
  const futureAppointments = appointments.filter((app) => app.dateStr > todayStr && app.status !== 'cancelled');
  const pastAppointments = appointments.filter((app) => app.dateStr < todayStr && app.status !== 'cancelled');
  const cancelledAppointments = appointments.filter((app) => app.status === 'cancelled' || app.status === 'cancelado');

  const filteredTodayAppointments = todayActiveAppointments.filter(
    (app) =>
      app.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeModalList = modalTab === 'futuros' ? futureAppointments : pastAppointments;
  const filteredModalList = activeModalList.filter(
    (app) =>
      app.dateFormatted.includes(dateSearchQuery) ||
      app.dateStr.includes(dateSearchQuery) ||
      app.model.toLowerCase().includes(dateSearchQuery.toLowerCase()) ||
      app.user_name.toLowerCase().includes(dateSearchQuery.toLowerCase())
  );

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay();
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);

  const handlePrevMonth = () => setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCalendarDate(new Date(currentYear, currentMonth + 1, 1));

  const handleSelectDay = (dayNumber: number) => {
    const selectedDayStr = String(dayNumber).padStart(2, '0');
    const selectedMonthStr = String(currentMonth + 1).padStart(2, '0');
    const formatted = `${selectedDayStr}/${selectedMonthStr}/${currentYear}`;
    setDateSearchQuery(formatted);
    setCalendarModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.headerTitle}>Agendamentos do Dia</Text>
          <Text style={styles.headerSubtitle}>Exibindo apenas os horários marcados para hoje</Text>
        </View>
        
        <TouchableOpacity style={styles.walkInBtn} onPress={() => setWalkInModalVisible(true)}>
          <FontAwesome5 name="plus" size={11} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.walkInBtnText}>Novo Encaixe</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadAppointments}>
          <FontAwesome5 name="sync-alt" size={14} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Resumo e Ações */}
      <View style={styles.summaryBar}>
        <View style={styles.countCard}>
          <FontAwesome5 name="car" size={16} color="#38bdf8" style={{ marginRight: 8 }} />
          <Text style={styles.countText}>
            <Text style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{todayActiveAppointments.length}</Text> hoje
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.historyBtn} onPress={() => setHistoryModalVisible(true)}>
            <FontAwesome5 name="calendar-alt" size={12} color="#38bdf8" style={{ marginRight: 6 }} />
            <Text style={styles.historyBtnText}>Outras Datas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelledBtn} onPress={() => setCancelledModalVisible(true)}>
            <FontAwesome5 name="ban" size={12} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.cancelledBtnText}>Cancelados ({cancelledAppointments.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Campo de Busca Principal */}
      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={14} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por placa, modelo ou cliente..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Lista Hoje */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : filteredTodayAppointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="calendar-check" size={40} color="#334155" />
          <Text style={styles.emptyText}>Nenhum agendamento ativo para hoje.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTodayAppointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.timeBadge}>
                  <FontAwesome5 name="clock" size={12} color="#38bdf8" style={{ marginRight: 6 }} />
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>AGUARDANDO CHECK-IN</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleTitle}>
                    {item.brand ? `${item.brand} ` : ''}{item.model}
                  </Text>
                  <Text style={styles.clientName}>
                    <FontAwesome5 name="user" size={11} color="#94a3b8" /> {item.user_name} • {item.user_phone}
                  </Text>
                  <Text style={styles.serviceTitle}>{item.service_title}</Text>
                  {item.employee_name && (
                    <Text style={{ color: '#38bdf8', fontSize: 11, marginTop: 4 }}>
                      👨‍🔧 Resp: {item.employee_name}
                    </Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <View style={styles.plateTag}>
                    <Text style={styles.plateText}>{item.plate}</Text>
                  </View>
                  <Text style={styles.priceText}>R$ {item.price.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.checkInBtn} onPress={() => handleGoToQueue(item)}>
                  <FontAwesome5 name="stream" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.checkInBtnText}>Realizar Check-in</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Outras Datas */}
      <Modal visible={historyModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Consulta de Agendamentos</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <FontAwesome5 name="times" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabToggleRow}>
              <TouchableOpacity
                style={[styles.tabBtn, modalTab === 'futuros' && styles.tabBtnActive]}
                onPress={() => setModalTab('futuros')}
              >
                <FontAwesome5 name="calendar-plus" size={12} color={modalTab === 'futuros' ? '#ffffff' : '#94a3b8'} style={{ marginRight: 6 }} />
                <Text style={[styles.tabBtnText, modalTab === 'futuros' && styles.tabBtnTextActive]}>
                  Futuros ({futureAppointments.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, modalTab === 'historico' && styles.tabBtnActive]}
                onPress={() => setModalTab('historico')}
              >
                <FontAwesome5 name="history" size={12} color={modalTab === 'historico' ? '#ffffff' : '#94a3b8'} style={{ marginRight: 6 }} />
                <Text style={[styles.tabBtnText, modalTab === 'historico' && styles.tabBtnTextActive]}>
                  Histórico ({pastAppointments.length})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { marginTop: 12, marginBottom: 8 }]}>
              <TouchableOpacity style={{ paddingRight: 8 }} onPress={() => setCalendarModalVisible(true)}>
                <FontAwesome5 name="calendar-alt" size={18} color="#38bdf8" />
              </TouchableOpacity>

              <TextInput
                style={styles.searchInput}
                placeholder="Digitar data ou abrir calendário..."
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                maxLength={10}
                value={dateSearchQuery}
                onChangeText={handleDateInputChange}
              />

              {dateSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setDateSearchQuery('')}>
                  <FontAwesome5 name="times-circle" size={14} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {filteredModalList.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum agendamento encontrado.</Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 8 }}>
                {filteredModalList.map((item) => (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>{item.brand} {item.model}</Text>
                      <Text style={styles.historyClient}>{item.user_name} • {item.plate}</Text>
                      <Text style={{ color: '#38bdf8', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>
                        Data: {item.dateFormatted} às {item.time}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.miniCancelBtn} onPress={() => handleCancel(item.id)}>
                      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal do Calendário */}
      <Modal visible={calendarModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.calendarNavBtn} onPress={handlePrevMonth}>
                <FontAwesome5 name="chevron-left" size={14} color="#2dd4bf" />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{MONTH_NAMES[currentMonth]} DE {currentYear}</Text>
              <TouchableOpacity style={styles.calendarNavBtn} onPress={handleNextMonth}>
                <FontAwesome5 name="chevron-right" size={14} color="#2dd4bf" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarDaysHeader}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                <Text key={i} style={styles.calendarDayLabel}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calendarDayCell} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedCheck = `${String(dayNum).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
                const isSelected = dateSearchQuery === formattedCheck;
                return (
                  <TouchableOpacity
                    key={`day-${dayNum}`}
                    style={[styles.calendarDayCell, isSelected && styles.calendarDaySelected]}
                    onPress={() => handleSelectDay(dayNum)}
                  >
                    <Text style={[styles.calendarDayText, isSelected && styles.calendarDaySelectedText]}>{dayNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.closeCalendarBtn} onPress={() => setCalendarModalVisible(false)}>
              <Text style={styles.closeCalendarBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Cancelados */}
      <Modal visible={cancelledModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome5 name="ban" size={16} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Agendamentos Cancelados</Text>
              </View>
              <TouchableOpacity onPress={() => setCancelledModalVisible(false)}>
                <FontAwesome5 name="times" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {cancelledAppointments.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>Nenhum cancelado.</Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 12 }}>
                {cancelledAppointments.map((c) => (
                  <View key={c.id} style={styles.cancelledCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cancelledTitle}>{c.brand} {c.model}</Text>
                      <Text style={styles.cancelledClient}>{c.user_name} • {c.plate}</Text>
                      <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>Data: {c.dateFormatted} às {c.time}</Text>
                    </View>
                    <TouchableOpacity style={styles.rollbackBtn} onPress={() => handleRollback(c.id)}>
                      <FontAwesome5 name="undo" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.rollbackBtnText}>Restaurar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Novo Encaixe Inteligente por CPF */}
      <Modal visible={walkInModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novo Encaixe (Balcão)</Text>
                <TouchableOpacity onPress={() => setWalkInModalVisible(false)}>
                  <FontAwesome5 name="times" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Buscar Cliente por CPF (Login) *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="000.000.000-00"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  maxLength={14}
                  value={searchCpfQuery}
                  onChangeText={(text) => handleCpfMask(text, setSearchCpfQuery)}
                />
                <TouchableOpacity style={styles.searchClientBtn} onPress={handleSearchClientByCpf}>
                  <FontAwesome5 name="search" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {cpfNotFoundMessage && (
                <View style={styles.notFoundBox}>
                  <FontAwesome5 name="exclamation-circle" size={14} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.notFoundText}>CPF não encontrado. Preencha os dados abaixo para cadastrar.</Text>
                </View>
              )}

              {foundClient ? (
                <View style={styles.foundClientBox}>
                  <Text style={styles.foundClientTitle}>Cliente Encontrado:</Text>
                  <Text style={styles.foundClientText}>👤 {foundClient.full_name} ({foundClient.phone || 'Sem tel'})</Text>

                  {clientVehicles.length > 0 ? (
                    <>
                      <Text style={[styles.label, { marginTop: 10 }]}>Selecione o Veículo:</Text>
                      {clientVehicles.map((v) => (
                        <TouchableOpacity
                          key={v.id}
                          style={[styles.vehicleOption, selectedVehicle?.id === v.id && styles.vehicleOptionSelected]}
                          onPress={() => {
                            setSelectedVehicle(v);
                            const cat = (v.category || 'pequeno').toLowerCase();
                            setCategoryInput(cat);
                            loadServicesForCategory(cat);
                          }}
                        >
                          <Text style={[styles.vehicleOptionText, selectedVehicle?.id === v.id && { color: '#38bdf8' }]}>
                            🚗 {v.plate} - {v.model} ({v.category?.toUpperCase()})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <Text style={{ color: '#f59e0b', fontSize: 12, marginTop: 6 }}>
                      ⚠️ Este cliente não possui veículos cadastrados. Cadastre abaixo:
                    </Text>
                  )}
                </View>
              ) : null}

              {(!foundClient || clientVehicles.length === 0) && (
                <>
                  {!foundClient && (
                    <>
                      <Text style={styles.label}>Nome Completo *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: Carlos Silva"
                        placeholderTextColor="#64748b"
                        value={clientNameInput}
                        onChangeText={setClientNameInput}
                      />

                      <Text style={styles.label}>CPF do Cliente *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="000.000.000-00"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        maxLength={14}
                        value={clientCpfInput}
                        onChangeText={(text) => handleCpfMask(text, setClientCpfInput)}
                      />

                      <Text style={styles.label}>Telefone / WhatsApp</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="(31) 99999-9999"
                        placeholderTextColor="#64748b"
                        keyboardType="phone-pad"
                        value={clientPhoneInput}
                        onChangeText={(t) => setClientPhoneInput(t)}
                      />
                    </>
                  )}

                  <Text style={styles.label}>Placa do Veículo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: ABC-1234"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                    value={plateInput}
                    onChangeText={setPlateInput}
                  />

                  <Text style={styles.label}>Marca e Modelo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Honda Civic Preto"
                    placeholderTextColor="#64748b"
                    value={modelInput}
                    onChangeText={setModelInput}
                  />

                  <Text style={styles.label}>Categoria / Tamanho do Carro *</Text>
                  <View style={styles.categoryRow}>
                    {[
                      { key: 'pequeno', label: 'Pequeno' },
                      { key: 'medio', label: 'Médio' },
                      { key: 'grande', label: 'Grande' },
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.categoryBtn, categoryInput === cat.key && styles.categoryBtnActive]}
                        onPress={() => {
                          setCategoryInput(cat.key);
                          loadServicesForCategory(cat.key);
                        }}
                      >
                        <Text style={[styles.categoryBtnText, categoryInput === cat.key && { color: '#ffffff' }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.label, { marginTop: 10 }]}>Serviço Desejado *</Text>
              {servicesList.length === 0 ? (
                <View style={styles.closedBox}>
                  <Text style={styles.closedText}>
                    Nenhum serviço cadastrado para veículos do tipo "{categoryInput.toUpperCase()}".
                  </Text>
                </View>
              ) : (
                <View style={styles.servicesScrollWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScrollRow}>
                    {servicesList.map((srv) => {
                      const isSelected = selectedService?.id === srv.id;
                      return (
                        <TouchableOpacity
                          key={srv.id}
                          style={[styles.serviceChip, isSelected && styles.serviceChipActive]}
                          onPress={() => setSelectedService(srv)}
                        >
                          <Text style={[styles.serviceChipText, isSelected && styles.serviceChipTextActive]} numberOfLines={1}>
                            {srv.title || srv.name || 'Serviço'} (R$ {Number(srv.price || 0).toFixed(2)})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.saveButton, (!selectedService || savingWalkIn) && { opacity: 0.5 }]} 
                onPress={handleSaveWalkIn} 
                disabled={!selectedService || savingWalkIn}
              >
                {savingWalkIn ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Concluir Encaixe no Pátio</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8' },
  walkInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  walkInBtnText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  refreshBtn: { width: 36, height: 36, backgroundColor: '#1e293b', borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  countCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  countText: { fontSize: 12, color: '#94a3b8' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
  historyBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  cancelledBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  cancelledBtnText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, alignItems: 'center', height: 42, marginBottom: 16 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 13 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  timeText: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 12 },
  statusBadge: { backgroundColor: '#0c4a6e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 10, marginBottom: 10 },
  vehicleTitle: { fontSize: 15, fontWeight: 'bold', color: '#f1f5f9' },
  clientName: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  serviceTitle: { fontSize: 12, color: '#38bdf8', fontWeight: '600', marginTop: 4 },
  plateTag: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#38bdf8', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  plateText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 11 },
  priceText: { fontSize: 15, fontWeight: 'bold', color: '#34d399', marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  checkInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  checkInBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  cancelBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  miniCancelBtn: { backgroundColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  rollbackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  rollbackBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  modalScrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#ffffff', fontSize: 13, marginBottom: 14 },
  searchClientBtn: { backgroundColor: '#0284c7', width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  notFoundBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ef4444', marginBottom: 12 },
  notFoundText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  foundClientBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  foundClientTitle: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  foundClientText: { color: '#ffffff', fontSize: 13 },
  vehicleOption: { backgroundColor: '#1e293b', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#334155', marginTop: 6 },
  vehicleOptionSelected: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  vehicleOptionText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  categoryRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  categoryBtn: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  categoryBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  categoryBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  servicesScrollWrapper: { height: 46, marginBottom: 16 },
  servicesScrollRow: { alignItems: 'center', gap: 8 },
  serviceChip: { backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155', height: 40, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
  serviceChipActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  serviceChipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  serviceChipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#0284c7', height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  tabToggleRow: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#334155' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6 },
  tabBtnActive: { backgroundColor: '#0284c7' },
  tabBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  tabBtnTextActive: { color: '#ffffff', fontWeight: 'bold' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  historyTitle: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 14 },
  historyClient: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  cancelledCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  cancelledTitle: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 14 },
  cancelledClient: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  calendarModalCard: { backgroundColor: '#0b1329', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1e293b' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calendarNavBtn: { width: 36, height: 36, backgroundColor: '#131f3d', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1e293b' },
  calendarTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', letterSpacing: 0.5 },
  calendarDaysHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  calendarDayLabel: { width: '14%', textAlign: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayCell: { width: '14.28%', height: 42, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
  calendarDayText: { color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' },
  calendarDaySelected: { backgroundColor: '#2dd4bf', borderRadius: 8 },
  calendarDaySelectedText: { color: '#0f172a', fontWeight: 'bold' },
  closeCalendarBtn: { backgroundColor: '#1e293b', height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  closeCalendarBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  closedBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 14 },
  closedText: { color: '#f87171', fontSize: 12, textAlign: 'center' },
});