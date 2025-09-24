import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface BatchSummary {
  productId: string;
  totalBatches: number;
  totalQuantity: number;
  totalValue: number;
  expiringBatches: number;
  expiredBatches: number;
  batches: Array<{
    id: string;
    batchNumber: string;
    quantity: number;
    costPrice: number;
    expirationDate?: string;
  }>;
}

export function useProductBatchSummary(productIds?: string[]) {
  const [batchSummaries, setBatchSummaries] = useState<Record<string, BatchSummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatchSummaries = useCallback(async () => {
    if (!productIds || productIds.length === 0) {
      setBatchSummaries({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('product_batches')
        .select('*')
        .in('product_id', productIds)
        .order('product_id', { ascending: true })
        .order('batch_number', { ascending: true });

      if (error) throw error;

      // Procesar los datos por producto
      const summaries: Record<string, BatchSummary> = {};
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      (data || []).forEach(batch => {
        const productId = batch.product_id;
        
        if (!summaries[productId]) {
          summaries[productId] = {
            productId,
            totalBatches: 0,
            totalQuantity: 0,
            totalValue: 0,
            expiringBatches: 0,
            expiredBatches: 0,
            batches: []
          };
        }

        const batchData = {
          id: batch.id,
          batchNumber: batch.batch_number,
          quantity: batch.quantity,
          costPrice: parseFloat(batch.cost_price),
          expirationDate: batch.expiration_date
        };

        summaries[productId].totalBatches++;
        summaries[productId].totalQuantity += batch.quantity;
        summaries[productId].totalValue += batch.quantity * parseFloat(batch.cost_price);
        summaries[productId].batches.push(batchData);

        // Contar lotes por vencer y vencidos
        if (batch.expiration_date) {
          const expirationDate = new Date(batch.expiration_date);
          if (expirationDate < now) {
            summaries[productId].expiredBatches++;
          } else if (expirationDate <= thirtyDaysFromNow) {
            summaries[productId].expiringBatches++;
          }
        }
      });

      // Mezclar con caché existente para evitar parpadeos al filtrar
      setBatchSummaries(prev => ({ ...prev, ...summaries }));
    } catch (err: any) {
      console.error('Error fetching batch summaries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [productIds]);

  useEffect(() => {
    fetchBatchSummaries();
    // Suscripciones en tiempo real a cambios de product_batches
    const channel = supabase
      .channel('product_batches_summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_batches' }, () => {
        fetchBatchSummaries();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [fetchBatchSummaries]);

  return {
    batchSummaries,
    loading,
    error,
    refetch: fetchBatchSummaries,
  };
}
