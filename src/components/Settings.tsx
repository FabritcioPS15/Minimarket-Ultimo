import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sun, Moon, Download, Upload, RefreshCw, Trash2, Shield } from 'lucide-react';

export function Settings() {
  const { state, products, users, sales, clients, dispatch } = useApp();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as any) || 'light');
  const [locale, setLocale] = useState<string>(state.settings?.locale || 'es-PE');
  const [currency, setCurrency] = useState<string>(state.settings?.currency || 'PEN');
  const [fontScale, setFontScale] = useState<number>(state.settings?.fontScale || 1);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const localSnapshot = useMemo(() => ({
    // Solo estado local persistido por AppProvider
    kardexEntries: state.kardexEntries,
    cashSessions: state.cashSessions,
    alerts: state.alerts,
    auditEntries: state.auditEntries,
  }), [state.kardexEntries, state.cashSessions, state.alerts, state.auditEntries]);

  const downloadJson = (obj: any, filename: string) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportLocalData = () => {
    downloadJson(localSnapshot, `backup_local_${new Date().toISOString().slice(0,10)}.json`);
  };

  const exportAllSnapshots = () => {
    const snapshot = {
      local: localSnapshot,
      products: products.data,
      users: users.data,
      sales: sales.data,
      clients: clients.data,
      exportedAt: new Date().toISOString(),
    };
    downloadJson(snapshot, `backup_full_${new Date().toISOString().slice(0,10)}.json`);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { kardexEntries, cashSessions, alerts, auditEntries } = parsed.local || parsed;
      if (!parsed.local && (!kardexEntries || !cashSessions)) {
        alert('El archivo no contiene formato de respaldo local válido.');
        return;
      }
      const toStore = { kardexEntries: kardexEntries || [], cashSessions: cashSessions || [], alerts: alerts || [], auditEntries: auditEntries || [] };
      // Persistir en localStorage para que AppProvider lo cargue
      const existing = JSON.parse(localStorage.getItem('inventorySystem') || '{}');
      localStorage.setItem('inventorySystem', JSON.stringify({ ...existing, ...toStore }));
      alert('Respaldo importado. Se actualizará la vista.');
      window.location.reload();
    } catch (e: any) {
      alert('Error importando respaldo: ' + (e.message || 'desconocido'));
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clearCache = () => {
    if (!confirm('¿Limpiar caché local (sesiones, alertas, auditoría)? Esto no borra datos de la base.')) return;
    localStorage.removeItem('inventorySystem');
    alert('Caché local eliminada. Se recargará la app.');
    window.location.reload();
  };

  const saveRegional = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { locale, currency, fontScale } });
    alert('Preferencias guardadas');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
        <p className="text-gray-600">Preferencias y utilidades del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Regional */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Formato regional</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Región (locale)</label>
              <select value={locale} onChange={(e) => setLocale(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="es-PE">es-PE (Perú)</option>
                <option value="es-ES">es-ES (España)</option>
                <option value="en-US">en-US (EEUU)</option>
                <option value="pt-BR">pt-BR (Brasil)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="BRL">BRL (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño de letra</label>
              <input type="range" min={0.85} max={1.25} step={0.05} value={fontScale} onChange={e => setFontScale(Number(e.target.value))} className="w-full" />
              <div className="text-xs text-gray-500 mt-1">{Math.round(fontScale * 100)}%</div>
            </div>
            <div className="pt-2">
              <button onClick={saveRegional} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Guardar</button>
            </div>
          </div>
        </div>
        {/* Tema */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Apariencia</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Tema</p>
              <p className="text-xs text-gray-500">Elige tema claro u oscuro</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 ${theme === 'light' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                title="Tema claro"
              >
                <Sun className="h-4 w-4" /> Claro
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 ${theme === 'dark' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                title="Tema oscuro"
              >
                <Moon className="h-4 w-4" /> Oscuro
              </button>
            </div>
          </div>
        </div>

        {/* Respaldo local */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Respaldo Local</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportLocalData} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1">
              <Download className="h-4 w-4" /> Exportar local
            </button>
            <button onClick={exportAllSnapshots} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1">
              <Download className="h-4 w-4" /> Exportar todo
            </button>
            <label className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm flex items-center gap-1 cursor-pointer">
              <Upload className="h-4 w-4" /> Importar
              <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files && e.target.files[0] && handleImport(e.target.files[0])} disabled={importing} />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">Incluye: sesiones de caja almacenadas localmente, alertas y auditoría. No modifica datos en la base.</p>
        </div>

        {/* Sincronización */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Sincronización</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => products.refetch()} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" /> Productos
            </button>
            <button onClick={() => users.refetch()} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" /> Usuarios
            </button>
            <button onClick={() => sales.refetch()} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" /> Ventas
            </button>
            <button onClick={() => clients.refetch()} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" /> Clientes
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">Actualiza datos desde la base en caso de cambios recientes.</p>
        </div>

        {/* Mantenimiento */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Mantenimiento</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Limpiar caché local</p>
              <p className="text-xs text-gray-500">Elimina datos locales y reinicia la app (no borra la base).</p>
            </div>
            <button onClick={clearCache} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-1">
              <Trash2 className="h-4 w-4" /> Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700 flex items-start gap-2">
        <Shield className="h-4 w-4 mt-0.5" />
        <div>
          Estas utilidades están enfocadas a un mantenimiento básico y respaldos rápidos.
          Para respaldos completos de base de datos usa las herramientas de tu proveedor.
        </div>
      </div>
    </div>
  );
}


