import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Mail, Phone, MapPin, FileText, Edit2, Trash2, Plus, Search, X, Save, ArrowLeft } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  documentType?: string;
  documentNumber?: string;
}

function ClientsPage() {
  const { state, clients } = useApp();
  const [form, setForm] = useState<Client>({ 
    id: '', 
    name: '', 
    email: '', 
    phone: '',
    address: '',
    documentType: 'DNI',
    documentNumber: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar clientes desde la base de datos
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const allClients = await clients.getAllClients();
        setClientsList(allClients);
        setError(null);
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        setError('Error al cargar los clientes. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    loadClients();
  }, [clients]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return false;
    }
    
    if (!form.email.trim()) {
      setError('El email es obligatorio');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError('El formato del email no es válido');
      return false;
    }
    
    if (!form.phone.trim()) {
      setError('El teléfono es obligatorio');
      return false;
    }
    
    if (form.documentNumber && form.documentType === 'DNI' && !/^\d{8}$/.test(form.documentNumber)) {
      setError('El DNI debe tener 8 dígitos');
      return false;
    }
    
    if (form.documentNumber && form.documentType === 'RUC' && !/^\d{11}$/.test(form.documentNumber)) {
      setError('El RUC debe tener 11 dígitos');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (editingId) {
        await clients.updateClient(form);
        setClientsList(clientsList.map(c => c.id === editingId ? form : c));
        setSuccess('Cliente actualizado correctamente');
      } else {
        const newClient = await clients.addClient(form);
        setClientsList([...clientsList, newClient]);
        setSuccess('Cliente agregado correctamente');
      }
      
      setForm({ id: '', name: '', email: '', phone: '', address: '', documentType: 'DNI', documentNumber: '' });
      setEditingId(null);
      setError(null);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setError('Error al guardar el cliente: ' + error.message);
    }
  };

  const handleEdit = (client: Client) => {
    setForm(client);
    setEditingId(client.id);
    document.getElementById('client-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      try {
        await clients.deleteClient(id);
        setClientsList(clientsList.filter(c => c.id !== id));
        setSuccess('Cliente eliminado correctamente');
        
        if (editingId === id) {
          setForm({ id: '', name: '', email: '', phone: '', address: '', documentType: 'DNI', documentNumber: '' });
          setEditingId(null);
        }
        
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        setError('Error al eliminar el cliente: ' + error.message);
      }
    }
  };

  const cancelEdit = () => {
    setForm({ id: '', name: '', email: '', phone: '', address: '', documentType: 'DNI', documentNumber: '' });
    setEditingId(null);
    setError(null);
  };

  const filteredClients = clientsList.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.documentNumber && client.documentNumber.includes(searchTerm))
  );

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <User className="h-6 w-6 mr-2 text-blue-600" />
          Gestión de Clientes
        </h2>
        <div className="text-sm text-gray-500">
          Total: {clientsList.length} cliente{clientsList.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button className="absolute top-0 right-0 p-3" onClick={() => setError(null)}>
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
                <User className="h-4 w-4 mr-1 text-gray-500" />
                Nombre *
              </label>
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="Nombre completo" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Mail className="h-4 w-4 mr-1 text-gray-500" />
                Email *
              </label>
              <input 
                type="email" 
                name="email" 
                value={form.email} 
                onChange={handleChange} 
                placeholder="correo@ejemplo.com" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Phone className="h-4 w-4 mr-1 text-gray-500" />
                Teléfono *
              </label>
              <input 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                placeholder="+51 999 999 999" 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <FileText className="h-4 w-4 mr-1 text-gray-500" />
                Tipo de Documento
              </label>
              <select 
                name="documentType" 
                value={form.documentType} 
                onChange={handleChange} 
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">Carnet de Extranjería</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Número de Documento
              </label>
              <input 
                name="documentNumber" 
                value={form.documentNumber} 
                onChange={handleChange} 
                placeholder="Número de documento" 
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
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4 mr-1" />
              {editingId ? 'Actualizar Cliente' : 'Agregar Cliente'}
            </button>
            
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit}
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
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500">Cargando clientes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
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
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
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
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-gray-500" />
                        {client.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Phone className="h-4 w-4 mr-1 text-gray-500" />
                        {client.phone}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {client.documentType && client.documentNumber ? (
                        <div className="text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {client.documentType}
                          </span>
                          <div className="mt-1">{client.documentNumber}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Sin documento</span>
                      )}
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
        )}
      </div>
    </div>
  );
}

// Exportación correcta
export { ClientsPage };