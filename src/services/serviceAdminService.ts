import { supabase } from './supabase';

export interface ServiceItem {
  id?: string;
  admin_id?: string;
  name: string;
  category: 'pequeno' | 'medio' | 'grande' | 'moto';
  price: number;
  duration_minutes: number;
  active?: boolean;
}

export const getAdminServices = async (): Promise<ServiceItem[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    console.error('Erro ao buscar serviços:', error.message);
    throw error;
  }

  return data || [];
};

export const createAdminService = async (service: Omit<ServiceItem, 'id' | 'admin_id'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('services')
    .insert([
      {
        ...service,
        admin_id: user.id,
        active: true,
      },
    ])
    .select();

  if (error) {
    console.error('Erro ao cadastrar serviço:', error.message);
    throw error;
  }

  return data;
};

export const updateAdminService = async (id: string, updates: Partial<ServiceItem>) => {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Erro ao atualizar serviço:', error.message);
    throw error;
  }

  return data;
};

export const deleteAdminService = async (id: string) => {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar serviço:', error.message);
    throw error;
  }
};