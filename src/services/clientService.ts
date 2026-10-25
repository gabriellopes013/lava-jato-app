import { supabase } from './supabase';

export interface ClientInput {
  name: string;
  phone?: string;
  email?: string;
}

// 1. Buscar todos os clientes (ordenados pelo mais recente)
export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar clientes: ${error.message}`);
  }

  return data;
}

// 2. Cadastrar um novo cliente
export async function createClient(clientData: ClientInput) {
  const { data, error } = await supabase
    .from('clients')
    .insert([clientData])
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao cadastrar cliente: ${error.message}`);
  }

  return data;
}

// 3. Buscar um cliente específico pelo ID
export async function getClientById(id: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar cliente: ${error.message}`);
  }

  return data;
}

// 4. Atualizar os dados de um cliente
export async function updateClient(id: string, clientData: Partial<ClientInput>) {
  const { data, error } = await supabase
    .from('clients')
    .update(clientData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar cliente: ${error.message}`);
  }

  return data;
}

// 5. Deletar um cliente
export async function deleteClient(id: string) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao deletar cliente: ${error.message}`);
  }
}