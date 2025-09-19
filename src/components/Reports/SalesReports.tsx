import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, BarChart3, TrendingDown, DollarSign, ShoppingCart, Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export function SalesReports() {
  const { products, sales } = useApp();
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7));
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const salesData = useMemo(() => {
    // Filtrar ventas por el período seleccionado
    const [selectedYear, selectedMonth] = selectedDate.split('-').map(Number);
    const filteredSales = sales.data.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const saleYear = saleDate.getFullYear();
      const saleMonth = saleDate.getMonth() + 1;
      
      if (period === 'monthly') {
        return saleYear === selectedYear && saleMonth === selectedMonth;
      } else if (period === 'quarterly') {
        const saleQuarter = Math.floor((saleMonth - 1) / 3) + 1;
        const selectedQuarter = Math.floor((selectedMonth - 1) / 3) + 1;
        return saleYear === selectedYear && saleQuarter === selectedQuarter;
      } else { // yearly
        return saleYear === selectedYear;
      }
    });

    // Most sold products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.data.find(p => p.id === item.productId);
        const name = item.name ?? item.productName ?? product?.name ?? 'Producto';
        const price = item.price ?? item.unitPrice ?? product?.salePrice ?? 0;
        const existing = productSales.get(item.productId) || { 
          name,
          quantity: 0, 
          revenue: 0 
        };
        productSales.set(item.productId, {
          name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.total ?? price * item.quantity),
        });
      });
    });

    const sortedProducts = Array.from(productSales.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity);

    // Daily sales for chart - generar días completos del mes con formato consistente
    const dailySales = new Map<string, { total: number; formattedDate: string }>();
    
    // Generar todos los días del mes seleccionado con formato YYYY-MM-DD
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const formattedDate = new Date(dateKey).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      });
      dailySales.set(dateKey, { total: 0, formattedDate });
    }

    // Llenar con datos reales
    filteredSales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const dateKey = saleDate.toISOString().slice(0, 10); // Formato YYYY-MM-DD
      if (dailySales.has(dateKey)) {
        const existing = dailySales.get(dateKey)!;
        dailySales.set(dateKey, {
          ...existing,
          total: existing.total + sale.total
        });
      }
    });

    const chartData = Array.from(dailySales.entries())
      .map(([date, data]) => ({ 
        date, 
        total: data.total,
        formattedDate: data.formattedDate
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Métodos de pago
    const paymentMethods = new Map<string, { count: number; amount: number }>();
    filteredSales.forEach(sale => {
      const method = sale.paymentMethod || 'cash';
      const existing = paymentMethods.get(method) || { count: 0, amount: 0 };
      paymentMethods.set(method, {
        count: existing.count + 1,
        amount: existing.amount + sale.total
      });
    });

    return {
      totalSales: filteredSales.length,
      totalRevenue: filteredSales.reduce((sum, sale) => sum + sale.total, 0),
      averageTicket: filteredSales.length > 0 ? filteredSales.reduce((sum, sale) => sum + sale.total, 0) / filteredSales.length : 0,
      topProducts: sortedProducts.slice(0, 5),
      leastSoldProducts: sortedProducts.slice(-5).reverse(),
      chartData,
      paymentMethods: Array.from(paymentMethods.entries()).map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount
      })),
      sales: filteredSales,
    };
  }, [sales.data, period, selectedDate, products.data]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Función para formatear el método de pago en español
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      case 'yape': return 'Yape';
      case 'plin': return 'Plin';
      default: return method;
    }
  };

  // Obtener el nombre del período seleccionado
  const getPeriodName = () => {
    const [year, month] = selectedDate.split('-').map(Number);
    if (period === 'monthly') {
      return new Date(year, month - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    } else if (period === 'quarterly') {
      const quarter = Math.floor((month - 1) / 3) + 1;
      return `T${quarter} ${year}`;
    } else {
      return year.toString();
    }
  };

  // Formatear fecha para el eje X del gráfico
  const formatXAxis = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      });
    } catch (error) {
      return dateString.slice(8); // Solo el día
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header with Period Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Reporte de Ventas</h2>
            <p className="text-sm text-gray-600">{getPeriodName()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{salesData.totalSales} ventas</p>
            <p className="text-xs text-gray-500">Total del período</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4 sm:hidden">
          <h3 className="text-base font-medium text-gray-700">Filtros</h3>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm text-blue-600"
          >
            <Filter className="h-4 w-4 mr-1" />
            {showFilters ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        
        <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {period === 'yearly' ? 'Año' : period === 'quarterly' ? 'Trimestre' : 'Mes'}
              </label>
              <input
                type={period === 'yearly' ? 'number' : 'month'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={selectedDate}
                onChange={(e) => {
                  if (period === 'yearly') {
                    setSelectedDate(`${e.target.value}-01`);
                  } else {
                    setSelectedDate(e.target.value);
                  }
                }}
                min={period === 'yearly' ? '2020' : undefined}
                max={new Date().toISOString().slice(0, period === 'yearly' ? 4 : 7)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Ventas</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{salesData.totalSales}</p>
            </div>
            <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">S/ {salesData.totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Ticket Promedio</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">S/ {salesData.averageTicket.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Productos Vendidos</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{salesData.topProducts.length + salesData.leastSoldProducts.length}</p>
            </div>
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Ventas Diarias - {getPeriodName()}</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxis}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`S/ ${value.toFixed(2)}`, 'Total']}
                  labelFormatter={(label) => {
                    try {
                      const date = new Date(label);
                      return date.toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    } catch (error) {
                      return label;
                    }
                  }}
                />
                <Bar dataKey="total" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
          {salesData.paymentMethods.length > 0 ? (
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesData.paymentMethods.map(pm => ({
                      name: formatPaymentMethod(pm.method),
                      value: pm.count,
                      amount: pm.amount
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {salesData.paymentMethods.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [
                      `${value} ventas - S/ ${props.payload.amount.toFixed(2)}`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay datos de ventas para este período</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Productos Más Vendidos
          </h3>
          <div className="space-y-3">
            {salesData.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.quantity} unidades</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-semibold text-gray-900 text-sm">S/ {product.revenue.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {salesData.topProducts.length === 0 && (
              <p className="text-center text-gray-500 py-4 text-sm">No hay productos vendidos en este período</p>
            )}
          </div>
        </div>

        {/* Least Sold Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
            Productos Menos Vendidos
          </h3>
          <div className="space-y-3">
            {salesData.leastSoldProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.quantity} unidades</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-semibold text-gray-900 text-sm">S/ {product.revenue.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {salesData.leastSoldProducts.length === 0 && (
              <p className="text-center text-gray-500 py-4 text-sm">No hay productos vendidos en este período</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales Table - Mobile Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden md:hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Detalle de Ventas - {getPeriodName()}</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {salesData.sales.map(sale => (
            <div key={sale.id} className="p-4">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900">Venta #{sale.saleNumber}</h4>
                  <p className="text-xs text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString('es-PE')} - {sale.customerName || 'Cliente general'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">S/ {sale.total.toFixed(2)}</p>
                </div>
                {expandedSale === sale.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-500 ml-2 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500 ml-2 flex-shrink-0" />
                )}
              </div>
              
              {expandedSale === sale.id && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Fecha:</span>
                    <span className="text-xs text-gray-900">
                      {new Date(sale.createdAt).toLocaleString('es-PE')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Método de pago:</span>
                    <span className="text-xs text-gray-900 capitalize">
                      {formatPaymentMethod(sale.paymentMethod)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Productos:</p>
                    <ul className="space-y-1">
                      {sale.items.map((item: any) => (
                        <li key={item.id} className="text-xs text-gray-900 flex justify-between">
                          <span className="truncate flex-1 mr-2">
                            {item.name ?? item.productName} x {item.quantity}
                          </span>
                          <span className="flex-shrink-0">
                            S/ {(item.price ?? item.unitPrice ?? 0).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
          {salesData.sales.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No hay ventas en este período</p>
            </div>
          )}
        </div>
      </div>

      {/* Sales Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detalle de Ventas - {getPeriodName()}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesData.sales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{sale.saleNumber}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{sale.customerName || 'Cliente general'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(sale.createdAt).toLocaleString('es-PE')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">S/ {sale.total.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{formatPaymentMethod(sale.paymentMethod)}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <ul className="list-disc ml-4">
                      {sale.items.map((item: any) => (
                        <li key={item.id}>
                          {item.name ?? item.productName} x {item.quantity} - S/ {(item.price ?? item.unitPrice ?? 0).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {salesData.sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay ventas en este período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}