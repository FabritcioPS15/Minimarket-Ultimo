import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Supplier {
  id: string;
  name: string;
  documentType: 'RUC' | 'DNI' | 'CE';
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapFromDB(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    documentType: row.document_type,
    documentNumber: row.document_number || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    notes: row.notes || undefined,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSuppliers((data || []).map(mapFromDB));
    } catch (err: any) {
      setError(err.message || 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (s: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & { isActive?: boolean }) => {
    const payload = {
      name: s.name.trim(),
      document_type: s.documentType || 'RUC',
      document_number: s.documentNumber || null,
      email: s.email || null,
      phone: s.phone || null,
      address: s.address || null,
      notes: s.notes || null,
      is_active: s.isActive ?? true,
    };
    const { data, error } = await supabase
      .from('suppliers')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    const created = mapFromDB(data);
    setSuppliers(prev => [created, ...prev]);
    return created;
  };

  const updateSupplier = async (s: Supplier) => {
    const payload = {
      name: s.name.trim(),
      document_type: s.documentType,
      document_number: s.documentNumber || null,
      email: s.email || null,
      phone: s.phone || null,
      address: s.address || null,
      notes: s.notes || null,
      is_active: s.isActive,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', s.id)
      .select()
      .single();
    if (error) throw error;
    const updated = mapFromDB(data);
    setSuppliers(prev => prev.map(x => x.id === s.id ? updated : x));
    return updated;
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setSuppliers(prev => prev.filter(x => x.id !== id));
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return { suppliers, loading, error, refetch: fetchSuppliers, addSupplier, updateSupplier, deleteSupplier };
}


