import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuditEntry } from '../types';

export function useAuditLog() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transformAuditFromDB = (dbEntry: any): AuditEntry => {
    console.log('🔍 Transformando entrada de auditoría:', dbEntry);
    return {
      id: dbEntry.id,
      timestamp: dbEntry.created_at,
      userId: dbEntry.user_id,
      username: dbEntry.username || 'Usuario desconocido',
      action: dbEntry.action as any,
      entity: dbEntry.entity as any,
      entityId: dbEntry.record_id || '',
      entityName: dbEntry.entity_name || '',
      details: dbEntry.details || '',
      oldValue: dbEntry.old_data,
      newValue: dbEntry.new_data,
      metadata: dbEntry.metadata,
    };
  };

  const fetchAuditEntries = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Intentando obtener datos de auditoría...');
      console.log('🔍 Supabase client:', supabase);
      
      // Primero probemos una consulta simple
      const { data: testData, error: testError } = await supabase
        .from('audit_logs')
        .select('id, created_at, username')
        .limit(5);
        
      console.log('🧪 Test query result:', { testData, testError });
      
      if (testError) {
        console.error('❌ Error en test query:', testError);
        throw testError;
      }

      // Ahora la consulta completa
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Limitar a 1000 entradas más recientes

      if (error) {
        console.error('❌ Error de Supabase:', error);
        throw error;
      }
      
      if (isMounted) {
        console.log('📊 Datos de auditoría obtenidos:', data);
        console.log('📊 Número de registros:', data?.length || 0);
        console.log('📊 Tipo de datos:', typeof data);
        console.log('📊 Es array?', Array.isArray(data));
        
        if (data && data.length > 0) {
          console.log('📊 Primer registro:', data[0]);
          console.log('📊 Transformando datos...');
          const transformed = data.map(transformAuditFromDB);
          console.log('📊 Datos transformados:', transformed);
          setAuditEntries(transformed);
        } else {
          console.log('📊 No hay datos en audit_logs');
          setAuditEntries([]);
        }
      }
    } catch (err: any) {
      console.error('❌ Error en fetchAuditEntries:', err);
      if (isMounted) {
        setError(err.message || 'Error al cargar datos de auditoría');
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, []);

  const addAuditEntry = async (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    try {
      console.log('💾 Guardando entrada de auditoría:', entry);
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: entry.userId,
          username: entry.username,
          action: entry.action,
          entity: entry.entity,
          table_name: entry.entity, // Usar entity como table_name por ahora
          record_id: entry.entityId,
          entity_name: entry.entityName,
          details: entry.details,
          old_data: entry.oldValue,
          new_data: entry.newValue,
          metadata: entry.metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error al guardar en BD:', error);
        throw error;
      }

      console.log('✅ Entrada guardada en BD:', data);
      // Actualizar el estado local con la nueva entrada
      const newEntry = transformAuditFromDB(data);
      setAuditEntries(prev => [newEntry, ...prev]);

      return data;
    } catch (err: any) {
      console.error('Error adding audit entry:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAuditEntries();
  }, []); // Solo ejecutar una vez al montar el componente

  return {
    auditEntries,
    loading,
    error,
    refetch: fetchAuditEntries,
    addAuditEntry,
  };
}
