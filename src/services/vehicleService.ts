import { supabase } from './supabase';

export interface Vehicle {
  id?: string;
  user_id?: string;
  plate: string;
  brand: string;
  model: string;
  category: 'pequeno' | 'medio' | 'grande' | 'moto';
  color?: string;
  created_at?: string;
}

export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar veículos:', error.message);
    throw error;
  }

  return data || [];
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('vehicles')
    .insert([
      {
        ...vehicle,
        user_id: user.id,
        plate: vehicle.plate.toUpperCase().trim(),
      },
    ])
    .select();

  if (error) {
    console.error('Erro ao cadastrar veículo:', error.message);
    throw error;
  }

  return data;
};

export const updateVehicle = async (id: string, vehicle: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      ...vehicle,
      plate: vehicle.plate.toUpperCase().trim(),
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Erro ao atualizar veículo:', error.message);
    throw error;
  }

  return data;
};

export const deleteVehicle = async (id: string) => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar veículo:', error.message);
    throw error;
  }
};