import { supabase } from './supabase';

export interface ClientProfile {
  id: string;
  email: string;
  full_name?: string;
  cpf?: string;
  phone?: string;
}

export const getClientProfile = async (): Promise<ClientProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Erro ao buscar perfil do cliente:', error.message);
    throw error;
  }

  return {
    id: user.id,
    email: user.email || '',
    full_name: data?.full_name || '',
    cpf: data?.cpf || '',
    phone: data?.phone || '',
  };
};

export const updateClientProfile = async (updates: { full_name: string; phone: string }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select();

  if (error) {
    console.error('Erro ao atualizar perfil do cliente:', error.message);
    throw error;
  }

  return data;
};