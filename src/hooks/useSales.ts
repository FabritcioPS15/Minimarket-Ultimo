// ✅ Este es el código completo y corregido para tu `useSales.ts`
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Sale, BatchConsumption } from '../types';

interface SaleFromDB {
  id: string;
  sale_number: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  operation_number?: string;
  customer_name?: string;
  customer_document?: string;
  status: string;
  created_at: string;
  created_by: string;
  sale_items: SaleItemFromDB[];
}

interface SaleItemFromDB {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FUNCIÓN CORREGIDA para leer los datos que se guardaron
  const transformSaleFromDB = (dbSale: any): Sale => ({
    id: dbSale.id,
    saleNumber: dbSale.sale_number,
    items: dbSale.sale_items.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      // ✅ Lee el nombre directamente de `item.product_name`
      productName: item.product_name,
      name: item.product_name,
      quantity: item.quantity,
      // ✅ Lee el precio unitario directamente de `item.unit_price`
      unitPrice: item.unit_price,
      price: item.unit_price,
      total: item.total,
    })),
    subtotal: dbSale.subtotal,
    tax: dbSale.tax,
    total: dbSale.total,
    paymentMethod: dbSale.payment_method as any,
    operationNumber: dbSale.operation_number,
    customerName: dbSale.customer_name,
    customerDocument: dbSale.customer_document,
    status: dbSale.status as any,
    createdAt: dbSale.created_at,
    createdBy: dbSale.created_by,
  });

  const fetchSales = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`*, sale_items(*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (isMounted) setSales(data?.map(transformSaleFromDB) || []);
    } catch (err: any) {
      if (isMounted) setError(err.message);
    } finally {
      if (isMounted) setLoading(false);
    }
    return () => { isMounted = false };
  }, []);

  // ✅ FUNCIÓN CORREGIDA para guardar el nombre y precio
  const addSale = async (saleData: Omit<Sale, 'id'>) => {
    try {
      console.log('🛒 Agregando nueva venta:', saleData);

      const saleToInsert = {
        sale_number: saleData.saleNumber,
        subtotal: saleData.subtotal,
        tax: saleData.tax,
        total: saleData.total,
        payment_method: saleData.paymentMethod,
        operation_number: saleData.operationNumber || null,
        customer_name: saleData.customerName || null,
        customer_document: saleData.customerDocument || null,
        status: saleData.status,
        created_by: saleData.createdBy,
      };

      const { data: saleResult, error: saleError } = await supabase
        .from('sales')
        .insert([saleToInsert])
        .select()
        .single();

      if (saleError) throw saleError;

      // ✅ Mapeamos el array para insertar
      const itemsToInsert = saleData.items.map(item => ({
        sale_id: saleResult.id,
        product_id: item.productId,
        product_name: item.productName || '', // ✅ Ahora lee el nombre de `saleData.items`
        quantity: item.quantity,
        unit_price: item.unitPrice || 0,     // ✅ Ahora lee el precio de `saleData.items`
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      console.log('✅ Venta agregada correctamente');
      
      await fetchSales();
      
      return saleResult;
    } catch (err: any) {
      console.error('❌ Error adding sale:', err);
      throw new Error(`Error al agregar venta: ${err.message}`);
    }
  };

  // Nueva función para procesar ventas con consumo de lotes (FIFO)
  const addSaleWithBatchConsumption = async (saleData: Omit<Sale, 'id'>) => {
    try {
      console.log('🛒 Agregando nueva venta con consumo de lotes:', saleData);

      // 1) Verificación de stock por lectura (no consumir aquí)
      for (const item of saleData.items) {
        const { data: batches, error: checkError } = await supabase
          .from('product_batches')
          .select('quantity')
          .eq('product_id', item.productId);

        if (checkError) {
          throw new Error(`No se pudo verificar stock de ${item.productName}: ${checkError.message}`);
        }

        const totalAvailable = (batches || []).reduce((sum: number, b: any) => sum + Number(b.quantity || 0), 0);
        if (totalAvailable < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.productName}. Disponible: ${totalAvailable}, requerido: ${item.quantity}`);
        }
      }

      // 2) Insertar la venta (sin consumir aún)
      const saleResult = await addSale(saleData);

      // 3) Consumir stock de lotes EXACTAMENTE UNA VEZ por item
      for (const item of saleData.items) {
        const { error: consumeError } = await supabase.rpc('consume_batch_stock', {
          p_product_id: item.productId,
          p_quantity: item.quantity
        });
        if (consumeError) {
          throw new Error(`Error al consumir lotes de ${item.productName}: ${consumeError.message}`);
        }
      }

      console.log('✅ Venta procesada con consumo de lotes correctamente');
      return saleResult;
    } catch (err: any) {
      console.error('❌ Error processing sale with batch consumption:', err);
      throw new Error(`Error al procesar venta: ${err.message}`);
    }
  };

  // El resto del código se mantiene igual
  const updateSale = async (sale: Sale) => {
    try {
      const saleToUpdate = {
        sale_number: sale.saleNumber,
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        payment_method: sale.paymentMethod,
        operation_number: sale.operationNumber || null,
        customer_name: sale.customerName || null,
        customer_document: sale.customerDocument || null,
        status: sale.status,
      };

      const { error } = await supabase
        .from('sales')
        .update(saleToUpdate)
        .eq('id', sale.id);

      if (error) throw error;

      await fetchSales();
    } catch (err: any) {
      console.error('Error updating sale:', err);
      throw new Error('Error al actualizar venta');
    }
  };

  const deleteSale = async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;

      setSales(prev => prev.filter(s => s.id !== saleId));
    } catch (err: any) {
      console.error('Error deleting sale:', err);
      throw new Error('Error al eliminar venta');
    }
  };

  const getSalesByDateRange = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`*, sale_items(*)`)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(transformSaleFromDB) || [];
    } catch (err: any) {
      console.error('Error fetching sales by date range:', err);
      throw new Error('Error al obtener ventas por fecha');
    }
  };

  const getSalesStats = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('total, created_at, payment_method');

      if (error) throw error;

      const today = new Date().toDateString();
      const todaySales = data?.filter(sale => 
        new Date(sale.created_at).toDateString() === today
      ) || [];

      return {
        totalSales: data?.length || 0,
        totalRevenue: data?.reduce((sum, sale) => sum + sale.total, 0) || 0,
        todaySales: todaySales.length,
        todayRevenue: todaySales.reduce((sum, sale) => sum + sale.total, 0),
        paymentMethods: data?.reduce((acc, sale) => {
          acc[sale.payment_method] = (acc[sale.payment_method] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
      };
    } catch (err: any) {
      console.error('Error fetching sales stats:', err);
      throw new Error('Error al obtener estadísticas');
    }
  };

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // 🔔 Suscripción en tiempo real para refrescar ventas inmediatamente
  useEffect(() => {
    const channel = supabase
      .channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSales();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => {
        fetchSales();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [fetchSales]);

  return {
    sales,
    loading,
    error,
    addSale,
    addSaleWithBatchConsumption,
    updateSale,
    deleteSale,
    getSalesByDateRange,
    getSalesStats,
    refetch: fetchSales,
  };
}