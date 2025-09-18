import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Sale } from '../types';

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

  // Transformar datos de la base de datos al formato de la aplicación
  const transformSaleFromDB = (dbSale: SaleFromDB): Sale => ({
    id: dbSale.id,
    saleNumber: dbSale.sale_number,
    items: dbSale.sale_items.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      name: item.product_name, // Para compatibilidad
      quantity: item.quantity,
      unitPrice: item.unit_price,
      price: item.unit_price, // Para compatibilidad
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

  // Cargar ventas desde la base de datos
  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            sale_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedSales = data?.map(transformSaleFromDB) || [];
      setSales(transformedSales);
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      setError('Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Agregar nueva venta
  const addSale = async (saleData: Omit<Sale, 'id'>) => {
    try {
      console.log('🛒 Agregando nueva venta:', saleData);

      // 1. Crear la venta principal
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

      // 2. Crear los items de la venta
      const itemsToInsert = saleData.items.map(item => ({
        sale_id: saleResult.id,
        product_id: item.productId,
        product_name: item.productName || '',
        quantity: item.quantity,
        unit_price: item.unitPrice || 0,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      console.log('✅ Venta agregada correctamente');
      
      // Recargar las ventas para obtener la nueva venta con sus items
      await fetchSales();
      
      return saleResult;
    } catch (err: any) {
      console.error('❌ Error adding sale:', err);
      throw new Error(`Error al agregar venta: ${err.message}`);
    }
  };

  // Actualizar venta (solo para admins)
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

  // Eliminar venta (solo para admins)
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

  // Obtener ventas por rango de fechas
  const getSalesByDateRange = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            sale_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total
          )
        `)
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

  // Obtener estadísticas de ventas
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

  return {
    sales,
    loading,
    error,
    addSale,
    updateSale,
    deleteSale,
    getSalesByDateRange,
    getSalesStats,
    refetch: fetchSales,
  };
}