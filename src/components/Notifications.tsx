import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

export function Notifications() {
  const { state, dispatch } = useApp();
  const { alerts } = state;
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'expiration' | 'low_stock' | 'over_stock'>('all');
  const [readFilter, setReadFilter] = React.useState<'all' | 'unread' | 'read'>('all');

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false as any;
      if (readFilter === 'unread' && a.isRead) return false as any;
      if (readFilter === 'read' && !a.isRead) return false as any;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [alerts, typeFilter, readFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notificaciones</h2>
        <p className="text-gray-600">Alertas importantes del sistema</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="border rounded px-3 py-2 text-sm">
              <option value="all">Todos los tipos</option>
              <option value="expiration">Vencimiento</option>
              <option value="low_stock">Stock bajo</option>
              <option value="over_stock">Sobre stock</option>
            </select>
            <select value={readFilter} onChange={e => setReadFilter(e.target.value as any)} className="border rounded px-3 py-2 text-sm">
              <option value="all">Todos</option>
              <option value="unread">No leídos</option>
              <option value="read">Leídos</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => filtered.forEach(a => { if (!a.isRead) dispatch({ type: 'MARK_ALERT_READ', payload: a.id }); })}
              className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
            >
              Marcar página como leída
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y">
          {filtered.length === 0 && (
            <div className="p-6 text-sm text-gray-500">Sin notificaciones</div>
          )}
          {filtered.map(a => (
            <div key={a.id} className={`p-4 ${a.isRead ? 'bg-white' : 'bg-blue-50'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {a.type === 'expiration' ? 'Vencimiento de lote' : a.type === 'low_stock' ? 'Stock bajo' : a.type === 'over_stock' ? 'Sobre stock' : 'Alerta'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{a.message}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString('es-PE')}</div>
                </div>
                <div className="flex gap-2">
                  {!a.isRead && (
                    <button
                      onClick={() => dispatch({ type: 'MARK_ALERT_READ', payload: a.id })}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Marcar leído
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


