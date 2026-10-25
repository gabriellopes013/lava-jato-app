import { supabase } from './supabase';

export interface OperatingHourItem {
  id?: string;
  admin_id?: string;
  day_of_week: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export const getAdminOperatingHours = async (): Promise<OperatingHourItem[]> => {
  const { data, error } = await supabase
    .from('operating_hours')
    .select('*')
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('Erro ao buscar horários:', error.message);
    throw error;
  }

  return data || [];
};

export const saveAdminOperatingHour = async (hourItem: Omit<OperatingHourItem, 'id' | 'admin_id'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('operating_hours')
    .upsert(
      [
        {
          ...hourItem,
          admin_id: user.id,
        },
      ],
      { onConflict: 'admin_id,day_of_week' }
    )
    .select();

  if (error) {
    console.error('Erro ao salvar horário de funcionamento:', error.message);
    throw error;
  }

  return data;
};