/*
  # Crear tabla de usuarios del sistema

  1. Nueva Tabla
    - `users`
      - `id` (uuid, primary key, referencia a auth.users)
      - `username` (text, único)
      - `email` (text, único)
      - `role` (text, con constraint para roles válidos)
      - `is_active` (boolean, por defecto true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Seguridad
    - Habilitar RLS en la tabla `users`
    - Políticas para que solo admins puedan gestionar usuarios
    - Política para que usuarios puedan ver su propio perfil

  3. Funciones
    - Trigger para actualizar `updated_at` automáticamente
*/

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'supervisor', 'cashier')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para actualizar updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuarios por defecto (solo si no existen)
DO $$
BEGIN
  -- Admin user
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
    INSERT INTO users (id, username, email, role, is_active)
    VALUES (
      gen_random_uuid(),
      'admin',
      'admin@sistema.com',
      'admin',
      true
    );
  END IF;

  -- Supervisor user
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'supervisor') THEN
    INSERT INTO users (id, username, email, role, is_active)
    VALUES (
      gen_random_uuid(),
      'supervisor',
      'supervisor@sistema.com',
      'supervisor',
      true
    );
  END IF;

  -- Cashier user
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'vendedor') THEN
    INSERT INTO users (id, username, email, role, is_active)
    VALUES (
      gen_random_uuid(),
      'vendedor',
      'vendedor@sistema.com',
      'cashier',
      true
    );
  END IF;
END $$;