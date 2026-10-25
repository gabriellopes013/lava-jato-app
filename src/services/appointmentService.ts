import { supabase } from './supabase';

export interface Service {
  id: string;
  name: string;
  category: 'pequeno' | 'medio' | 'grande' | 'moto';
  price: number;
  duration_minutes: number;
  active: boolean;
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
  scheduled_at: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  vehicles?: {
    brand: string;
    model: string;
    plate: string;
    category: string;
  };
}

// 1. Buscar serviços filtrados pela categoria do veículo selecionado
export const getServicesByCategory = async (category: string): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('category', category)
    .eq('active', true);

  if (error) {
    console.error('Erro ao buscar serviços por categoria:', error.message);
    throw error;
  }

  return data || [];
};

// 2. Buscar regras de horários do estabelecimento
export const getOperatingHours = async (): Promise<OperatingHour[]> => {
  const { data, error } = await supabase
    .from('operating_hours')
    .select('*');

  if (error) {
    console.error('Erro ao buscar horários de funcionamento:', error.message);
    throw error;
  }

  return data || [];
};

// 3. Gerar slots de horários válidos considerando abertura, fechamento e duração do serviço
export const generateAvailableSlots = (
  openTimeStr: string,
  closeTimeStr: string,
  durationMinutes: number
): string[] => {
  const slots: string[] = [];

  const [openHour, openMin] = openTimeStr.split(':').map(Number);
  const [closeHour, closeMin] = closeTimeStr.split(':').map(Number);

  let currentMinute = openHour * 60 + openMin;
  const closingMinute = closeHour * 60 + closeMin;

  // Garante que o agendamento termina ANTES ou EXATAMENTE no horário de fechamento
  while (currentMinute + durationMinutes <= closingMinute) {
    const h = Math.floor(currentMinute / 60).toString().padStart(2, '0');
    const m = (currentMinute % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);

    // Incrementa a grade pelo tempo de duração do serviço (ex: de 30 em 30 min ou de 60 em 60 min)
    currentMinute += durationMinutes;
  }

  return slots;
};

// 4. Buscar agendamentos existentes do cliente
export const getAppointments = async (): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      vehicles (
        brand,
        model,
        plate,
        category
      )
    `)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar agendamentos:', error.message);
    throw error;
  }

  return data || [];
};

// 5. Criar agendamento
export const createAppointment = async (appointment: Omit<Appointment, 'id' | 'user_id' | 'status'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('appointments')
    .insert([
      {
        ...appointment,
        user_id: user.id,
        status: 'pending',
      },
    ])
    .select();

  if (error) {
    console.error('Erro ao criar agendamento:', error.message);
    throw error;
  }

  return data;
};

// 6. Cancelar agendamento
export const cancelAppointment = async (id: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Erro ao cancelar agendamento:', error.message);
    throw error;
  }

  return data;
};