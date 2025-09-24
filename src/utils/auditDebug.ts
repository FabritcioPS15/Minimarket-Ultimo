// Utilidad para debug y limpieza de auditoría
import { supabase } from '../lib/supabase';

export const clearAuditLog = async () => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (error) throw error;
    console.log('✅ Registro de auditoría limpiado');
    return true;
  } catch (error) {
    console.error('❌ Error limpiando auditoría:', error);
    return false;
  }
};

export const createTestAuditEntries = async (userId: string, username: string) => {
  const testEntries = [
    {
      user_id: userId,
      username: username,
      action: 'LOGIN',
      entity: 'auth',
      table_name: 'auth',
      record_id: userId,
      entity_name: username,
      details: `Usuario "${username}" inició sesión`,
      old_data: null,
      new_data: { loginTime: new Date().toISOString() },
      metadata: { userRole: 'admin' },
    },
    {
      user_id: userId,
      username: username,
      action: 'PRODUCT_CREATE',
      entity: 'products',
      table_name: 'product',
      record_id: 'test-product-1',
      entity_name: 'Coca Cola',
      details: 'Producto "Coca Cola" (BEB-001) creado - Precio: S/.3.50, Stock: 50, Categoría: Bebidas',
      old_data: null,
      new_data: { name: 'Coca Cola', code: 'BEB-001', price: 3.50 },
      metadata: { productCode: 'BEB-001', productCategory: 'Bebidas' },
    },
    {
      user_id: userId,
      username: username,
      action: 'SALE',
      entity: 'sales',
      table_name: 'sale',
      record_id: 'test-sale-1',
      entity_name: 'Venta #001',
      details: 'Venta realizada por S/.7.00 - Productos: Coca Cola (2) - Cliente: Juan Pérez',
      old_data: null,
      new_data: { total: 7.00, items: 1, paymentMethod: 'cash' },
      metadata: { cashSessionId: 'test-session-1' },
    },
  ];

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(testEntries)
      .select();
    
    if (error) throw error;
    console.log('✅ Entradas de prueba creadas:', data);
    return data;
  } catch (error) {
    console.error('❌ Error creando entradas de prueba:', error);
    return null;
  }
};

// Función para verificar el estado de la tabla audit_log
export const checkAuditLogStatus = async () => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    console.log('📊 Estado actual de audit_log:', data);
    return data;
  } catch (error) {
    console.error('❌ Error verificando audit_log:', error);
    return null;
  }
};
