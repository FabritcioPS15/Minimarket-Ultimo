import React, { useState, useMemo, useEffect } from 'react';
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
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, BarChart3, TrendingDown, DollarSign, ShoppingCart, Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export function SalesReports() {
  const { products, sales } = useApp();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [weekBase, setWeekBase] = useState<Date>(new Date());
  // Usar mes local por defecto (evita desfases por UTC)
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState(defaultMonth);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update as any);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update as any);
    };
  }, []);

  

  // Ventas filtradas según período (memoizado y reutilizable)
  const filteredSales = useMemo(() => {
    const [selectedYear, selectedMonth] = selectedDate.split('-').map(Number);
    if (period === 'weekly') {
      const base = new Date(weekBase);
      const dayOfWeek = base.getUTCDay();
      const weekStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - dayOfWeek));
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);
      return sales.data.filter(sale => {
        const d = new Date(sale.createdAt);
        return d >= weekStart && d <= weekEnd;
      });
    }
    return sales.data.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const saleYear = saleDate.getFullYear();
      const saleMonth = saleDate.getMonth() + 1;
      if (period === 'monthly') {
        return saleYear === selectedYear && saleMonth === selectedMonth;
      }
      if (period === 'quarterly') {
        const saleQuarter = Math.floor((saleMonth - 1) / 3) + 1;
        const selectedQuarter = Math.floor((selectedMonth - 1) / 3) + 1;
        return saleYear === selectedYear && saleQuarter === selectedQuarter;
      }
      // yearly
      return saleYear === selectedYear;
    });
  }, [sales.data, period, selectedDate, weekBase]);

  const salesData = useMemo(() => {
    const toUTCKey = (d: Date) => `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2,'0')}-${d.getUTCDate().toString().padStart(2,'0')}`;

    // Most sold products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.data.find(p => p.id === item.productId);
        const name = item.productName ?? product?.name ?? 'Producto';
        const price = item.unitPrice ?? product?.salePrice ?? 0;
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
    
    // Generar ejes según período
    if (period === 'weekly') {
      // Semana basada en weekBase (en UTC para alinear claves con UTC)
      const base = new Date(weekBase);
      const dayOfWeek = base.getUTCDay(); // 0 domingo
      const weekStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
      weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek);
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setUTCDate(weekStart.getUTCDate() + i);
        const key = toUTCKey(d);
        const display = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
          .toLocaleDateString('es-ES', { weekday: 'short' });
        dailySales.set(key, { total: 0, formattedDate: display });
      }
    } else {
      // Mensual por defecto
      const [selectedYear, selectedMonth] = selectedDate.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const utcDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, day));
        const dateKey = toUTCKey(utcDate);
        const formattedDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, day))
          .toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        dailySales.set(dateKey, { total: 0, formattedDate });
      }
    }

    // Llenar con datos reales
    filteredSales.forEach(sale => {
      const rawISO = typeof sale.createdAt === 'string' ? sale.createdAt : new Date(sale.createdAt).toISOString();
      const rawDate = rawISO.slice(0,10); // YYYY-MM-DD (UTC)
      // Ajuste +1 día para visualización y evitar que aparezca en el día anterior por desfases
      const [yy, mm, dd] = rawDate.split('-').map(Number);
      const shifted = new Date(Date.UTC(yy, (mm || 1) - 1, (dd || 1) + 1));
      const dateKey = shifted.toISOString().slice(0,10);
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
      today: (() => {
        const todayKey = new Date().toISOString().slice(0,10); // UTC hoy
        const todaySales = filteredSales.filter(s => (typeof s.createdAt === 'string' ? s.createdAt.slice(0,10) : new Date(s.createdAt).toISOString().slice(0,10)) === todayKey);
        return {
          count: todaySales.length,
          amount: todaySales.reduce((sum, s) => sum + s.total, 0),
        };
      })(),
    };
  }, [filteredSales, products.data]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Formatear método de pago (restaurado en la ubicación superior para uso global)
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

  // Dataset de métodos de pago (comportamiento original basado en salesData)
  const paymentMethodsFast = useMemo(() => {
    return salesData.paymentMethods.map(pm => ({
      method: pm.method,
      name: formatPaymentMethod(pm.method),
      value: pm.count,
      amount: pm.amount,
    }));
  }, [salesData.paymentMethods]);

  

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
      const [y, m, d] = dateString.split('-').map(Number);
      const date = new Date(y, (m || 1) - 1, d || 1);
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch (error) {
      return dateString.slice(8);
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
                <option value="weekly">Semanal</option>
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

            {period === 'weekly' && (
              <div className="flex items-end gap-2">
                <div className="text-sm text-gray-600">
                  Semana: {(() => {
                    const start = new Date(weekBase); start.setDate(weekBase.getDate() - start.getDay());
                    const end = new Date(start); end.setDate(start.getDate() + 6);
                    return `${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`;
                  })()}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setWeekBase(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })}
                    className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
                  >
                    Semana -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekBase(new Date())}
                    className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
                  >
                    Esta semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekBase(prev => { const d = new Date(prev); const today=new Date(); const next=new Date(prev); next.setDate(prev.getDate()+7); return next>today? today: next; })}
                    className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
                  >
                    Semana +1
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Hoy</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{salesData.today.count} ventas</p>
              <p className="text-xs text-gray-500">S/ {salesData.today.amount.toFixed(2)}</p>
            </div>
            <div className="bg-teal-50 p-2 sm:p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Ventas Diarias - {getPeriodName()}</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData.chartData} barCategoryGap={4} barGap={0}>
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
                <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive={false}>
                  {
                    salesData.chartData.map((entry: any) => {
                      // también shift +1 para que el resaltado coincida con el ajuste visual
                      const now = new Date();
                      const todayShifted = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
                      const todayKeyUTC = todayShifted.toISOString().slice(0,10);
                      const isToday = entry.date === todayKeyUTC;
                      return <Cell key={`c-${entry.date}`} fill={isToday ? '#10B981' : '#3B82F6'} />
                    })
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

{/* Payment Methods */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
    Métodos de Pago
  </h3>
  {paymentMethodsFast.length > 0 ? (
    <div className="h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
          <PieChart>
          <Pie
            data={paymentMethodsFast}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 40 : 60}
            outerRadius={isMobile ? 80 : 120}
            dataKey="value"
            labelLine={false}
            label={isMobile ? false : (({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`)}
            isAnimationActive={!isMobile}
            animationBegin={0}
            animationDuration={400}
            animationEasing="ease-out"
          >
            {paymentMethodsFast.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>

          <Tooltip
            formatter={(value: any, name: any, props: any) => [
              `${value} ventas - S/ ${props.payload.amount.toFixed(2)}`,
              name,
            ]}
            contentStyle={{ fontSize: 12 }}
          />

          <Legend 
            layout={isMobile ? 'horizontal' : 'horizontal'}
            verticalAlign={isMobile ? 'bottom' : 'bottom'}
            height={isMobile ? 48 : 36}
            wrapperStyle={{ fontSize: isMobile ? '11px' : '12px', paddingTop: isMobile ? 8 : 0, lineHeight: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}
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