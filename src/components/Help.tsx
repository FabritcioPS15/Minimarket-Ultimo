import React from 'react';
import { useApp } from '../context/AppContext';
import { HelpCircle, RefreshCw, ExternalLink, BookOpen, Keyboard, LifeBuoy, MessageSquare } from 'lucide-react';

export function Help() {
  const { state, products, users, sales, clients } = useApp();

  const go = (view: string) => {
    const evt = new CustomEvent('navigate', { detail: { view } });
    window.dispatchEvent(evt);
  };

  const refetchAll = async () => {
    try {
      await Promise.all([
        products.refetch?.(),
        users.refetch?.(),
        sales.refetch?.(),
        clients.refetch?.(),
      ]);
      alert('Datos actualizados');
    } catch (e: any) {
      alert('Error actualizando datos: ' + (e.message || 'desconocido'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <HelpCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ayuda</h2>
          <p className="text-gray-600">Guías rápidas, atajos y diagnóstico</p>
        </div>
      </div>

      {/* Guías rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => go('sales')} className="bg-white text-left rounded-lg shadow-sm border border-gray-200 p-4 hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Guía rápida</p>
              <h3 className="font-semibold text-gray-900">Realizar una venta</h3>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
          <ul className="text-sm text-gray-600 list-disc pl-4 mt-2 space-y-1">
            <li>Busca el producto y agrégalo al carrito</li>
            <li>Selecciona método de pago</li>
            <li>Procesa la venta y genera comprobante</li>
          </ul>
        </button>
        <button onClick={() => go('cash')} className="bg-white text-left rounded-lg shadow-sm border border-gray-200 p-4 hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Guía rápida</p>
              <h3 className="font-semibold text-gray-900">Abrir y cerrar caja</h3>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
          <ul className="text-sm text-gray-600 list-disc pl-4 mt-2 space-y-1">
            <li>Abrir caja (monto inicial)</li>
            <li>Vender con caja activa</li>
            <li>Cerrar caja y revisar resumen</li>
          </ul>
        </button>
        <button onClick={() => go('products')} className="bg-white text-left rounded-lg shadow-sm border border-gray-200 p-4 hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Guía rápida</p>
              <h3 className="font-semibold text-gray-900">Gestionar productos</h3>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
          <ul className="text-sm text-gray-600 list-disc pl-4 mt-2 space-y-1">
            <li>Crear, editar y eliminar productos</li>
            <li>Control de stock y lotes</li>
            <li>Códigos y precios</li>
          </ul>
        </button>
      </div>

      {/* Atajos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Atajos de teclado</h3>
          </div>
          <BookOpen className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm text-gray-700">
          <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
            <span>Abrir buscador en ventas</span>
            <span className="font-mono text-xs bg-white border px-2 py-1 rounded">/</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
            <span>Procesar venta</span>
            <span className="font-mono text-xs bg-white border px-2 py-1 rounded">Ctrl + Enter</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
            <span>Limpiar carrito</span>
            <span className="font-mono text-xs bg-white border px-2 py-1 rounded">Ctrl + L</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
            <span>Abrir caja</span>
            <span className="font-mono text-xs bg-white border px-2 py-1 rounded">Ctrl + O</span>
          </div>
        </div>
      </div>

      {/* Diagnóstico rápido */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LifeBuoy className="h-5 w-5 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Diagnóstico rápido</h3>
          </div>
          <button onClick={refetchAll} className="text-sm px-3 py-2 border rounded-lg flex items-center space-x-1 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            <span>Refrescar datos</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-xs text-gray-600">Productos</p>
            <p className="text-lg font-bold text-gray-900">{products.data?.length || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-xs text-gray-600">Usuarios</p>
            <p className="text-lg font-bold text-gray-900">{users.data?.length || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-xs text-gray-600">Ventas</p>
            <p className="text-lg font-bold text-gray-900">{sales.data?.length || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-xs text-gray-600">Clientes</p>
            <p className="text-lg font-bold text-gray-900">{clients.data?.length || 0}</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          Caja activa: <span className="font-medium">{state.currentCashSession ? 'Sí' : 'No'}</span>
        </div>
      </div>

      {/* Soporte */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start space-x-3">
        <MessageSquare className="h-5 w-5 mt-0.5" />
        <div>
          ¿Necesitas más ayuda? Puedes contactar al soporte o revisar la documentación del proyecto.
          <div className="mt-2 space-x-2">
            <button onClick={() => alert('Envíanos un mensaje con tu caso y pantallazos.')} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs">Contactar soporte</button>
            <button onClick={() => alert('Abrir documentación local/no disponible.')} className="px-3 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 text-xs">Ver documentación</button>
          </div>
        </div>
      </div>

      {/* Solución de problemas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <LifeBuoy className="h-5 w-5 text-gray-500" />
          <h3 className="text-base font-semibold text-gray-900">Solución de problemas comunes</h3>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <details className="bg-gray-50 rounded-md p-3">
            <summary className="font-medium cursor-pointer">Error al abrir caja: violación de clave foránea</summary>
            <div className="mt-2 text-sm text-gray-600">
              Verifica que el usuario que abre exista en <strong>public.users</strong> y que la FK de <strong>cash_sessions.user_id</strong> referencie <strong>public.users(id)</strong>. Si usas nuestro SQL de migración, ya queda correcto.
            </div>
          </details>
          <details className="bg-gray-50 rounded-md p-3">
            <summary className="font-medium cursor-pointer">No puedo vender: “Debe abrir una sesión de caja”</summary>
            <div className="mt-2 text-sm text-gray-600">
              Abre la caja desde el módulo Caja. Si cambiaste de usuario, la app restaura una caja activa automáticamente.
            </div>
          </details>
          <details className="bg-gray-50 rounded-md p-3">
            <summary className="font-medium cursor-pointer">Stock insuficiente o desactualizado</summary>
            <div className="mt-2 text-sm text-gray-600">
              Refresca Productos en Configuración o corrige el stock/lotes en Productos.
            </div>
          </details>
          <details className="bg-gray-50 rounded-md p-3">
            <summary className="font-medium cursor-pointer">Gráfico de métodos de pago se ve mal en móvil</summary>
            <div className="mt-2 text-sm text-gray-600">
              Ya ajustamos radios/labels en móvil. Actualiza a la última versión y limpia caché si persiste.
            </div>
          </details>
        </div>
      </div>

      {/* Contacto directo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Contacto de soporte</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a href="https://wa.me/51958077827" target="_blank" rel="noreferrer" className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">WhatsApp (+51 958 077 827)</a>
          <a href="tel:+51958077827" className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">Llamar (+51 958 077 827)</a>
          <a href="mailto:fabpsandoval@gmail.com" className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Correo fabpsandoval@gmail.com</a>
        </div>
        <p className="text-xs text-gray-500 mt-2">Incluye pantallazos y descripción del problema para agilizar la atención.</p>
      </div>
    </div>
  );
}


