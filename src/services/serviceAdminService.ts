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
  // Tenta pegar a sessão atual de forma mais direta para evitar falhas rápidas de token
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  // Se não encontrar na sessão, tenta pegar via getUser()
  let userId = user?.id;
  if (!userId) {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id;
  }

  const { data, error } = await supabase
    .from('services')
    .insert([
      {
        ...service,
        admin_id: userId || null, // Salva o ID se existir, ou null para evitar travar caso a sessão demore
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