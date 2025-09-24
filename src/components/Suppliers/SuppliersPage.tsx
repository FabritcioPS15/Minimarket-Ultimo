// components/Suppliers/SuppliersPage.tsx
import React, { useState } from 'react';
import { useSuppliers, Supplier } from '../../hooks/useSuppliers';
import { Plus, Edit, Trash2, RefreshCw, X, Check, Building, Phone, Mail, MapPin, FileText } from 'lucide-react';

export function SuppliersPage() {
  const { suppliers, loading, error, refetch, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    documentType: 'RUC' as 'RUC' | 'DNI' | 'CE',
    documentNumber: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    isActive: true,
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', documentType: 'RUC', documentNumber: '', email: '', phone: '', address: '', notes: '', isActive: true });
    setShowForm(false);
  };

  const startEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      documentType: s.documentType,
      documentNumber: s.documentNumber || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      notes: s.notes || '',
      isActive: s.isActive,
    });
    setShowForm(true);
  };

  const submit = async () => {
    try {
      if (!form.name.trim()) { alert('Nombre es requerido'); return; }
      if (editing) {
        await updateSupplier({
          id: editing.id,
          name: form.name.trim(),
          documentType: form.documentType,
          documentNumber: form.documentNumber || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
          isActive: form.isActive,
          createdAt: editing.createdAt,
          updatedAt: editing.updatedAt,
        });
      } else {
        await addSupplier({
          name: form.name.trim(),
          documentType: form.documentType,
          documentNumber: form.documentNumber || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
        });
      }
      resetForm();
    } catch (err: any) {
      alert('Error guardando proveedor: ' + (err.message || 'desconocido'));
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Proveedores</h2>
          <p className="text-gray-600">Administra tus proveedores y enlázalos a compras/lotes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded" title="Actualizar">
            <RefreshCw className="h-5 w-5" />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><span className="ml-2 text-gray-600">Cargando...</span></div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{error}</div>
      )}

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Contacto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Dirección</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      {s.notes && <div className="text-xs text-gray-500 max-w-[60ch] truncate">{s.notes}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{s.documentType} {s.documentNumber || ''}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-4 text-sm text-gray-700">
                    {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[40ch]">{s.address || '-'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(s)} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded" title="Editar"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => { if (confirm('¿Eliminar proveedor?')) deleteSupplier(s.id); }} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Sin proveedores</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={resetForm} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Documento</label>
                <select value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value as any })} className="w-full px-3 py-2 border rounded">
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">N° Documento</label>
                <input value={form.documentNumber} onChange={e => setForm({ ...form, documentNumber: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded" rows={3} />
              </div>
              <div className="md:col-span-2 flex items-center gap-2 text-sm">
                <input id="active" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                <label htmlFor="active">Activo</label>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={resetForm} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 flex items-center gap-1"><X className="h-4 w-4" /> Cancelar</button>
              <button onClick={submit} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"><Check className="h-4 w-4" /> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}