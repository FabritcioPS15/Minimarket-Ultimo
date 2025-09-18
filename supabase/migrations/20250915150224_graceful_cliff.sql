/*
  # Crear tablas para el sistema de ventas

  1. Nuevas Tablas
    - `sales` - Tabla principal de ventas
      - `id` (uuid, primary key)
      - `sale_number` (text, unique) - Número de venta
      - `subtotal` (numeric) - Subtotal sin impuestos
      - `tax` (numeric) - Impuestos
      - `total` (numeric) - Total de la venta
      - `payment_method` (text) - Método de pago
      - `operation_number` (text, optional) - Número de operación
      - `customer_name` (text, optional) - Nombre del cliente
      - `customer_document` (text, optional) - Documento del cliente
      - `status` (text) - Estado de la venta
      - `created_at` (timestamp) - Fecha de creación
      - `created_by` (uuid) - Usuario que creó la venta

    - `sale_items` - Elementos de cada venta
      - `id` (uuid, primary key)
      - `sale_id` (uuid, foreign key) - Referencia a la venta
      - `product_id` (uuid, foreign key) - Referencia al producto
      - `product_name` (text) - Nombre del producto al momento de la venta
      - `quantity` (integer) - Cantidad vendida
      - `unit_price` (numeric) - Precio unitario
      - `total` (numeric) - Total del item

  2. Seguridad
    - Habilitar RLS en ambas tablas
    - Políticas para usuarios autenticados
*/

-- Crear tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text UNIQUE NOT NULL,
  subtotal numeric(10,2) DEFAULT 0 NOT NULL,
  tax numeric(10,2) DEFAULT 0 NOT NULL,
  total numeric(10,2) DEFAULT 0 NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'yape', 'plin', 'other')),
  operation_number text,
  customer_name text,
  customer_document text,
  status text DEFAULT 'completed' NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Crear tabla de items de venta
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Habilitar Row Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla sales
CREATE POLICY "Usuarios autenticados pueden ver todas las ventas"
  ON sales
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear ventas"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo admins pueden actualizar ventas"
  ON sales
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar ventas"
  ON sales
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Políticas para la tabla sale_items
CREATE POLICY "Usuarios autenticados pueden ver items de venta"
  ON sale_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear items de venta"
  ON sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo admins pueden actualizar items de venta"
  ON sale_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar items de venta"
  ON sale_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Función para actualizar el total de una venta automáticamente
CREATE OR REPLACE FUNCTION update_sale_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales 
  SET 
    subtotal = (
      SELECT COALESCE(SUM(total), 0) 
      FROM sale_items 
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    ),
    total = (
      SELECT COALESCE(SUM(total), 0) 
      FROM sale_items 
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    )
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar totales automáticamente
CREATE TRIGGER update_sale_total_on_insert
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sale_total();

CREATE TRIGGER update_sale_total_on_update
  AFTER UPDATE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sale_total();

CREATE TRIGGER update_sale_total_on_delete
  AFTER DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sale_total();