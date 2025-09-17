import { useApp } from '../context/AppContext';
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  DollarSign,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';

export function Dashboard() {
  const { state, products, sales } = useApp();
  const { alerts, currentUser, currentCashSession } = state;
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const totalProducts = products.data.length;
  const lowStockProducts = products.data.filter(p => p.currentStock <= p.minStock).length;
  const todaysSales = sales.data.filter(sale => {
    const today = new Date().toDateString();
    return new Date(sale.createdAt).toDateString() === today;
  });

  const todaysRevenue = todaysSales.reduce((total, sale) => total + sale.total, 0);

  // Generar alertas de stock bajo
  const lowStockAlerts = products.data
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

  // Generar alertas de vencimiento (30 días antes)
  const expiringSoonAlerts = products.data
    .filter(p => {
      if (!p.expirationDate) return false;
      const expirationDate = new Date(p.expirationDate);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      return expirationDate >= today && expirationDate <= thirtyDaysFromNow;
    })
    .map(p => {
      const expirationDate = new Date(p.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = expirationDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let severity: 'high' | 'medium' | 'low' = 'low';
      if (diffDays <= 7) severity = 'high';
      else if (diffDays <= 15) severity = 'medium';

      return {
        id: `expire-${p.id}`,
        productName: p.name,
        message: `Por vencer el ${expirationDate.toLocaleDateString('es-ES')} (faltan ${diffDays} días)`,
        severity,
        createdAt: p.expirationDate,
        isRead: false,
        type: 'expire'
      };
    });

  // Unir todas las alertas
  const allAlerts = [
    ...lowStockAlerts,
    ...expiringSoonAlerts,
    ...alerts
  ];

  const unreadAlerts = allAlerts.filter(alert => !alert.isRead).length;

  const recentSales = sales.data
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const dashboardCards = [
    {
      title: 'Productos Totales',
      value: totalProducts.toString(),
      icon: Package,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Ventas Hoy',
      value: todaysSales.length.toString(),
      icon: ShoppingCart,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Ingresos Hoy',
      value: `S/ ${todaysRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Productos con Stock Bajo',
      value: lowStockProducts.toString(),
      icon: AlertTriangle,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
  ];

  // Mostrar loading si los productos están cargando
  if (products.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando productos...</span>
      </div>
    );
  }

  // Mostrar error si hay problemas con los productos
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

      {/* Cash Session Alert */}
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
        {/* Recent Sales */}
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

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Alertas</h3>
            {unreadAlerts > 0 && (
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                {unreadAlerts} nuevas
              </span>
            )}
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto" id="alerts-container">
            {allAlerts.length > 0 ? (
              allAlerts
                .slice(0, showAllAlerts ? allAlerts.length : 5)
                .map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    !alert.isRead
                      ? alert.severity === 'high'
                        ? 'bg-red-50 border-red-200'
                        : alert.severity === 'medium'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start">
                    <AlertTriangle
                      className={`h-4 w-4 mt-0.5 mr-2 ${
                        alert.severity === 'high'
                          ? 'text-red-500'
                          : alert.severity === 'medium'
                            ? 'text-orange-500'
                            : 'text-yellow-500'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.productName}</p>
                      <p className="text-xs text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(alert.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No hay alertas pendientes</p>
              </div>
            )}
          </div>
          
          {/* Botón para mostrar más/menos alertas */}
          {allAlerts.length > 5 && (
            <button
              onClick={() => setShowAllAlerts(!showAllAlerts)}
              className="mt-4 w-full flex items-center justify-center text-sm text-blue-600 hover:text-blue-800"
            >
              {showAllAlerts ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Ver todas las alertas ({allAlerts.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}