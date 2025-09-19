import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, Percent, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

export function ProfitAnalysis() {
  const { products, sales } = useApp();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(6); // meses a mostrar

  const profitData = useMemo(() => {
    // Filtrar ventas por rango de tiempo (últimos X meses)
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - timeRange);
    startDate.setDate(1); // Empezar desde el primer día del mes
    startDate.setHours(0, 0, 0, 0);
    
    const filteredSales = sales.data.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startDate && saleDate <= now;
    });

    // Calculate profit by product
    const productProfits = new Map<string, { 
      name: string; 
      totalProfit: number; 
      unitsSold: number; 
      avgProfit: number;
      profitMargin: number;
      costPrice: number;
      salePrice: number;
    }>();

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.data.find(p => p.id === item.productId);
        if (product) {
          const price = item.price ?? item.unitPrice ?? product.salePrice ?? 0;
          const name = item.name ?? item.productName ?? product.name ?? 'Producto';
          const profit = (price - product.costPrice) * item.quantity;
          const existing = productProfits.get(item.productId) || {
            name,
            totalProfit: 0,
            unitsSold: 0,
            avgProfit: 0,
            profitMargin: 0,
            costPrice: product.costPrice,
            salePrice: product.salePrice,
          };
          
          productProfits.set(item.productId, {
            ...existing,
            totalProfit: existing.totalProfit + profit,
            unitsSold: existing.unitsSold + item.quantity,
            avgProfit: existing.unitsSold + item.quantity > 0 
              ? (existing.totalProfit + profit) / (existing.unitsSold + item.quantity)
              : 0,
            profitMargin: product.salePrice > 0 
              ? ((product.salePrice - product.costPrice) / product.salePrice) * 100
              : 0,
          });
        }
      });
    });

    // Get profit over time - generar períodos completos incluso sin ventas
    const profitByPeriod = new Map<string, number>();
    
    // Generar todos los períodos en el rango seleccionado
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      let key = '';
      
      switch (period) {
        case 'weekly':
          const weekStart = new Date(currentDate);
          weekStart.setDate(currentDate.getDate() - currentDate.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'monthly':
          key = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'quarterly':
          const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
          key = `${currentDate.getFullYear()}-Q${quarter}`;
          break;
      }
      
      profitByPeriod.set(key, 0); // Inicializar con 0
      
      // Avanzar al siguiente período
      switch (period) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
      }
    }

    // Calcular ganancias por período
    filteredSales.forEach(sale => {
      const date = new Date(sale.createdAt);
      let key = '';
      
      switch (period) {
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
      }

      const saleProfit = sale.items.reduce((sum, item) => {
        const product = products.data.find(p => p.id === item.productId);
        return sum + (product ? ((item.price ?? item.unitPrice ?? product.salePrice ?? 0) - product.costPrice) * item.quantity : 0);
      }, 0);

      if (profitByPeriod.has(key)) {
        profitByPeriod.set(key, profitByPeriod.get(key)! + saleProfit);
      }
    });

    const sortedProducts = Array.from(productProfits.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalProfit - a.totalProfit);

    const totalProfit = Array.from(productProfits.values())
      .reduce((sum, p) => sum + p.totalProfit, 0);

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCost = filteredSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => {
        const product = products.data.find(p => p.id === item.productId);
        return itemSum + (product ? product.costPrice * item.quantity : 0);
      }, 0), 0
    );

    // Convertir el Map a array y ordenar
    const chartData = Array.from(profitByPeriod.entries())
      .map(([period, profit]) => ({ period, profit }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      totalProfit,
      totalRevenue,
      totalCost,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      topProducts: sortedProducts.slice(0, 10),
      leastProfitableProducts: sortedProducts.slice(-5).reverse(),
      chartData,
    };
  }, [sales.data, products.data, period, timeRange]);

  // Función para obtener el color según el margen de ganancia
  const getProfitMarginColor = (margin: number) => {
    if (margin > 30) return '#10B981'; // Verde
    if (margin > 15) return '#F59E0B'; // Amarillo
    return '#EF4444'; // Rojo
  };

  // Formatear etiquetas del eje X según el período
  const formatXAxis = (value: string) => {
    if (period === 'monthly') {
      const [year, month] = value.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('es-ES', { month: 'short' });
    } else if (period === 'quarterly') {
      return value;
    } else {
      return value.slice(5); // Mostrar solo mes-día para semanas
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <label className="block text-sm font-medium text-gray-700">
            Período de Análisis
          </label>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
          </select>
          
          <label className="block text-sm font-medium text-gray-700 mt-3 sm:mt-0">
            Rango de Tiempo
          </label>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
          >
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </select>
        </div>
      </div>

      {/* Profit KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Ganancia Total</p>
              <p className="text-lg sm:text-xl font-bold text-green-600">S/ {profitData.totalProfit.toFixed(2)}</p>
            </div>
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Margen de Ganancia</p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">{profitData.profitMargin.toFixed(1)}%</p>
            </div>
            <Percent className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-lg sm:text-xl font-bold text-purple-600">S/ {profitData.totalRevenue.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Costos Totales</p>
              <p className="text-lg sm:text-xl font-bold text-red-600">S/ {profitData.totalCost.toFixed(2)}</p>
            </div>
            <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Profit Over Time Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Evolución de Ganancias</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profitData.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={formatXAxis}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`S/ ${value.toFixed(2)}`, 'Ganancia']}
                labelFormatter={(label) => {
                  if (period === 'monthly') {
                    const [year, month] = label.split('-');
                    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                  }
                  return label;
                }}
              />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Profitable Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Productos Más Rentables</h3>
          <div className="space-y-3">
            {profitData.topProducts.map((product, index) => (
              <div key={product.id} className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.unitsSold} unidades vendidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">S/ {product.totalProfit.toFixed(2)}</p>
                    <p className="text-xs text-green-500">{product.profitMargin.toFixed(1)}% margen</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Costo: S/ {product.costPrice.toFixed(2)} | Venta: S/ {product.salePrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Least Profitable Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Productos Menos Rentables</h3>
          <div className="space-y-3">
            {profitData.leastProfitableProducts.map((product, index) => (
              <div key={product.id} className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.unitsSold} unidades vendidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">S/ {product.totalProfit.toFixed(2)}</p>
                    <p className="text-xs text-red-500">{product.profitMargin.toFixed(1)}% margen</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Costo: S/ {product.costPrice.toFixed(2)} | Venta: S/ {product.salePrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profit Analysis Table - Mobile Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden md:hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Análisis Detallado por Producto</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {profitData.topProducts.slice(0, 15).map(product => (
            <div key={product.id} className="p-4">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{product.name}</h4>
                  <p className="text-xs text-gray-500">{product.unitsSold} unidades</p>
                </div>
                {expandedProduct === product.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-500 ml-2 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500 ml-2 flex-shrink-0" />
                )}
              </div>
              
              {expandedProduct === product.id && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Ganancia Total:</span>
                    <span className="text-xs font-semibold text-green-600">
                      S/ {product.totalProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Ganancia por Unidad:</span>
                    <span className="text-xs text-gray-900">
                      S/ {product.avgProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Margen:</span>
                    <span 
                      className="text-xs font-medium"
                      style={{ color: getProfitMarginColor(product.profitMargin) }}
                    >
                      {product.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">ROI:</span>
                    <span className="text-xs font-medium text-blue-600">
                      {product.costPrice > 0 ? ((product.salePrice - product.costPrice) / product.costPrice * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Costo:</span>
                    <span className="text-xs text-gray-900">
                      S/ {product.costPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Precio Venta:</span>
                    <span className="text-xs text-gray-900">
                      S/ {product.salePrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Mostrar productos sin ventas */}
          {products.data.filter(p => !profitData.topProducts.some(tp => tp.id === p.id)).map(p => (
            <div key={p.id} className="p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-400 truncate">{p.name}</h4>
                  <p className="text-xs text-gray-400">0 unidades</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Sin ventas</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profit Analysis Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Análisis Detallado por Producto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidades Vendidas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ganancia Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ganancia por Unidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margen %
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profitData.topProducts.slice(0, 15).map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.unitsSold}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600">
                      S/ {product.totalProfit.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    S/ {product.avgProfit.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium" style={{ color: getProfitMarginColor(product.profitMargin) }}>
                      {product.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600">
                      {product.costPrice > 0 ? ((product.salePrice - product.costPrice) / product.costPrice * 100).toFixed(1) : 0}%
                    </span>
                  </td>
                </tr>
              ))}
              {/* Mostrar productos sin ventas */}
              {products.data.filter(p => !profitData.topProducts.some(tp => tp.id === p.id)).map(p => (
                <tr key={p.id} className="hover:bg-gray-50 bg-gray-100">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-400">{p.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">0</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">S/ 0.00</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">S/ 0.00</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">0%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">0%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}