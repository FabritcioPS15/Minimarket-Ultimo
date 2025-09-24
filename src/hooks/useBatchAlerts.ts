import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface BatchAlert {
  productId: string;
  productName: string;
  productCode?: string;
  batchNumber: string;
  quantity: number;
  expirationDate: string;
  daysUntilExpiry?: number;
  daysExpired?: number;
  type: 'expiring' | 'expired';
}

export function useBatchAlerts() {
  const [expiringBatches, setExpiringBatches] = useState<BatchAlert[]>([]);
  const [expiredBatches, setExpiredBatches] = useState<BatchAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [functionsAvailable, setFunctionsAvailable] = useState(false);

  const fetchBatchAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Helper fallback: calcular por tablas si RPC no existe
      const fallbackFromTables = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in30 = new Date(today);
        in30.setDate(in30.getDate() + 30);

        const { data: batches, error: batchesError } = await supabase
          .from('product_batches')
          .select('product_id,batch_number,quantity,expiration_date');
        if (batchesError) throw batchesError;

        const productIds = Array.from(new Set((batches || []).map(b => b.product_id)));
        const namesMap = new Map<string, string>();
        const codesMap = new Map<string, string>();
        if (productIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('id,name,code')
            .in('id', productIds);
          (productsData || []).forEach(p => {
            namesMap.set(p.id, p.name);
            codesMap.set(p.id, p.code);
          });
        }

        const expiring: any[] = [];
        const expired: any[] = [];
        (batches || []).forEach(b => {
          if (!b.expiration_date) return;
          const expDate = new Date(b.expiration_date);
          expDate.setHours(0,0,0,0);
          if (expDate < today) {
            const daysExpired = Math.ceil((today.getTime() - expDate.getTime()) / (24*60*60*1000));
            expired.push({
              product_id: b.product_id,
              product_name: namesMap.get(b.product_id) || 'Producto',
              product_code: codesMap.get(b.product_id) || '',
              batch_number: b.batch_number,
              quantity: b.quantity,
              expiration_date: b.expiration_date,
              days_expired: daysExpired,
            });
          } else if (expDate <= in30) {
            const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (24*60*60*1000));
            expiring.push({
              product_id: b.product_id,
              product_name: namesMap.get(b.product_id) || 'Producto',
              product_code: codesMap.get(b.product_id) || '',
              batch_number: b.batch_number,
              quantity: b.quantity,
              expiration_date: b.expiration_date,
              days_until_expiry: daysUntil,
            });
          }
        });

        const expiringAlerts: BatchAlert[] = expiring.map((batch: any) => ({
          productId: batch.product_id,
          productName: batch.product_name,
          productCode: batch.product_code,
          batchNumber: batch.batch_number,
          quantity: batch.quantity,
          expirationDate: batch.expiration_date,
          daysUntilExpiry: batch.days_until_expiry,
          type: 'expiring',
        }));
        const expiredAlerts: BatchAlert[] = expired.map((batch: any) => ({
          productId: batch.product_id,
          productName: batch.product_name,
          productCode: batch.product_code,
          batchNumber: batch.batch_number,
          quantity: batch.quantity,
          expirationDate: batch.expiration_date,
          daysExpired: batch.days_expired,
          type: 'expired',
        }));
        setExpiringBatches(expiringAlerts);
        setExpiredBatches(expiredAlerts);
      };

      // Obtener lotes por vencer (ej: próximos 30 días)
      const { data: expiringData, error: expiringError } = await supabase.rpc(
        'get_expiring_batches',
        { days_ahead: 30 }
      );

      if (expiringError && expiringError.code === '42883') {
        console.log('Funciones de lotes no implementadas, usando fallback');
        setFunctionsAvailable(false);
        await fallbackFromTables();
        return;
      }

      if (expiringError) throw expiringError;

      // Obtener lotes vencidos
      const { data: expiredData, error: expiredError } = await supabase.rpc(
        'get_expired_batches'
      );

      if (expiredError && expiredError.code === '42883') {
        console.log('Funciones de lotes no implementadas, usando fallback');
        setFunctionsAvailable(false);
        await fallbackFromTables();
        return;
      }

      if (expiredError) throw expiredError;

      // Si llegamos aquí, significa que las funciones existen
      setFunctionsAvailable(true);

      // Transformar datos de lotes por vencer
      const expiringAlerts: BatchAlert[] = (expiringData || []).map((batch: any) => ({
        productId: batch.product_id,
        productName: batch.product_name,
        productCode: batch.product_code || '',
        batchNumber: batch.batch_number,
        quantity: batch.quantity,
        expirationDate: batch.expiration_date,
        daysUntilExpiry: batch.days_until_expiry,
        type: 'expiring',
      }));

      // Transformar datos de lotes vencidos
      const expiredAlerts: BatchAlert[] = (expiredData || []).map((batch: any) => ({
        productId: batch.product_id,
        productName: batch.product_name,
        productCode: batch.product_code || '',
        batchNumber: batch.batch_number,
        quantity: batch.quantity,
        expirationDate: batch.expiration_date,
        daysExpired: batch.days_expired,
        type: 'expired',
      }));

      setExpiringBatches(expiringAlerts);
      setExpiredBatches(expiredAlerts);
    } catch (err: any) {
      console.error('Error fetching batch alerts:', err);
      try {
        await fallbackFromTables();
      } catch (e: any) {
        setError(e?.message || err?.message || 'Error al obtener alertas');
        setFunctionsAvailable(false);
        setExpiringBatches([]);
        setExpiredBatches([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener alertas de stock bajo basadas en lotes
  const getLowStockAlerts = async () => {
    try {
      // Cargar productos (para min_stock)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id,name,code,current_stock,min_stock');
      if (productsError) throw productsError;

      // Cargar lotes
      const productIds = (productsData || []).map((p: any) => p.id);
      let batchesData: any[] = [];
      if (productIds.length > 0) {
        const { data: batches, error: batchesError } = await supabase
          .from('product_batches')
          .select('product_id,batch_number,quantity');
        if (batchesError) throw batchesError;
        batchesData = batches || [];
      }

      const idToProduct = new Map<string, any>();
      (productsData || []).forEach((p: any) => idToProduct.set(p.id, p));

      // Alertas por producto
      const productAlerts = (productsData || [])
        .filter((p: any) => Number(p.min_stock) > 0 && Number(p.current_stock) <= Number(p.min_stock))
        .map((p: any) => ({
          productId: p.id,
          productName: p.name,
          productCode: p.code || '',
          currentStock: p.current_stock,
          minStock: p.min_stock,
          type: 'low_stock_product' as const,
        }));

      // Alertas por lote: umbral por lote basado en min_stock/num_lotes con límites razonables
      const grouped: Record<string, any[]> = {};
      batchesData.forEach(b => {
        (grouped[b.product_id] ||= []).push(b);
      });
      const batchAlerts: any[] = [];
      Object.entries(grouped).forEach(([productId, list]) => {
        const prod = idToProduct.get(productId);
        const minStock = Number(prod?.min_stock) || 0;
        const numBatches = list.length;
        // Umbral por lote: máximo entre 1 y min_stock / num_lotes, acotado a 10
        const threshold = Math.max(1, Math.min(10, Math.floor((minStock || 0) / Math.max(1, numBatches))));
        list.forEach((b: any) => {
          if (threshold > 0 && Number(b.quantity) <= threshold) {
            batchAlerts.push({
              productId,
              productName: prod?.name || 'Producto',
              productCode: prod?.code || '',
              batchNumber: b.batch_number,
              batchQuantity: b.quantity,
              perBatchThreshold: threshold,
              type: 'low_stock_batch' as const,
            });
          }
        });
      });

      return { productAlerts, batchAlerts };
    } catch (err: any) {
      console.error('Error fetching low stock alerts:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchBatchAlerts();
  }, []);

  return {
    expiringBatches,
    expiredBatches,
    loading,
    error,
    functionsAvailable,
    refetch: fetchBatchAlerts,
    getLowStockAlerts,
  };
}
