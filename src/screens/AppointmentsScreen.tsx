import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getVehicles, Vehicle } from '../services/vehicleService';
import {
  getAppointments,
  getServicesByCategory,
  getOperatingHours,
  getAvailableSlotsFiltered,
  createAppointment,
  cancelAppointment,
  Appointment,
  Service,
  OperatingHour,
} from '../services/appointmentService';

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mês e Data do Calendário Completo
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());

  // Estados do Agendamento Passo a Passo
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Data e Horário
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isClosedDay, setIsClosedDay] = useState(false);

  // Animações de Opacidade (Fade In)
  const fadeStep2 = useRef(new Animated.Value(0)).current;
  const fadeStep3 = useRef(new Animated.Value(0)).current;
  const fadeStep4 = useRef(new Animated.Value(0)).current;

  // Animações de Deslocamento (Slide In)
  const translateYStep2 = useRef(new Animated.Value(20)).current;
  const translateYStep3 = useRef(new Animated.Value(20)).current;
  const translateYStep4 = useRef(new Animated.Value(20)).current;

  // Função helper universal para exibir alertas na Web e no Mobile
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const triggerFadeAndSlide = (opacityVal: Animated.Value, translateVal: Animated.Value) => {
    opacityVal.setValue(0);
    translateVal.setValue(20);

    const useNative = Platform.OS !== 'web';

    Animated.parallel([
      Animated.timing(opacityVal, {
        toValue: 1,
        duration: 800,
        useNativeDriver: useNative,
      }),
      Animated.timing(translateVal, {
        toValue: 0,
        duration: 800,
        useNativeDriver: useNative,
      }),
    ]).start();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appData, vehData, opData] = await Promise.all([
        getAppointments(),
        getVehicles(),
        getOperatingHours(),
      ]);

      setAppointments(appData);
      setVehicles(vehData);
      setOperatingHours(opData);
    } catch (error) {
      showAlert('Erro', 'Falha ao carregar dados de agendamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = async () => {
    try {
      const vehData = await getVehicles();
      setVehicles(vehData);

      setSelectedVehicle(null);
      setSelectedService(null);
      setAvailableServices([]);
      setSelectedDate(null);
      setSelectedSlot('');
      setCurrentCalendarMonth(new Date());

      fadeStep2.setValue(0);
      fadeStep3.setValue(0);
      fadeStep4.setValue(0);
    } catch (e) {
      console.error('Erro ao atualizar veículos para o modal:', e);
    }
    setModalVisible(true);
  };

  // Passo 1: Seleção de Veículo
  const handleSelectVehicle = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedSlot('');
    setAvailableServices([]);

    fadeStep3.setValue(0);
    fadeStep4.setValue(0);

    try {
      const services = await getServicesByCategory(vehicle.category);
      setAvailableServices(services);
      triggerFadeAndSlide(fadeStep2, translateYStep2);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  // Passo 2: Seleção de Serviço
  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    const today = new Date();
    setSelectedDate(today);
    setCurrentCalendarMonth(today);
    setSelectedSlot('');

    triggerFadeAndSlide(fadeStep3, translateYStep3);
    triggerFadeAndSlide(fadeStep4, translateYStep4);
  };

  // Recalcular horários filtrados quando data ou serviço mudarem (bloqueando horários passados do dia de hoje)
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedService || !selectedDate) return;

      const dayOfWeek = selectedDate.getDay();
      const dayConfig = operatingHours.find((h) => h.day_of_week === dayOfWeek);

      const openTime = dayConfig?.open_time || '08:00';
      const closeTime = dayConfig?.close_time || '18:00';
      const closed = dayConfig ? dayConfig.is_closed : dayOfWeek === 0;

      setIsClosedDay(closed);

      if (!closed) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        try {
          let slots = await getAvailableSlotsFiltered(
            dateStr,
            openTime,
            closeTime,
            selectedService.duration_minutes
          );

          // Validação: Se a data selecionada for hoje, remove horários que já passaram
          const now = new Date();
          const isToday = selectedDate.toDateString() === now.toDateString();
          if (isToday) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeValue = currentHour * 60 + currentMinute;

            slots = slots.filter((slot) => {
              const [h, m] = slot.split(':').map(Number);
              const slotTimeValue = h * 60 + m;
              return slotTimeValue > currentTimeValue;
            });
          }

          setAvailableSlots(slots);
          setSelectedSlot(slots.length > 0 ? slots[0] : '');
        } catch (e) {
          console.error('Erro ao buscar slots disponíveis:', e);
          setAvailableSlots([]);
          setSelectedSlot('');
        }
      } else {
        setAvailableSlots([]);
        setSelectedSlot('');
      }
    };

    fetchSlots();
  }, [selectedDate, selectedService, operatingHours]);

  const handleCreateAppointment = async () => {
    if (!selectedVehicle || !selectedService || !selectedDate || !selectedSlot || isClosedDay) {
      showAlert('Atenção', 'Por favor, complete todas as etapas do agendamento.');
      return;
    }

    try {
      setSaving(true);

      const [hours, minutes] = selectedSlot.split(':');
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await createAppointment({
        vehicle_id: selectedVehicle.id!,
        service_type: selectedService.name || selectedService.title || 'Serviço',
        price: selectedService.price,
        scheduled_at: scheduledDateTime.toISOString(),
        duration_minutes: selectedService.duration_minutes,
      });

      showAlert('Sucesso', 'Agendamento realizado!');
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao agendar.');
    } finally {
      setSaving(false);
    }
  };

  // Cancelamento Direto
  const handleCancel = async (id: string) => {
    try {
      await cancelAppointment(id);
      loadData();
    } catch (error) {
      showAlert('Erro', 'Não foi possível cancelar.');
    }
  };

  // Renderizador do Calendário Completo Incorporado
  const renderCalendarDays = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysMatrix = [];

    for (let i = 0; i < firstDayIndex; i++) {
      daysMatrix.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateForDay = new Date(year, month, day);
      const isPast = dateForDay < today;
      const isSelected = selectedDate?.toDateString() === dateForDay.toDateString();

      daysMatrix.push(
        <TouchableOpacity
          key={`day-${day}`}
          disabled={isPast}
          style={[
            styles.calendarDayCell,
            isSelected && styles.calendarDaySelected,
            isPast && styles.calendarDayDisabled,
          ]}
          onPress={() => {
            setSelectedDate(dateForDay);
            triggerFadeAndSlide(fadeStep4, translateYStep4);
          }}
        >
          <Text
            style={[
              styles.calendarDayNum,
              isSelected && styles.calendarDayTextSelected,
              isPast && styles.calendarDayTextDisabled,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return daysMatrix;
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentCalendarMonth);
    newDate.setMonth(currentCalendarMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentCalendarMonth(newDate);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Aguardando', color: '#f59e0b', bg: '#451a03' };
      case 'in_progress':
        return { label: 'Em Lavagem', color: '#38bdf8', bg: '#0c4a6e' };
      case 'completed':
        return { label: 'Concluído', color: '#34d399', bg: '#064e3b' };
      default:
        return { label: 'Cancelado', color: '#ef4444', bg: '#450a0a' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agendamentos</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenModal}>
          <FontAwesome5 name="plus" size={14} color="#0f172a" style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Novo Agendamento</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Agendamentos */}
      {loading ? (
        <ActivityIndicator size="large" color="#34d399" style={{ marginTop: 40 }} />
      ) : appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="calendar-times" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>Nenhum agendamento ativo</Text>
          <Text style={styles.emptySubtitle}>Agende uma lavagem para manter seu veículo sempre limpo.</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status || 'pending');
            const dateFormatted = new Date(item.scheduled_at).toLocaleString('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
            });

            return (
              <View style={styles.appointmentCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.serviceTitle}>{item.service_type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={styles.vehicleText}>
                  🚗 {item.vehicles?.brand} {item.vehicles?.model} ({item.vehicles?.plate})
                </Text>
                <Text style={styles.dateText}>📅 {dateFormatted}</Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.priceText}>R$ {Number(item.price).toFixed(2)}</Text>
                  {item.status === 'pending' && (
                    <TouchableOpacity onPress={() => handleCancel(item.id!)}>
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL PRINCIPAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Agendamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome5 name="times" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* PASSO 1: Seleção do Veículo */}
              <Text style={styles.label}>1. Selecione o Veículo *</Text>
              {vehicles.length === 0 ? (
                <Text style={styles.warningText}>Nenhum veículo na garagem. Cadastre um primeiro na aba Garagem.</Text>
              ) : (
                vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.optionItem, selectedVehicle?.id === v.id && styles.optionSelected]}
                    onPress={() => handleSelectVehicle(v)}
                  >
                    <Text style={styles.optionText}>{v.brand} {v.model} ({v.plate})</Text>
                    <Text style={styles.subOptionText}>Categoria: {v.category.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))
              )}

              {/* PASSO 2: Seleção do Serviço */}
              {selectedVehicle && (
                <Animated.View style={{ opacity: fadeStep2, transform: [{ translateY: translateYStep2 }] }}>
                  <Text style={[styles.label, { marginTop: 16 }]}>2. Selecione o Serviço *</Text>
                  {availableServices.length === 0 ? (
                    <View style={styles.closedBox}>
                      <Text style={styles.closedText}>
                        Nenhum serviço cadastrado pelo lava-jato para veículos do tipo "{selectedVehicle.category.toUpperCase()}".
                      </Text>
                    </View>
                  ) : (
                    availableServices.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.serviceItem, selectedService?.id === s.id && styles.optionSelected]}
                        onPress={() => handleSelectService(s)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionText}>{s.name || s.title}</Text>
                          <Text style={styles.durationText}>⏱ Duração: {s.duration_minutes} min</Text>
                        </View>
                        <Text style={styles.servicePrice}>R$ {Number(s.price).toFixed(2)}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </Animated.View>
              )}

              {/* PASSO 3: Calendário Completo Incorporado no Modal */}
              {selectedService && selectedDate && (
                <Animated.View style={{ opacity: fadeStep3, transform: [{ translateY: translateYStep3 }] }}>
                  <Text style={[styles.label, { marginTop: 16 }]}>3. Escolha a Data no Calendário *</Text>

                  <View style={styles.calendarContainer}>
                    {/* Cabeçalho de Navegação do Mês */}
                    <View style={styles.monthHeaderRow}>
                      <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth('prev')}>
                        <FontAwesome5 name="chevron-left" size={12} color="#34d399" />
                      </TouchableOpacity>

                      <Text style={styles.monthTitleText}>
                        {currentCalendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                      </Text>

                      <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth('next')}>
                        <FontAwesome5 name="chevron-right" size={12} color="#34d399" />
                      </TouchableOpacity>
                    </View>

                    {/* Dias da Semana */}
                    <View style={styles.weekDaysRow}>
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                        <Text key={d} style={styles.weekDayHeader}>{d}</Text>
                      ))}
                    </View>

                    {/* Matriz dos Dias */}
                    <View style={styles.daysGrid}>
                      {renderCalendarDays()}
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* PASSO 4: Horários e Botão Confirmar */}
              {selectedService && selectedDate && (
                <Animated.View style={{ opacity: fadeStep4, transform: [{ translateY: translateYStep4 }] }}>
                  {isClosedDay ? (
                    <View style={styles.closedBox}>
                      <FontAwesome5 name="store-slash" size={20} color="#ef4444" style={{ marginBottom: 6 }} />
                      <Text style={styles.closedTitle}>Estabelecimento Fechado</Text>
                      <Text style={styles.closedText}>
                        O lava-jato não funciona nesta data. Selecione outro dia no calendário acima.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.label, { marginTop: 16 }]}>4. Horários Disponíveis *</Text>
                      {availableSlots.length === 0 ? (
                        <Text style={styles.warningText}>Sem horários disponíveis para este dia (Capacidade esgotada ou horários passados).</Text>
                      ) : (
                        <View style={styles.slotsGrid}>
                          {availableSlots.map((slot) => (
                            <TouchableOpacity
                              key={slot}
                              style={[styles.slotChip, selectedSlot === slot && styles.slotChipSelected]}
                              onPress={() => setSelectedSlot(slot)}
                            >
                              <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextSelected]}>
                                {slot}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.saveButton, (!selectedSlot || saving) && { opacity: 0.5 }]}
                        onPress={handleCreateAppointment}
                        disabled={!selectedSlot || saving}
                      >
                        <Text style={styles.saveButtonText}>{saving ? 'Agendando...' : 'Confirmar Agendamento'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </Animated.View>
              )}
            </ScrollView>
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
  addButton: { flexDirection: 'row', backgroundColor: '#34d399', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  appointmentCard: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  vehicleText: { color: '#cbd5e1', fontSize: 14, marginTop: 8 },
  dateText: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  priceText: { color: '#34d399', fontSize: 16, fontWeight: 'bold' },
  cancelText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155', padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#cbd5e1', marginBottom: 8 },
  optionItem: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, marginBottom: 8 },
  subOptionText: { color: '#818cf8', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  serviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, marginBottom: 8 },
  optionSelected: { borderColor: '#34d399', backgroundColor: '#064e3b' },
  optionText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  durationText: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  servicePrice: { color: '#34d399', fontWeight: 'bold', fontSize: 14 },
  warningText: { color: '#f59e0b', fontSize: 13, marginBottom: 12 },
  calendarContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 12, marginBottom: 8 },
  monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthNavBtn: { padding: 8, backgroundColor: '#1e293b', borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  monthTitleText: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 13 },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekDayHeader: { width: '14.28%', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayCell: { width: '14.28%', height: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  calendarDaySelected: { backgroundColor: '#34d399', borderRadius: 6 },
  calendarDayDisabled: { opacity: 0.2 },
  calendarDayNum: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  calendarDayTextSelected: { color: '#0f172a' },
  calendarDayTextDisabled: { color: '#64748b' },
  closedBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  closedTitle: { color: '#ef4444', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  closedText: { color: '#f87171', fontSize: 12, textAlign: 'center' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slotChip: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, minWidth: 68, alignItems: 'center' },
  slotChipSelected: { backgroundColor: '#34d399', borderColor: '#34d399' },
  slotText: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold' },
  slotTextSelected: { color: '#0f172a' },
  saveButton: { backgroundColor: '#34d399', height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveButtonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
});