import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export function useProducts() {
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
  });

  // Cargar productos
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedProducts = data?.map(transformFromDB) || [];
      setProducts(transformedProducts);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIÓN SEGURA para agregar producto
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('=== INICIANDO INSERCIÓN ===');
      
      // 1. ELIMINAR CUALQUIER CAMPO QUE NO DEBERÍA IR
      const safeData = { ...productData };
      
      // Remover campos problemáticos explícitamente
      const fieldsToRemove = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'];
      fieldsToRemove.forEach(field => {
        if (field in safeData) {
          console.warn(`⚠️ Removiendo campo ${field} con valor:`, (safeData as any)[field]);
          delete (safeData as any)[field];
        }
      });

      // 2. CALCULAR PORCENTAJE DE GANANCIA
      const costPrice = Number(safeData.costPrice) || 0;
      const salePrice = Number(safeData.salePrice) || 0;
      const profitPercentage = costPrice > 0 
        ? ((salePrice - costPrice) / costPrice) * 100 
        : 0;

      // 3. PREPARAR DATOS PARA LA BASE DE DATOS
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

      console.log('📤 Datos a insertar:', dbProduct);

      // 4. INSERTAR EN LA BASE DE DATOS
      const { data, error } = await supabase
        .from('products')
        .insert([dbProduct])
        .select()
        .single();

      if (error) {
        console.error('❌ Error de Supabase:', error);
        throw error;
      }

      console.log('✅ Producto insertado correctamente');
      const newProduct = transformFromDB(data);
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;

    } catch (err) {
      console.error('💥 Error adding product:', err);
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
    } catch (err) {
      console.error('Error updating product:', err);
      throw new Error('Error al actualizar producto');
    }
  };

  // Eliminar producto
  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error('Error deleting product:', err);
      throw new Error('Error al eliminar producto');
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
      console.error('Error finding product by code:', err);
      throw new Error('Error al buscar producto');
    }
  };

  // Efecto para carga inicial
  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    findProductByCode,
    refetch: fetchProducts,
  };
}