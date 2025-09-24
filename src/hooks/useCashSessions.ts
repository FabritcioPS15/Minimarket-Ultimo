import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface CashSessionDB {
  id: string;
  user_id: string;
  start_amount: number;
  current_amount: number;
  total_sales: number;
  start_time: string;
  end_time?: string | null;
  status: 'active' | 'closed';
  created_at: string;
}

export function useCashSessions() {
  const [sessions, setSessions] = useState<CashSessionDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .order('start_time', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar sesiones');
    } finally {
      setLoading(false);
    }
  };

  const openSession = async (userId: string, startAmount: number) => {
    const payload = {
      user_id: userId,
      start_amount: startAmount,
      current_amount: startAmount,
      total_sales: 0,
      status: 'active' as const,
    };
    const { data, error } = await supabase
      .from('cash_sessions')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    await fetchSessions();
    return data as CashSessionDB;
  };

  const closeSession = async (sessionId: string, totals: { totalCashSales: number; totalSales: number }) => {
    const { totalCashSales, totalSales } = totals;
    const payload = {
      end_time: new Date().toISOString(),
      total_sales: totalSales,
      current_amount: totalCashSales,
      status: 'closed' as const,
    };
    const { data, error } = await supabase
      .from('cash_sessions')
      .update(payload)
      .eq('id', sessionId)
      .select()
      .single();
    if (error) throw error;
    await fetchSessions();
    return data as CashSessionDB;
  };

  useEffect(() => {
    fetchSessions();
    // realtime
    const channel = supabase
      .channel('cash_sessions_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions' }, () => fetchSessions())
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, []);

  return { sessions, loading, error, refetch: fetchSessions, openSession, closeSession };
}


