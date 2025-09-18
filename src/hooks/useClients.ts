import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Client {
  id: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientFromDB {
  id: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transformar datos de la base de datos al formato de la aplicación
  const transformFromDB = (dbClient: ClientFromDB): Client => ({
    id: dbClient.id,
    documentType: dbClient.document_type,
    documentNumber: dbClient.document_number,
    firstName: dbClient.first_name,
    lastName: dbClient.last_name,
    email: dbClient.email,
    phone: dbClient.phone,
    address: dbClient.address,
    isActive: dbClient.is_active,
    createdAt: dbClient.created_at,
    updatedAt: dbClient.updated_at,
  });

  // Transformar datos de la aplicación al formato de la base de datos
  const transformToDB = (client: Partial<Client>) => ({
    document_type: client.documentType,
    document_number: client.documentNumber,
    first_name: client.firstName,
    last_name: client.lastName,
    email: client.email || null,
    phone: client.phone || null,
    address: client.address || null,
    is_active: client.isActive ?? true,
  });

  // Cargar clientes
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedClients = data?.map(transformFromDB) || [];
      setClients(transformedClients);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Agregar cliente
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const dbClient = transformToDB(clientData);

      const { data, error } = await supabase
        .from('customers')
        .insert([dbClient])
        .select()
        .single();

      if (error) throw error;

      const newClient = transformFromDB(data);
      setClients(prev => [newClient, ...prev]);
      return newClient;
    } catch (err: any) {
      console.error('Error adding client:', err);
      throw new Error(`Error al agregar cliente: ${err.message}`);
    }
  };

  // Actualizar cliente
  const updateClient = async (client: Client) => {
    try {
      const dbClient = transformToDB(client);

      const { data, error } = await supabase
        .from('customers')
        .update(dbClient)
        .eq('id', client.id)
        .select()
        .single();

      if (error) throw error;

      const updatedClient = transformFromDB(data);
      setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
      return updatedClient;
    } catch (err: any) {
      console.error('Error updating client:', err);
      throw new Error(`Error al actualizar cliente: ${err.message}`);
    }
  };

  // Eliminar cliente
  const deleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== clientId));
    } catch (err: any) {
      console.error('Error deleting client:', err);
      throw new Error(`Error al eliminar cliente: ${err.message}`);
    }
  };

  // Buscar cliente por documento
  const findClientByDocument = async (documentNumber: string): Promise<Client | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('document_number', documentNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return transformFromDB(data);
    } catch (err: any) {
      console.error('Error finding client by document:', err);
      throw new Error('Error al buscar cliente');
    }
  };

  // Obtener todos los clientes
  const getAllClients = async (): Promise<Client[]> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(transformFromDB) || [];
    } catch (err: any) {
      console.error('Error getting all clients:', err);
      throw new Error('Error al obtener clientes');
    }
  };

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient,
    findClientByDocument,
    getAllClients,
    refetch: fetchClients,
  };
}