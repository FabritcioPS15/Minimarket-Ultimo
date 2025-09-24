// src/components/Login.tsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Package, Lock, User, Eye, EyeOff } from 'lucide-react';

export function Login() {
  const { dispatch, users, addAuditEntry } = useApp();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 👁 Mostrar contraseña
  const [failedAttempts, setFailedAttempts] = useState(0); // Contador de intentos fallidos
  const [lockout, setLockout] = useState(false); // Bloqueo temporal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si está bloqueado, no permitir intentos
    if (lockout) {
      setError('Demasiados intentos fallidos. Intenta nuevamente en unos segundos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await users.findUserByUsername(credentials.username);

      if (user && user.isActive) {
        if (user.password === credentials.password) {
          dispatch({ type: 'LOGIN', payload: user });
          
          // Registrar en auditoría
          await addAuditEntry({
            action: 'LOGIN',
            entity: 'auth',
            entityId: user.id,
            entityName: user.username,
            details: `Usuario "${user.username}" inició sesión`,
            metadata: {
              userRole: user.role,
              loginTime: new Date().toISOString(),
            },
          });
          
          setFailedAttempts(0); // resetear intentos al éxito
        } else {
          setError('Contraseña incorrecta');
          setFailedAttempts((prev) => prev + 1);
        }
      } else if (user && !user.isActive) {
        setError('Usuario inactivo. Contacte al administrador.');
        setFailedAttempts((prev) => prev + 1);
      } else {
        setError('Usuario no encontrado');
        setFailedAttempts((prev) => prev + 1);
      }

      // Si llega a 5 intentos, bloquear por 10 segundos
      if (failedAttempts + 1 >= 5) {
        setLockout(true);
        setError('Demasiados intentos fallidos. Intenta nuevamente en 10 segundos.');
        setTimeout(() => {
          setLockout(false);
          setFailedAttempts(0);
          setError('');
        }, 10000); // 10 segundos de bloqueo
      }

    } catch (err) {
      console.error('Login error:', err);
      setError('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="bg-blue-600 rounded-full p-3 inline-block mb-4">
              <Package className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema de Inventario</h1>
            <p className="text-gray-600 mt-2">Accede a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu usuario"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  disabled={loading || lockout}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu contraseña"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  disabled={loading || lockout}
                />
                {/* Botón para mostrar/ocultar */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
                {failedAttempts >= 5 && (
                  <p className="mt-2 text-sm text-red-600">
                    Si el problema persiste, comuníquese al número: <strong>+51 999 888 777</strong>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || lockout}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : lockout ? 'Bloqueado temporalmente' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Loading state */}
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-center mt-3 text-gray-700">Verificando credenciales...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
