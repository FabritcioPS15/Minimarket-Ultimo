import { useApp } from '../context/AppContext';
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  DollarSign,
  BarChart3,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { useBatchAlerts } from '../hooks/useBatchAlerts';

export function Dashboard() {
  const { state, products, sales } = useApp();
  const { alerts, currentUser, currentCashSession } = state;
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const batchAlerts = useBatchAlerts();

  const totalProducts = products.data?.length || 0;
  const lowStockProducts = products.data?.filter(p => p.currentStock <= p.minStock).length || 0;
  const todaysSales = sales.data?.filter(sale => {
    const today = new Date().toDateString();
    return new Date(sale.createdAt).toDateString() === today;
  }) || [];

  const todaysRevenue = todaysSales.reduce((total, sale) => total + sale.total, 0);

  // 🔹 Alertas de stock bajo
  const lowStockAlerts = (products.data || [])
    .filter(p => p.currentStock <= p.minStock)
    .map(p => ({
      id: `lowstock-${p.id}`,
      productName: p.name,
      message: `Stock bajo (${p.currentStock} unidades)`,
      severity: 'high',
      createdAt: p.updatedAt || new Date(),
      isRead: false,
      type: 'lowstock'
    }));

  // 🔹 Alertas de lotes por vencer
  const expiringBatchAlerts = (batchAlerts.expiringBatches || []).map(batch => ({
    id: `expiring-batch-${batch.productId}-${batch.batchNumber}`,
    productName: batch.productName,
    message: batch.daysUntilExpiry !== null && batch.daysUntilExpiry !== undefined
      ? `${batch.batchNumber} por vencer en ${batch.daysUntilExpiry} días (${batch.quantity} unidades)`
      : `${batch.batchNumber} próximo a vencer (${batch.quantity} unidades)`,
    severity: batch.daysUntilExpiry !== null && batch.daysUntilExpiry !== undefined && batch.daysUntilExpiry <= 7 ? 'high' : 'medium',
    createdAt: new Date(),
    isRead: false,
    type: 'expiring_batch'
  }));

  // 🔹 Alertas de lotes vencidos
  const expiredBatchAlerts = (batchAlerts.expiredBatches || []).map(batch => ({
    id: `expired-batch-${batch.productId}-${batch.batchNumber}`,
    productName: batch.productName,
    message: `${batch.batchNumber} vencido hace ${batch.daysExpired ?? 'N/A'} días (${batch.quantity} unidades)`,
    severity: 'high',
    createdAt: new Date(),
    isRead: false,
    type: 'expired_batch'
  }));

  const allAlerts = [...lowStockAlerts, ...expiringBatchAlerts, ...expiredBatchAlerts, ...alerts];
  const unreadAlerts = allAlerts.filter(alert => !alert.isRead).length;

  const recentSales = (sales.data || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const dashboardCards = [
    {
      title: 'Productos Totales',
      value: totalProducts.toString(),
      icon: Package,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Ventas Hoy',
      value: todaysSales.length.toString(),
      icon: ShoppingCart,
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Ingresos Hoy',
      value: `S/ ${todaysRevenue.toFixed(2)}`,
      icon: DollarSign,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Productos con Stock Bajo',
      value: lowStockProducts.toString(),
      icon: AlertTriangle,
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
  ];

  // 🔹 Loading productos
  if (products.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando productos...</span>
      </div>
    );
  }

  // 🔹 Error productos
  if (products.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error al cargar productos</h3>
            <p className="text-sm text-red-700">{products.error}</p>
            <button
              onClick={products.refetch}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Resumen general del sistema</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Bienvenido, {currentUser?.username}</p>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Cash Session */}
      {!currentCashSession && currentUser?.role !== 'admin' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Caja Cerrada</h3>
              <p className="text-sm text-yellow-700">Necesitas abrir una sesión de caja para realizar ventas.</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon className={`h-6 w-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas recientes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ventas Recientes</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentSales.length > 0 ? (
              recentSales.map(sale => (
                <div key={sale.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{sale.saleNumber}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sale.createdAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">S/ {sale.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 capitalize">{sale.paymentMethod}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No hay ventas registradas</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Alertas</h3>
          </div>

          {/* Switch */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => setShowAllAlerts(false)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  !showAllAlerts ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Stock Bajo ({lowStockAlerts.length})
              </button>
              <button
                onClick={() => setShowAllAlerts(true)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  showAllAlerts ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Lotes por vencer/vencidos ({expiringBatchAlerts.length + expiredBatchAlerts.length})
              </button>
            </div>
          </div>

          {/* Contenido dinámico */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {!showAllAlerts ? (
              // Stock bajo
              lowStockAlerts.length > 0 ? (
                lowStockAlerts.map(alert => (
                  <div key={alert.id} className="p-3 rounded-lg border bg-red-50 border-red-200">
                    <div className="flex items-start">
                      <AlertTriangle className="h-4 w-4 mt-0.5 mr-2 text-red-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.productName}</p>
                        <p className="text-xs text-gray-600">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay productos con stock bajo</p>
                </div>
              )
            ) : (
              // Lotes
              (expiringBatchAlerts.length > 0 || expiredBatchAlerts.length > 0) ? (
                <>
                  {expiredBatchAlerts.map(alert => (
                    <div key={alert.id} className="p-3 rounded-lg border bg-red-50 border-red-200">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 mt-0.5 mr-2 text-red-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{alert.productName}</p>
                          <p className="text-xs text-gray-600">{alert.message}</p>
                          <p className="text-xs text-red-600 mt-1 font-medium">VENCIDO</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {expiringBatchAlerts.map(alert => (
                    <div key={alert.id} className={`p-3 rounded-lg border ${
                      alert.severity === 'high'
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-start">
                        <Clock className={`h-4 w-4 mt-0.5 mr-2 ${
                          alert.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{alert.productName}</p>
                          <p className="text-xs text-gray-600">{alert.message}</p>
                          <p className="text-xs text-orange-600 mt-1 font-medium">POR VENCER</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  {!batchAlerts.functionsAvailable ? (
                    <div>
                      <p className="mb-2">Sistema de lotes no configurado</p>
                      <p className="text-xs text-gray-400">
                        Ejecuta el script SQL para habilitar las alertas de lotes
                      </p>
                    </div>
                  ) : (
                    <p>No hay lotes por vencer o vencidos</p>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
