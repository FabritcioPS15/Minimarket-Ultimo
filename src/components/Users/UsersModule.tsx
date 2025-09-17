import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserX,
  Search,
  Eye,
  EyeOff,
  MoreVertical
} from 'lucide-react';

export function UsersModule() {
  const { state, users } = useApp();
  const { currentUser } = state;
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const filteredUsers = users.data.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const UserForm = ({ user, onClose }: { user?: User | null; onClose: () => void }) => {
    const [formData, setFormData] = useState({
      username: user?.username || '',
      email: user?.email || '',
      role: user?.role || 'cashier' as UserRole,
      isActive: user?.isActive ?? true,
      password: '',
      confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setError('');

      try {
        if (!user && !formData.password.trim()) {
          throw new Error('La contraseña es requerida');
        }

        if (!user && formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }

        if (user) {
          const updatedUser: User = {
            ...user,
            username: formData.username,
            email: formData.email,
            role: formData.role,
            isActive: formData.isActive,
            ...(formData.password.trim() && { password: formData.password })
          };
          await users.updateUser(updatedUser);
        } else {
          await users.addUser({
            username: formData.username,
            email: formData.email,
            role: formData.role,
            isActive: formData.isActive,
            password: formData.password,
          });
        }
        onClose();
      } catch (err) {
        console.error('Error saving user:', err);
        setError(err instanceof Error ? err.message : 'Error al guardar usuario');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6 sticky top-0 bg-white border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {user ? 'Editar Usuario' : 'Agregar Usuario'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Usuario *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ingresa el nombre de usuario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@empresa.com"
              />
            </div>

            {!user && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-sm"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Ingresa la contraseña"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-sm"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirma la contraseña"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña (opcional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Dejar vacío para no cambiar"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Solo completa si deseas cambiar la contraseña
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value="cashier">Cajero</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Usuario Activo
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
              >
                {saving ? 'Guardando...' : (user ? 'Actualizar' : 'Crear')} Usuario
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario');
      return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      setLoading(true);
      try {
        await users.deleteUser(userId);
      } catch (error) {
        alert('Error al eliminar el usuario');
      } finally {
        setLoading(false);
      }
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  if (users.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando usuarios...</span>
      </div>
    );
  }

  const totalUsers = users.data.length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-sm sm:text-base text-gray-600">Administra los usuarios del sistema ({totalUsers} usuarios)</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={loading}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar Usuario</span>
        </button>
      </div>

      {/* Search */}
      {users.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <p>{users.error}</p>
          <button onClick={users.refetch} className="mt-2 text-sm underline">Reintentar</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table - Desktop */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Registro
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'supervisor' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' :
                       user.role === 'supervisor' ? 'Supervisor' : 'Cajero'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.isActive ? (
                        <>
                          <UserCheck className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-600">Activo</span>
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 text-red-500 mr-2" />
                          <span className="text-sm text-red-600">Inactivo</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditUser(user);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        title="Editar usuario"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  Crear Primer Usuario
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Users Cards - Mobile */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <Users className="h-10 w-10 text-gray-400 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{user.username}</h3>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="text-xs">
                <span className="text-gray-500">Rol:</span>
                <span className={`ml-1 inline-flex px-2 py-0.5 font-semibold rounded-full ${
                  user.role === 'admin' ? 'bg-red-100 text-red-800' :
                  user.role === 'supervisor' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'admin' ? 'Admin' :
                   user.role === 'supervisor' ? 'Supervisor' : 'Cajero'}
                </span>
              </div>
              <div className="text-xs flex items-center">
                <span className="text-gray-500">Estado:</span>
                {user.isActive ? (
                  <span className="ml-1 text-green-600 flex items-center">
                    <UserCheck className="h-3 w-3 mr-1" /> Activo
                  </span>
                ) : (
                  <span className="ml-1 text-red-600 flex items-center">
                    <UserX className="h-3 w-3 mr-1" /> Inactivo
                  </span>
                )}
              </div>
              <div className="text-xs col-span-2">
                <span className="text-gray-500">Registro:</span>
                <span className="ml-1">{new Date(user.createdAt).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
            
            {expandedUser === user.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditUser(user);
                    setShowForm(true);
                    setExpandedUser(null);
                  }}
                  className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded text-sm flex items-center"
                >
                  <Edit className="h-3 w-3 mr-1" /> Editar
                </button>
                {user.id !== currentUser?.id && (
                  <button 
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded text-sm flex items-center"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Crear Primer Usuario
              </button>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <UserForm 
          user={editUser} 
          onClose={() => {
            setShowForm(false);
            setEditUser(null);
          }} 
        />
      )}
    </div>
  );
}