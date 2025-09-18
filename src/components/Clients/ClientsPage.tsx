import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Client } from '../../hooks/useClients';
import { User, Mail, Phone, MapPin, FileText, Edit2, Trash2, Plus, Search, X, Save, ArrowLeft, AlertTriangle } from 'lucide-react';

export function ClientsPage() {
  const { clients } = useApp();
  const [form, setForm] = useState<Partial<Client>>({
    documentType: 'DNI',
    documentNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (formError) setFormError(null);
  };

  const validateForm = () => {
    if (!form.firstName?.trim()) {
      setFormError('El nombre es obligatorio');
      return false;
    }
    
    if (!form.lastName?.trim()) {
      setFormError('El apellido es obligatorio');
      return false;
    }
    
    if (!form.documentNumber?.trim()) {
      setFormError('El número de documento es obligatorio');
      return false;
    }
    
    if (form.documentType === 'DNI' && form.documentNumber && !/^\d{8}$/.test(form.documentNumber)) {
      setFormError('El DNI debe tener 8 dígitos');
      return false;
    }
    
    if (form.documentType === 'RUC' && form.documentNumber && !/^\d{11}$/.test(form.documentNumber)) {
      setFormError('El RUC debe tener 11 dígitos');
      return false;
    }
    
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      setFormError('El formato del email no es válido');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      if (editingId) {
        await clients.updateClient({ ...form, id: editingId } as Client);
        setSuccess('Cliente actualizado correctamente');
      } else {
        await clients.addClient(form as Omit<Client, 'id' | 'createdAt' | 'updatedAt'>);
        setSuccess('Cliente agregado correctamente');
      }
      
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error al guardar cliente:', error);
      setFormError(error.message || 'Error al guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client: Client) => {
    setForm({
      documentType: client.documentType,
      documentNumber: client.documentNumber,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      isActive: client.isActive,
    });
    setEditingId(client.id);
    document.getElementById('client-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      try {
        await clients.deleteClient(id);
        setSuccess('Cliente eliminado correctamente');
        
        if (editingId === id) {
          resetForm();
        }
        
        setTimeout(() => setSuccess(null), 3000);
      } catch (error: any) {
        console.error('Error al eliminar cliente:', error);
        setFormError(error.message || 'Error al eliminar el cliente');
      }
    }
  };

  const resetForm = () => {
    setForm({
      documentType: 'DNI',
      documentNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      isActive: true,
    });
    setEditingId(null);
    setFormError(null);
  };

  const filteredClients = clients.data.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.documentNumber.includes(searchTerm)
  );

  // Mostrar loading
  if (clients.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando clientes...</span>
      </div>
    );
  }

  // Mostrar error de carga
  if (clients.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error al cargar clientes</h3>
            <p className="text-sm text-red-700">{clients.error}</p>
            <button
              onClick={clients.refetch}
              className="mt-2 text-sm text-red-600 underline hover:text-red-800"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <User className="h-6 w-6 mr-2 text-blue-600" />
          Gestión de Clientes
        </h2>
        <div className="text-sm text-gray-500">
          Total: {clients.data.length} cliente{clients.data.length !== 1 ? 's' : ''}
        </div>
      </div>

      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{formError}</span>
          <button className="absolute top-0 right-0 p-3" onClick={() => setFormError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{success}</span>
          <button className="absolute top-0 right-0 p-3" onClick={() => setSuccess(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div id="client-form" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          {editingId ? (
            <>
              <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
              Editando Cliente
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2 text-green-600" />
              Agregar Nuevo Cliente
            </>
          )}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <FileText className="h-4 w-4 mr-1 text-gray-500" />
                Tipo de Documento *
              </label>
              <select 
                name="documentType" 
                value={form.documentType} 
                onChange={handleChange} 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">Carnet de Extranjería</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Número de Documento *
              </label>
              <input 
                name="documentNumber" 
                value={form.documentNumber} 
                onChange={handleChange} 
                placeholder="Número de documento" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <User className="h-4 w-4 mr-1 text-gray-500" />
                Nombres *
              </label>
              <input 
                name="firstName" 
                value={form.firstName} 
                onChange={handleChange} 
                placeholder="Nombres" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Apellidos *
              </label>
              <input 
                name="lastName" 
                value={form.lastName} 
                onChange={handleChange} 
                placeholder="Apellidos" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Mail className="h-4 w-4 mr-1 text-gray-500" />
                Email
              </label>
              <input 
                type="email" 
                name="email" 
                value={form.email} 
                onChange={handleChange} 
                placeholder="correo@ejemplo.com" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Phone className="h-4 w-4 mr-1 text-gray-500" />
                Teléfono
              </label>
              <input 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                placeholder="+51 999 999 999" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                Dirección
              </label>
              <input 
                name="address" 
                value={form.address} 
                onChange={handleChange} 
                placeholder="Dirección completa" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Cliente Activo</span>
              </label>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Guardando...' : (editingId ? 'Actualizar Cliente' : 'Agregar Cliente')}
            </button>
            
            {editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Cancelar Edición
              </button>
            )}
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between">
          <h3 className="text-lg font-semibold mb-2 sm:mb-0">Lista de Clientes</h3>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </div>
                        {client.address && (
                          <div className="text-xs text-gray-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {client.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {client.email && (
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-gray-500" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Phone className="h-4 w-4 mr-1 text-gray-500" />
                        {client.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {client.documentType}
                      </span>
                      <div className="mt-1">{client.documentNumber}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      client.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {client.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                        title="Editar cliente"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredClients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No se encontraron clientes que coincidan con la búsqueda' : 'No hay clientes registrados'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}