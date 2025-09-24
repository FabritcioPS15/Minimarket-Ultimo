import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
} from 'lucide-react';
import { useBatchAlerts } from '../../hooks/useBatchAlerts';

export function InventoryReports() {
  const { products } = useApp();
  const batchAlerts = useBatchAlerts();

  const lowStockProducts = useMemo(() => products.data.filter(p => p.currentStock <= p.minStock && p.minStock > 0), [products.data]);
  const expiringSoonProducts = useMemo(() => products.data.filter(p => {
    if (!p.expirationDate) return false;
    const expirationDate = new Date(p.expirationDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const thirtyDaysFromNow = new Date(today); thirtyDaysFromNow.setDate(today.getDate() + 30);
    return expirationDate >= today && expirationDate <= thirtyDaysFromNow;
  }), [products.data]);

  const totalInventoryValue = products.data.reduce((sum, product) => 
    sum + (product.currentStock * product.costPrice), 0
  );

  const potentialRevenue = products.data.reduce((sum, product) => 
    sum + (product.currentStock * product.salePrice), 0
  );

  const categories = [...new Set(products.data.map(p => p.category))];
  const categoryData = categories.map(category => {
    const categoryProducts = products.data.filter(p => p.category === category);
    return {
      category,
      products: categoryProducts.length,
      stock: categoryProducts.reduce((sum, p) => sum + p.currentStock, 0),
      value: categoryProducts.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0),
    };
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor del Inventario</p>
              <p className="text-2xl font-bold text-gray-900">S/ {totalInventoryValue.toFixed(2)}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Potenciales</p>
              <p className="text-2xl font-bold text-gray-900">S/ {potentialRevenue.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-red-600">{lowStockProducts.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Por Vencer</p>
              <p className="text-2xl font-bold text-orange-600">{expiringSoonProducts.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Categoría</h3>
          <div className="space-y-3">
            {categoryData.map(category => (
              <div key={category.category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{category.category}</p>
                  <p className="text-sm text-gray-500">{category.products} productos</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{category.stock} unid.</p>
                  <p className="text-sm text-gray-500">S/ {category.value.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas de Stock</h3>
          <div className="space-y-4">
            {/* Low Stock */}
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Stock Bajo Producto ({lowStockProducts.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {lowStockProducts.slice(0, 5).map(product => (
                  <div key={product.id} className="text-sm bg-red-50 p-2 rounded">
                    <p className="font-medium text-red-900">{product.name}</p>
                    <p className="text-red-700">Stock: {product.currentStock} / Min: {product.minStock}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock by Batch */}
            {(batchAlerts as any).getLowStockAlerts && (
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Stock Bajo Lote
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {/* This will be populated after a quick fetch when component mounts */}
                  {/* For simplicity, we don't auto-fetch here to avoid extra calls; recommend linking to Dashboard detailed view. */}
                  <p className="text-xs text-gray-500">Ver detalle en Dashboard (lotes por vencer / stock bajo por lote)</p>
                </div>
              </div>
            )}

            {/* Expiring Soon */}
            {expiringSoonProducts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-orange-600 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Por Vencer ({expiringSoonProducts.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {expiringSoonProducts.slice(0, 5).map(product => (
                    <div key={product.id} className="text-sm bg-orange-50 p-2 rounded">
                      <p className="font-medium text-orange-900">{product.name}</p>
                      <p className="text-orange-700">
                        Vence: {new Date(product.expirationDate!).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}