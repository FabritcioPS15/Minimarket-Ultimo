import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Client } from '../../hooks/useClients';
import { User, Mail, Phone, MapPin, FileText, Edit2, Trash2, Plus, Search, X, Save, ArrowLeft, AlertTriangle, MoreVertical } from 'lucide-react';

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
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<string | null>(null);

  // Detectar cambio de tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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
    setMobileMenuOpen(null);
    // Scroll suave al formulario
    document.getElementById('client-form')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'nearest'
    });
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
    setMobileMenuOpen(null);
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
    setMobileMenuOpen(null);
  };

  const filteredClients = clients.data.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.documentNumber.includes(searchTerm)
  );

  // Componente para tarjeta móvil
  const MobileClientCard = ({ client }: { client: Client }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {client.firstName} {client.lastName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {client.documentType}
              </span>
              <span className="text-xs text-gray-500 truncate">{client.documentNumber}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {client.isActive ? 'Activo' : 'Inactivo'}
          </span>
          <button 
            onClick={() => setMobileMenuOpen(mobileMenuOpen === client.id ? null : client.id)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Menú de acciones móvil */}
      {mobileMenuOpen === client.id && (
        <div className="flex gap-2 border-t pt-3 mt-3">
          <button 
            onClick={() => handleEdit(client)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded text-sm font-medium"
          >
            <Edit2 className="h-3 w-3" />
            Editar
          </button>
          <button 
            onClick={() => handleDelete(client.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded text-sm font-medium"
          >
            <Trash2 className="h-3 w-3" />
            Eliminar
          </button>
        </div>
      )}

      {/* Información de contacto */}
      <div className="space-y-2 text-sm text-gray-600">
        {(client.email || client.phone) && (
          <div className="flex flex-col gap-2">
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="truncate text-xs">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-xs">{client.phone}</span>
              </div>
            )}
          </div>
        )}
        
        {client.address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs flex-1">{client.address}</span>
          </div>
        )}
      </div>
    </div>
  );

  // Mostrar loading
  if (clients.loading) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando clientes...</span>
      </div>
    );
  }

  // Mostrar error de carga
  if (clients.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-3 my-4 md:mx-auto md:my-6 max-w-7xl">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error al cargar clientes</h3>
            <p className="text-sm text-red-700 mt-1">{clients.error}</p>
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
    <div className="space-y-4 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <User className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-600 flex-shrink-0" />
            <span className="truncate">Gestión de Clientes</span>
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Total: {clients.data.length} cliente{clients.data.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {(formError || success) && (
        <div className={`px-4 py-3 rounded-lg relative ${
          formError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formError || success}</span>
            <button 
              onClick={() => formError ? setFormError(null) : setSuccess(null)}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div id="client-form" className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          {editingId ? (
            <>
              <Edit2 className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0" />
              Editando Cliente
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
              Agregar Nuevo Cliente
            </>
          )}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-500 flex-shrink-0" />
                Tipo de Documento *
              </label>
              <select 
                name="documentType" 
                value={form.documentType} 
                onChange={handleChange} 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">Carnet de Extranjería</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Número de Documento *
              </label>
              <input 
                name="documentNumber" 
                value={form.documentNumber} 
                onChange={handleChange} 
                placeholder="Número de documento" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-500 flex-shrink-0" />
                Nombres *
              </label>
              <input 
                name="firstName" 
                value={form.firstName} 
                onChange={handleChange} 
                placeholder="Nombres" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Apellidos *
              </label>
              <input 
                name="lastName" 
                value={form.lastName} 
                onChange={handleChange} 
                placeholder="Apellidos" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-500 flex-shrink-0" />
                Email
              </label>
              <input 
                type="email" 
                name="email" 
                value={form.email} 
                onChange={handleChange} 
                placeholder="correo@ejemplo.com" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-500 flex-shrink-0" />
                Teléfono
              </label>
              <input 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                placeholder="+51 999 999 999" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-500 flex-shrink-0" />
                Dirección
              </label>
              <input 
                name="address" 
                value={form.address} 
                onChange={handleChange} 
                placeholder="Dirección completa" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center text-xs sm:text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                />
                <span className="font-medium text-gray-700">Cliente Activo</span>
              </label>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <Save className="h-4 w-4 mr-2 flex-shrink-0" />
              {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Agregar Cliente')}
            </button>
            
            {editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                className="flex-1 sm:flex-none bg-gray-500 text-white px-4 py-2 rounded-md flex items-center justify-center hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
      
      {/* Lista de Clientes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Lista de Clientes</h3>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Vista Móvil - Tarjetas */}
        <div className="block md:hidden">
          <div className="p-3">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.map(client => (
                  <MobileClientCard key={client.id} client={client} />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Vista Desktop - Tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
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
                  <td className="px-4 py-4 max-w-[200px]">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {client.firstName} {client.lastName}
                        </div>
                        {client.address && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{client.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-[200px]">
                    {client.email && (
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="text-sm text-gray-500 flex items-center mt-2">
                        <Phone className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {client.documentType}
                      </span>
                      <div className="mt-1 font-mono">{client.documentNumber}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {client.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-blue-600 hover:text-blue-900 flex items-center text-sm font-medium"
                        title="Editar cliente"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:text-red-900 flex items-center text-sm font-medium"
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