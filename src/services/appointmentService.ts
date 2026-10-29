import { supabase } from './supabase';

export interface Vehicle {
  id?: string;
  user_id: string;
  plate: string;
  brand: string;
  model: string;
  category: string;
}

export interface Service {
  id: string;
  title?: string;
  name?: string;
  category: string;
  price: number;
  duration_minutes: number;
}

export interface OperatingHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface Appointment {
  id?: string;
  user_id?: string;
  vehicle_id: string;
  service_type: string;
  price: number;
  scheduled_at: string;
  status?: string;
  employee_id?: string;
  vehicles?: {
    brand: string;
    model: string;
    plate: string;
    category: string;
  };
}

// Buscar agendamentos do usuário logado ou geral
export async function getAppointments(): Promise<Appointment[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error('Usuário não autenticado.');

  const userId = userData.user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  let query = supabase.from('appointments').select(`
      *,
      vehicles (brand, model, plate, category)
    `);

  if (!profile?.is_admin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Buscar serviços filtrados por categoria do veículo
export async function getServicesByCategory(category: string): Promise<Service[]> {
  const cleanCategory = (category || 'pequeno').toLowerCase();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('category', cleanCategory);

  if (error) throw error;
  return data || [];
}

// Buscar horários de funcionamento
export async function getOperatingHours(): Promise<OperatingHour[]> {
  const { data, error } = await supabase.from('operating_hours').select('*');
  if (error) throw error;
  return data || [];
}

// Gerar slots de horários de início disponíveis de hora em hora (step fixo de 60 min ou ajustável)
// Gerar slots de horários de início disponíveis de 30 em 30 minutos
export function generateAvailableSlots(openTime: string, closeTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);

  let currentMinutes = openHour * 60 + openMin;
  const closingMinutes = closeHour * 60 + closeMin;

  // Intervalo de avanço alterado para 30 minutos (de 30 em 30 min)
  const stepMinutes = 30; 

  while (currentMinutes + durationMinutes <= closingMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    slots.push(timeStr);
    
    currentMinutes += stepMinutes;
  }

  return slots;
}
// Filtrar horários disponíveis com base na capacidade da equipe e intervalo (retira horários lotados e devolve se houver cancelamento)
export async function getAvailableSlotsFiltered(selectedDateStr: string, openTime: string, closeTime: string, serviceDurationMinutes: number): Promise<string[]> {
  // 1. Busca funcionários ativos
  const { data: employees } = await supabase.from('employees').select('id').eq('active', true);
  const totalEmployees = employees ? employees.length : 0;
  if (totalEmployees === 0) return [];

  // 2. Busca agendamentos ativos para o dia (ignorando cancelados)
  const { data: existingApps } = await supabase
    .from('appointments')
    .select('scheduled_at, service_type, status')
    .in('status', ['pending', 'in_queue', 'in_progress']);

  // 3. Busca durações dos serviços para o cálculo de sobreposição
  const { data: servicesData } = await supabase.from('services').select('*');
  const serviceDurationMap = new Map();
  if (servicesData) {
    servicesData.forEach((s) => {
      const sName = (s.name || s.title || '').trim().toLowerCase();
      serviceDurationMap.set(sName, s.duration_minutes || 30);
    });
  }

  // 4. Gera os horários base de início do dia
  const rawSlots = generateAvailableSlots(openTime, closeTime, serviceDurationMinutes);

  // 5. Filtra cada slot verificando se a equipe já está lotada nele considerando a duração real do serviço
  const availableSlots = rawSlots.filter((timeStr) => {
    const slotStart = new Date(`${selectedDateStr}T${timeStr}:00`);
    const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60000);

    const overlappingCount = (existingApps || []).filter((app) => {
      if (!app.scheduled_at) return false;
      const appStart = new Date(app.scheduled_at);
      
      // Garante que é o mesmo dia
      const appDateStr = app.scheduled_at.split('T')[0];
      if (appDateStr !== selectedDateStr) return false;

      const appServiceKey = (app.service_type || '').trim().toLowerCase();
      const appDuration = serviceDurationMap.get(appServiceKey) || 30;
      const appEnd = new Date(appStart.getTime() + appDuration * 60000);

      // Verifica sobreposição de tempo
      return slotStart < appEnd && slotEnd > appStart;
    }).length;

    // Se o número de carros no pátio neste horário for menor que o total de funcionários, o horário continua disponível
    return overlappingCount < totalEmployees;
  });

  return availableSlots;
}

// Função centralizada e rigorosa de alocação e bloqueio por capacidade e intervalo
export async function allocateEmployeeByTimeSlot(newScheduledAtISO: string, serviceDurationMinutes: number): Promise<string> {
  const newStart = new Date(newScheduledAtISO);
  const duration = serviceDurationMinutes && !isNaN(serviceDurationMinutes) ? serviceDurationMinutes : 30;
  const newEnd = new Date(newStart.getTime() + duration * 60000);

  // 1. Busca todos os funcionários ativos
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('active', true);

  if (empErr) throw empErr;
  if (!employees || employees.length === 0) {
    throw new Error('Não há funcionários cadastrados ou ativos no sistema.');
  }

  const totalEmployeesCount = employees.length;

  // 2. Busca TODOS os agendamentos ativos no pátio (incluindo pending, in_queue, in_progress)
  const { data: existingApps, error: appErr } = await supabase
    .from('appointments')
    .select('id, employee_id, scheduled_at, service_type, status')
    .in('status', ['pending', 'in_queue', 'in_progress']);

  if (appErr) throw appErr;

  // 3. Busca a duração dos serviços cadastrados para calcular o término exato de cada agendamento existente
  const { data: servicesData } = await supabase.from('services').select('*');
  const serviceDurationMap = new Map();
  if (servicesData) {
    servicesData.forEach((s) => {
      const sName = (s.name || s.title || '').trim().toLowerCase();
      serviceDurationMap.set(sName, s.duration_minutes || 30);
    });
  }

  // 4. Filtra todos os agendamentos que colidem (sobrepõem) com o intervalo do novo atendimento
  const overlappingApps = (existingApps || []).filter((app) => {
    if (!app.scheduled_at) return false;
    const existingStart = new Date(app.scheduled_at);
    
    const appServiceKey = (app.service_type || '').trim().toLowerCase();
    const existingDuration = serviceDurationMap.get(appServiceKey) || 30;
    const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);

    // Conflito de Intervalo (Overlap): (InícioNovo < FimExistente) E (FimNovo > InícioExistente)
    return newStart < existingEnd && newEnd > existingStart;
  });

  // 5. TRAVA CRÍTICA DE CAPACIDADE: 
  if (overlappingApps.length >= totalEmployeesCount) {
    throw new Error(`Capacidade esgotada! Os ${totalEmployeesCount} funcionário(s) da empresa já estão totalmente ocupados neste intervalo de horário (Existem ${overlappingApps.length} carros em atendimento/agendados).`);
  }

  // 6. Descobre quais IDs de funcionários já estão ocupados neste intervalo específico
  const busyEmployeeIds = new Set(overlappingApps.map((a) => a.employee_id).filter(Boolean));
  const availableEmployees = employees.filter((emp) => !busyEmployeeIds.has(emp.id));

  const assignedEmployee = availableEmployees.length > 0 ? availableEmployees[0] : employees[0];
  return assignedEmployee.id;
}

// Criar Agendamento pelo Cliente (Com validação rigorosa de capacidade e intervalo)
export async function createAppointment(appointment: {
  vehicle_id: string;
  service_type: string;
  price: number;
  scheduled_at: string;
  duration_minutes?: number;
}): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error('Usuário não autenticado.');

  const userId = userData.user.id;
  const duration = appointment.duration_minutes || 30;

  // Valida a capacidade e intervalo antes de permitir o agendamento
  await allocateEmployeeByTimeSlot(appointment.scheduled_at, duration);

  const { error } = await supabase.from('appointments').insert([
    {
      user_id: userId,
      vehicle_id: appointment.vehicle_id,
      service_type: appointment.service_type,
      price: appointment.price,
      scheduled_at: appointment.scheduled_at,
      status: 'pending',
      employee_id: null,
    },
  ]);

  if (error) throw error;
}

// Cancelar Agendamento
export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) throw error;
}