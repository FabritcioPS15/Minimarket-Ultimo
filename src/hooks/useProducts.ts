import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export function useProducts() {
  const DEBUG = false;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convertir datos de la base de datos al formato de la aplicación
  const transformFromDB = (dbProduct: any): Product => ({
    id: dbProduct.id,
    code: dbProduct.code,
    name: dbProduct.name,
    description: dbProduct.description,
    category: dbProduct.category,
    brand: dbProduct.brand,
    costPrice: parseFloat(dbProduct.cost_price),
    salePrice: parseFloat(dbProduct.sale_price),
    profitPercentage: parseFloat(dbProduct.profit_percentage),
    currentStock: dbProduct.current_stock,
    minStock: dbProduct.min_stock,
    maxStock: dbProduct.max_stock,
    expirationDate: dbProduct.expiration_date,
    imageUrl: dbProduct.image_url,
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at,
    // campo lógico para UI
    // @ts-ignore
    isActive: dbProduct.is_active,
  });

  // Cargar productos
  const fetchProducts = async () => {
    try {
      if (DEBUG) console.log('🔄 Iniciando carga de productos...');
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (DEBUG) console.log('📊 Respuesta de Supabase:', { data, error });

      if (error) {
        if (DEBUG) console.error('❌ Error de Supabase:', error);
        throw error;
      }

      const transformedProducts = data?.map(transformFromDB) || [];
      if (DEBUG) console.log('✅ Productos transformados:', transformedProducts);
      setProducts(transformedProducts);
      setError(null);
    } catch (err) {
      if (DEBUG) console.error('💥 Error fetching products:', err);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
      if (DEBUG) console.log('🏁 Carga de productos finalizada');
    }
  };

  // FUNCIÓN SEGURA para agregar producto
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (DEBUG) console.log('=== INICIANDO INSERCIÓN ===');
      
      // 1. ELIMINAR CUALQUIER CAMPO QUE NO DEBERÍA IR
      const safeData = { ...productData };
      
      // Remover campos problemáticos explícitamente
      const fieldsToRemove = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'];
      fieldsToRemove.forEach(field => {
        if (field in safeData) {
          if (DEBUG) console.warn(`⚠️ Removiendo campo ${field} con valor:`, (safeData as any)[field]);
          delete (safeData as any)[field];
        }
      });

      // 2. AJUSTAR CÓDIGO SECUENCIAL POR CATEGORÍA (prefijo) O GLOBAL SI NO HAY CATEGORÍA
      try {
        const existingCodes = new Set((products || []).map(p => String(p.code || '').trim()).filter(Boolean));

        const rawCategory = String((safeData as any).category || '').trim();
        const buildPrefix = (category: string) => {
          const letters = category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '');
          const abbr = (letters.toUpperCase().slice(0, 3) || 'GEN');
          return `${abbr}-`;
        };

        const tryCategorySequential = () => {
          if (!rawCategory) return false;
          const prefix = buildPrefix(rawCategory);
          const pattern = new RegExp(`^${prefix}(\\d+)$`);
          const prefixed = Array.from(existingCodes)
            .map(c => ({ c, m: c.match(pattern) }))
            .filter(x => !!x.m) as { c: string; m: RegExpMatchArray }[];
          if (prefixed.length === 0) return false;
          const maxLen = Math.max(...prefixed.map(x => x.m[1].length));
          const maxNum = Math.max(...prefixed.map(x => parseInt(x.m[1], 10)));
          const pad = (n: number) => String(n).padStart(maxLen, '0');

          const provided = String(safeData.code || '').trim();
          const providedMatch = provided.match(pattern);
          let candidateNum: number;
          if (!provided || providedMatch) {
            if (!providedMatch) {
              candidateNum = maxNum + 1;
            } else {
              const providedNum = parseInt(providedMatch[1], 10);
              candidateNum = providedNum > maxNum + 1 ? maxNum + 1 : providedNum;
            }
            let candidate = `${prefix}${pad(candidateNum)}`;
            while (existingCodes.has(candidate)) {
              candidateNum += 1;
              candidate = `${prefix}${pad(candidateNum)}`;
            }
            safeData.code = candidate;
            return true;
          }
          return false;
        };

        const didCategory = tryCategorySequential();
        if (!didCategory) {
          // Fallback: solo numérico (sin prefijo)
          const numericCodes = Array.from(existingCodes).filter(c => /^\d+$/.test(c));
          if (numericCodes.length > 0) {
            const maxLen = Math.max(...numericCodes.map(c => c.length));
            const maxNum = Math.max(...numericCodes.map(c => parseInt(c, 10)));
            const pad = (n: number) => String(n).padStart(maxLen, '0');

            const provided = String(safeData.code || '').trim();
            if (!provided || /^\d+$/.test(provided)) {
              let candidateNum: number;
              if (!provided) {
                candidateNum = maxNum + 1;
              } else {
                const providedNum = parseInt(provided, 10);
                candidateNum = providedNum > maxNum + 1 ? maxNum + 1 : providedNum;
              }
              let candidate = pad(candidateNum);
              while (existingCodes.has(candidate)) {
                candidateNum += 1;
                candidate = pad(candidateNum);
              }
              safeData.code = candidate;
            }
          }
        }
      } catch (seqErr) {
        if (DEBUG) console.warn('No se pudo ajustar código secuencial:', seqErr);
      }

      // 3. CALCULAR PORCENTAJE DE GANANCIA
      const costPrice = Number(safeData.costPrice) || 0;
      const salePrice = Number(safeData.salePrice) || 0;
      const profitPercentage = costPrice > 0 
        ? ((salePrice - costPrice) / costPrice) * 100 
        : 0;

      // 4. PREPARAR DATOS PARA LA BASE DE DATOS
      const dbProduct = {
        code: safeData.code || '',
        name: safeData.name || '',
        description: safeData.description || '',
        category: safeData.category || '',
        brand: safeData.brand || '',
        cost_price: costPrice,
        sale_price: salePrice,
        profit_percentage: profitPercentage,
        current_stock: Number(safeData.currentStock) || 0,
        min_stock: Number(safeData.minStock) || 0,
        max_stock: Number(safeData.maxStock) || 100,
        expiration_date: safeData.expirationDate || null,
        image_url: safeData.imageUrl || null,
      };

      if (DEBUG) console.log('📤 Datos a insertar:', dbProduct);

      // 5. INSERTAR EN LA BASE DE DATOS
      const { data, error } = await supabase
        .from('products')
        .insert([dbProduct])
        .select()
        .single();

      if (error) {
        if (DEBUG) console.error('❌ Error de Supabase:', error);
        throw error;
      }

      if (DEBUG) console.log('✅ Producto insertado correctamente');
      const newProduct = transformFromDB(data);
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;

    } catch (err) {
      if (DEBUG) console.error('💥 Error adding product:', err);
      throw new Error(`Error al agregar producto: ${err.message}`);
    }
  };

  // Actualizar producto
  const updateProduct = async (product: Product) => {
    try {
      const costPrice = Number(product.costPrice) || 0;
      const salePrice = Number(product.salePrice) || 0;
      const profitPercentage = costPrice > 0 
        ? ((salePrice - costPrice) / costPrice) * 100 
        : 0;

      const dbProduct = {
        code: product.code,
        name: product.name,
        description: product.description,
        category: product.category,
        brand: product.brand,
        cost_price: costPrice,
        sale_price: salePrice,
        profit_percentage: profitPercentage,
        current_stock: product.currentStock,
        min_stock: product.minStock,
        max_stock: product.maxStock,
        expiration_date: product.expirationDate || null,
        image_url: product.imageUrl || null,
      };

      const { data, error } = await supabase
        .from('products')
        .update(dbProduct)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;

      const updatedProduct = transformFromDB(data);
      setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));
      return updatedProduct;
    } catch (err: any) {
      if (DEBUG) console.error('Error updating product:', err);
      const message = err?.message || err?.error_description || 'Error al actualizar producto (posible RLS/permisos)';
      throw new Error(message);
    }
  };

  // Eliminar producto
  const deleteProduct = async (productId: string) => {
    try {
      // Soft delete: ocultar producto (is_active = false)
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === productId ? ({ ...p, isActive: false } as any) : p));
    } catch (err) {
      if (DEBUG) console.error('Error deleting product:', err);
      const message = (err as any)?.message || 'Error al ocultar producto';
      throw new Error(message);
    }
  };

  // Reactivar producto (soft-undelete)
  const activateProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ is_active: true })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;

      const updated = transformFromDB(data);
      // @ts-ignore
      (updated as any).isActive = true;
      setProducts(prev => prev.map(p => p.id === productId ? (updated as any) : p));
      return true;
    } catch (err) {
      if (DEBUG) console.error('Error activating product:', err);
      throw new Error('Error al habilitar producto');
    }
  };

  // Buscar producto por código
  const findProductByCode = async (code: string): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return transformFromDB(data);
    } catch (err) {
      if (DEBUG) console.error('Error finding product by code:', err);
      throw new Error('Error al buscar producto');
    }
  };

  // Efecto para carga inicial
  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    data: products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    activateProduct,
    findProductByCode,
    refetch: fetchProducts,
  };
}