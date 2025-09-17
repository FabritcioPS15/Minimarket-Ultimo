/*
  # Crear tabla de productos

  1. Nuevas Tablas
    - `products`
      - `id` (uuid, clave primaria)
      - `code` (text, único, código del producto)
      - `name` (text, nombre del producto)
      - `description` (text, descripción del producto)
      - `category` (text, categoría del producto)
      - `brand` (text, marca del producto)
      - `cost_price` (numeric, precio de costo)
      - `sale_price` (numeric, precio de venta)
      - `profit_percentage` (numeric, porcentaje de ganancia)
      - `current_stock` (integer, stock actual)
      - `min_stock` (integer, stock mínimo)
      - `max_stock` (integer, stock máximo)
      - `expiration_date` (date, fecha de vencimiento, opcional)
      - `image_url` (text, URL de imagen, opcional)
      - `created_at` (timestamptz, fecha de creación)
      - `updated_at` (timestamptz, fecha de actualización)

  2. Seguridad
    - Habilitar RLS en la tabla `products`
    - Agregar política para permitir todas las operaciones a usuarios autenticados
    - Agregar política para permitir lectura a usuarios anónimos (para el punto de venta)

  3. Índices
    - Índice en `code` para búsquedas rápidas por código
    - Índice en `category` para filtros por categoría
    - Índice en `current_stock` para reportes de inventario
*/

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  brand text DEFAULT '',
  cost_price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2) NOT NULL DEFAULT 0,
  profit_percentage numeric(5,2) DEFAULT 0,
  current_stock integer DEFAULT 0,
  min_stock integer DEFAULT 0,
  max_stock integer DEFAULT 100,
  expiration_date date,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Authenticated users can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para permitir lectura a usuarios anónimos (para punto de venta público)
CREATE POLICY "Anonymous users can read products"
  ON products
  FOR SELECT
  TO anon
  USING (true);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(current_stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();