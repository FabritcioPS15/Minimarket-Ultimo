import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductBatch, BatchConsumption } from '../types';

export function useProductBatches(productId?: string) {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar lotes de un producto específico
  const fetchBatches = async (id?: string) => {
    // Usar el id proporcionado o el productId del hook
    const targetProductId = id || productId;
    
    // Validación crucial: evitar consultas con ID undefined
    if (!targetProductId || targetProductId === 'undefined') {
      console.warn('Product ID is undefined or invalid, skipping fetch');
      setBatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('product_batches')
        .select('*')
        .eq('product_id', targetProductId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedBatches: ProductBatch[] = (data || []).map(batch => ({
        id: batch.id,
        productId: batch.product_id,
        batchNumber: batch.batch_number,
        quantity: Number(batch.quantity) || 0,
        costPrice: Number(batch.cost_price) || 0,
        purchaseDate: batch.purchase_date,
        supplier: batch.supplier,
        expirationDate: batch.expiration_date,
        createdAt: batch.created_at,
        updatedAt: batch.updated_at,
      }));

      setBatches(mappedBatches);
    } catch (err: any) {
      console.error('Error fetching batches:', err);
      setError(err.message);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  // CORREGIDO: Agregar un nuevo lote con validación de duplicados
  const addBatch = async (batchData: Omit<ProductBatch, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!batchData.productId || batchData.productId === 'undefined') {
      throw new Error('Product ID is required to add a batch');
    }

    if (!batchData.batchNumber || batchData.batchNumber.trim() === '') {
      throw new Error('El número de lote es requerido');
    }

    const batchNumber = batchData.batchNumber.trim();
    console.log('➕ Intentando agregar nuevo lote:', { ...batchData, batchNumber });

    try {
      // Verificar duplicados solo para nuevos lotes
      console.log('🔍 Verificando duplicados para nuevo lote:', batchNumber);
      
      const { data: existingBatches, error: checkError } = await supabase
        .from('product_batches')
        .select('id, batch_number')
        .eq('product_id', batchData.productId)
        .eq('batch_number', batchNumber);

      if (checkError) {
        console.error('❌ Error verificando duplicados:', checkError);
        throw checkError;
      }

      console.log('📋 Lotes existentes con mismo número:', existingBatches);

      if (existingBatches && existingBatches.length > 0) {
        const errorMsg = `Ya existe un lote con el número "${batchNumber}" para este producto. Use un número diferente.`;
        console.error('❌ Error de duplicado:', errorMsg);
        throw new Error(errorMsg);
      }

      // Preparar datos con tipos correctos
      const qty = Number(batchData.quantity) || 0;
      const cost = Number(batchData.costPrice) || 0;
      const toISODate = (d?: string) => {
        if (!d) return null;
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return null;
        return dt.toISOString().split('T')[0];
      };

      // Proceder con la inserción
      const { data, error } = await supabase
        .from('product_batches')
        .insert([{
          product_id: batchData.productId,
          batch_number: batchNumber,
          quantity: qty,
          cost_price: cost,
          purchase_date: toISODate(batchData.purchaseDate) || null,
          supplier: batchData.supplier || null,
          expiration_date: toISODate(batchData.expirationDate) || null,
        }])
        .select();

      if (error) {
        console.error('❌ Error en INSERT:', error);
        if (error.code === '23505') {
          throw new Error(`Ya existe un lote con el número "${batchNumber}" para este producto.`);
        }
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo crear el lote');
      }

      console.log('✅ INSERT ejecutado correctamente');

      const newBatch: ProductBatch = {
        id: data[0].id,
        productId: data[0].product_id,
        batchNumber: data[0].batch_number,
        quantity: data[0].quantity,
        costPrice: data[0].cost_price,
        purchaseDate: data[0].purchase_date,
        supplier: data[0].supplier,
        expirationDate: data[0].expiration_date,
        createdAt: data[0].created_at,
        updatedAt: data[0].updated_at,
      };

      setBatches(prev => [...prev, newBatch]);
      return newBatch;
    } catch (err: any) {
      console.error('💥 Error adding batch:', err);
      const message = err?.message || err?.error_description || 'Error de red/permiso al guardar lote';
      throw new Error(message);
    }
  };

  // CORREGIDO: Actualizar un lote existente con validación de duplicados
  const updateBatch = async (batchId: string, updates: Partial<ProductBatch>) => {
    try {
      console.log('🔄 Iniciando actualización del lote:', batchId);
      console.log('📝 Datos a actualizar:', updates);

      // Buscar el lote actual para obtener sus datos
      const currentBatch = batches.find(b => b.id === batchId);
      
      if (!currentBatch) {
        throw new Error('No se encontró el lote a actualizar');
      }

      console.log('📋 Lote actual:', currentBatch);

      // Si se está actualizando el batchNumber, verificar duplicados
      if (updates.batchNumber !== undefined && updates.batchNumber.trim() !== '') {
        const newBatchNumber = updates.batchNumber.trim();
        
        // Solo verificar duplicados si el número realmente cambió
        if (newBatchNumber !== currentBatch.batchNumber) {
          console.log('🔍 Verificando duplicados para:', newBatchNumber);
          console.log('📊 Comparando con número actual:', currentBatch.batchNumber);

          // Verificar si el nuevo número de lote ya existe para este producto
          const { data: existingBatches, error: checkError } = await supabase
            .from('product_batches')
            .select('id, batch_number')
            .eq('product_id', currentBatch.productId)
            .eq('batch_number', newBatchNumber);

          if (checkError) {
            console.error('❌ Error verificando duplicados:', checkError);
            throw checkError;
          }

          console.log('📋 Lotes existentes con mismo número:', existingBatches);

          // Filtrar para excluir el lote actual (por si acaso)
          const otherBatches = existingBatches?.filter(batch => batch.id !== batchId) || [];
          
          if (otherBatches.length > 0) {
            const errorMsg = `Ya existe un lote con el número "${newBatchNumber}" para este producto. Use un número diferente.`;
            console.error('❌ Error de duplicado:', errorMsg);
            throw new Error(errorMsg);
          }
        } else {
          console.log('✅ Mismo número de lote, no necesita verificación de duplicados');
        }
      }

      const updateData: any = {};
      
      if (updates.batchNumber !== undefined) updateData.batch_number = updates.batchNumber.trim();
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
      if (updates.purchaseDate !== undefined) updateData.purchase_date = updates.purchaseDate;
      if (updates.supplier !== undefined) updateData.supplier = updates.supplier;
      if (updates.expirationDate !== undefined) updateData.expiration_date = updates.expirationDate;

      updateData.updated_at = new Date().toISOString();

      console.log('📤 Enviando update a la base de datos:', updateData);

      // Hacer el update y retornar los datos actualizados
      const { data, error: updateError } = await supabase
        .from('product_batches')
        .update(updateData)
        .eq('id', batchId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error en UPDATE:', updateError);
        if (updateError.code === '23505') {
          throw new Error(`Ya existe un lote con ese número para este producto. Use un número diferente.`);
        }
        throw updateError;
      }

      console.log('✅ UPDATE ejecutado correctamente');

      const updatedBatch: ProductBatch = {
        id: data.id,
        productId: data.product_id,
        batchNumber: data.batch_number,
        quantity: data.quantity,
        costPrice: data.cost_price,
        purchaseDate: data.purchase_date,
        supplier: data.supplier,
        expirationDate: data.expiration_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Actualizar estado local
      setBatches(prev => {
        const newBatches = prev.map(batch => 
          batch.id === batchId ? updatedBatch : batch
        );
        console.log('✅ Estado local actualizado. Total lotes:', newBatches.length);
        return newBatches;
      });

      return updatedBatch;
    } catch (err: any) {
      console.error('💥 Error updating batch:', err);
      throw new Error(err.message);
    }
  };

  // CORREGIDO: Eliminar un lote - VERSIÓN MEJORADA
  const deleteBatch = async (batchId: string) => {
    try {
      console.log('🗑️ Iniciando eliminación del lote:', batchId);
      
      // Guardar el estado anterior para rollback en caso de error
      const previousBatches = [...batches];
      
      // Actualizar estado local inmediatamente (optimistic update)
      setBatches(prev => {
        const newBatches = prev.filter(batch => batch.id !== batchId);
        console.log('✅ Estado local actualizado. Lotes restantes:', newBatches.length);
        return newBatches;
      });

      // Hacer la eliminación en la base de datos
      const { error } = await supabase
        .from('product_batches')
        .delete()
        .eq('id', batchId);

      if (error) {
        console.error('❌ Error en la base de datos:', error);
        // Revertir el cambio en caso de error
        setBatches(previousBatches);
        throw error;
      }

      console.log('✅ Lote eliminado correctamente de la base de datos');

      // Forzar recarga desde la base de datos después de eliminar
      if (productId && productId !== 'undefined') {
        setTimeout(() => {
          fetchBatches(productId);
        }, 500);
      }

      return true;
      
    } catch (err: any) {
      console.error('💥 Error crítico al eliminar lote:', err);
      
      // Forzar recarga del estado actual desde la BD
      if (productId && productId !== 'undefined') {
        setTimeout(() => {
          fetchBatches(productId);
        }, 500);
      }
      
      throw new Error(err.message || 'Error al eliminar el lote');
    }
  };

  // Consumir stock de lotes usando método FIFO
  const consumeBatchStock = async (productId: string, quantity: number): Promise<BatchConsumption[]> => {
    try {
      // Validar que el productId sea válido
      if (!productId || productId === 'undefined') {
        throw new Error('Valid Product ID is required to consume stock');
      }

      const { data, error } = await supabase
        .rpc('consume_batch_stock', {
          p_product_id: productId,
          p_quantity: quantity
        });

      if (error) throw error;

      const consumptions: BatchConsumption[] = (data || []).map((item: any) => ({
        batchId: item.batch_id,
        consumedQuantity: item.consumed_quantity,
        batchCostPrice: item.batch_cost_price,
      }));

      // Actualizar el estado local de los lotes
      await fetchBatches(productId);

      return consumptions;
    } catch (err: any) {
      console.error('Error consuming batch stock:', err);
      throw new Error(err.message);
    }
  };

  // Obtener alertas de lotes por vencer
  const getExpiringBatches = async (daysAhead: number = 30) => {
    try {
      const { data, error } = await supabase
        .rpc('get_expiring_batches', {
          days_ahead: daysAhead
        });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching expiring batches:', err);
      throw new Error(err.message);
    }
  };

  // Obtener alertas de lotes vencidos
  const getExpiredBatches = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_expired_batches');

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching expired batches:', err);
      throw new Error(err.message);
    }
  };

  // Cargar lotes automáticamente cuando cambia el productId
  useEffect(() => {
    if (productId && productId !== 'undefined') {
      fetchBatches(productId);
    } else {
      // Limpiar los lotes si no hay un productId válido
      setBatches([]);
      setLoading(false);
    }
  }, [productId]);

  // Suscripción en tiempo real para el producto actual
  useEffect(() => {
    if (!productId || productId === 'undefined') return;
    const channel = supabase
      .channel(`product_batches_${productId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_batches', filter: `product_id=eq.${productId}` }, () => {
        fetchBatches(productId);
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [productId]);

  return {
    batches,
    loading,
    error,
    fetchBatches,
    addBatch,
    updateBatch,
    deleteBatch,
    consumeBatchStock,
    getExpiringBatches,
    getExpiredBatches,
    refetch: () => {
      if (productId && productId !== 'undefined') {
        return fetchBatches(productId);
      } else {
        setBatches([]);
        return Promise.resolve();
      }
    },
  };
}