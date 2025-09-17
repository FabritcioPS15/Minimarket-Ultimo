import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { ProductForm } from './ProductForm';
import { BarcodeScanner } from './BarcodeScanner';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Scan,
  Filter,
  Eye,
  X,
  Clock,
  MoreVertical,
  Grid,
  List
} from 'lucide-react';

export function ProductList() {
  const { state, products } = useApp();
  const { currentUser } = state;
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'normal' | 'high'>('all');
  const [expirationFilter, setExpirationFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showExpiringAlert, setShowExpiringAlert] = useState(true);
  const [showExpiredAlert, setShowExpiredAlert] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Extraer categorías únicas de los productos
  useEffect(() => {
    if (products.data.length > 0) {
      const uniqueCategories = [...new Set(products.data.map(p => p.category))].sort();
      setCategories(uniqueCategories);
    }
  }, [products.data]);

  // Función para determinar si un producto está por vencer (en los próximos 30 días)
  const isExpiringSoon = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return expDate > today && expDate <= thirtyDaysFromNow;
  };

  // Función para determinar si un producto ya está vencido
  const isExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignorar la hora, solo comparar fechas
    return expDate < today;
  };

  const filteredProducts = products.data.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = product.currentStock <= product.minStock;
    } else if (stockFilter === 'normal') {
      matchesStock = product.currentStock > product.minStock && product.currentStock < product.maxStock;
    } else if (stockFilter === 'high') {
      matchesStock = product.currentStock >= product.maxStock;
    }

    let matchesExpiration = true;
    if (expirationFilter === 'expiring') {
      matchesExpiration = isExpiringSoon(product.expirationDate);
    } else if (expirationFilter === 'expired') {
      matchesExpiration = isExpired(product.expirationDate);
    }

    return matchesSearch && matchesCategory && matchesStock && matchesExpiration;
  });

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        await products.deleteProduct(productId);
      } catch (error) {
        alert('Error al eliminar el producto');
      }
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock <= product.minStock) return 'low';
    if (product.currentStock >= product.maxStock) return 'high';
    return 'normal';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  // Obtener el estado de vencimiento para mostrar el color correspondiente
  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return 'none';
    if (isExpired(expirationDate)) return 'expired';
    if (isExpiringSoon(expirationDate)) return 'expiring';
    return 'valid';
  };

  // Obtener el color según el estado de vencimiento
  const getExpirationColor = (status: string) => {
    switch (status) {
      case 'expired': return 'text-red-600 bg-red-50';
      case 'expiring': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setStockFilter('all');
    setExpirationFilter('all');
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm !== '' || categoryFilter !== '' || 
                          stockFilter !== 'all' || expirationFilter !== 'all';

  // Contar productos por vencer y vencidos
  const expiringProductsCount = products.data.filter(p => isExpiringSoon(p.expirationDate)).length;
  const expiredProductsCount = products.data.filter(p => isExpired(p.expirationDate)).length;

  if (showForm) {
    return (
      <ProductForm
        product={editProduct}
        onClose={() => {
          setShowForm(false);
          setEditProduct(null);
        }}
      />
    );
  }

  if (showScanner) {
    return (
      <BarcodeScanner
        onClose={() => setShowScanner(false)}
        onProductFound={(product) => {
          setEditProduct(product);
          setShowScanner(false);
          setShowForm(true);
        }}
      />
    );
  }

  const canEditProducts = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';

  // Mostrar loading
  if (products.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando productos...</span>
      </div>
    );
  }

  // Mostrar error
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Productos</h2>
          <p className="text-gray-600">Administra tu inventario de productos</p>
        </div>
        {canEditProducts && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto justify-center"
            >
              <Scan className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Escanear</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Agregar</span>
            </button>
          </div>
        )}
      </div>

      {/* Alertas de productos por vencer y vencidos */}
      {(expiringProductsCount > 0 && showExpiringAlert) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 relative">
          <button
            onClick={() => setShowExpiringAlert(false)}
            className="absolute top-3 right-3 text-orange-600 hover:text-orange-800"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-orange-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Productos por vencer</h3>
              <p className="text-sm text-orange-700">
                {expiringProductsCount} producto(s) vencerán en los próximos 30 días
              </p>
              <button
                onClick={() => setExpirationFilter('expiring')}
                className="mt-2 text-sm text-orange-600 underline hover:text-orange-800"
              >
                Ver productos por vencer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {(expiredProductsCount > 0 && showExpiredAlert) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 relative">
          <button
            onClick={() => setShowExpiredAlert(false)}
            className="absolute top-3 right-3 text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Productos vencidos</h3>
              <p className="text-sm text-red-700">
                {expiredProductsCount} producto(s) ya han vencido
              </p>
              <button
                onClick={() => setExpirationFilter('expired')}
                className="mt-2 text-sm text-red-600 underline hover:text-red-800"
              >
                Ver productos vencidos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg text-gray-700 w-full sm:w-auto justify-center"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                Activos
              </span>
            )}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="p-2 text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters - Mobile */}
      {showMobileFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:hidden">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <select
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
              >
                <option value="all">Todo el stock</option>
                <option value="low">Stock bajo</option>
                <option value="normal">Stock normal</option>
                <option value="high">Sobre stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
              <select
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={expirationFilter}
                onChange={(e) => setExpirationFilter(e.target.value as any)}
              >
                <option value="all">Todos los estados</option>
                <option value="expiring">Por vencer</option>
                <option value="expired">Vencidos</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Filters - Desktop */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hidden sm:block">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <select
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
            >
              <option value="all">Todo el stock</option>
              <option value="low">Stock bajo</option>
              <option value="normal">Stock normal</option>
              <option value="high">Sobre stock</option>
            </select>
          </div>

          {/* Expiration Filter */}
          <div>
            <select
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={expirationFilter}
              onChange={(e) => setExpirationFilter(e.target.value as any)}
            >
              <option value="all">Todos los estados</option>
              <option value="expiring">Por vencer</option>
              <option value="expired">Vencidos</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <span>{filteredProducts.length} productos</span>
            </div>
            {hasActiveFilters && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Filtrado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => {
              const stockStatus = getStockStatus(product);
              const expirationStatus = getExpirationStatus(product.expirationDate);
              const isProductExpired = isExpired(product.expirationDate);
              const isProductExpiringSoon = isExpiringSoon(product.expirationDate);
              
              return (
                <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  {/* Product Image */}
                  <div className="flex justify-center mb-4">
                    {product.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="h-32 w-32 rounded-md object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="h-32 w-32 bg-gray-100 rounded-md flex items-center justify-center hidden">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 w-32 bg-gray-100 rounded-md flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 text-lg truncate">{product.name}</h3>
                    <p className="text-gray-500 text-sm">{product.brand}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-mono">{product.code}</span>
                      <span className="text-sm text-gray-600">{product.category}</span>
                    </div>

                    {/* Stock Info */}
                    <div className="flex justify-between items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockColor(stockStatus)}`}>
                        Stock: {product.currentStock}
                      </span>
                      {stockStatus === 'low' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Costo</p>
                        <p className="text-sm font-medium">S/ {product.costPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Venta</p>
                        <p className="text-sm font-medium">S/ {product.salePrice.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Profit */}
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-green-800 text-center">
                        Ganancia: {product.profitPercentage.toFixed(1)}% (S/ {(product.salePrice - product.costPrice).toFixed(2)})
                      </p>
                    </div>

                    {/* Expiration */}
                    {product.expirationDate && (
                      <div className={`rounded-lg p-2 ${getExpirationColor(expirationStatus)}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">
                            {new Date(product.expirationDate).toLocaleDateString('es-ES')}
                          </span>
                          {isProductExpired && (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          {isProductExpiringSoon && !isProductExpired && (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <p className="text-xs mt-1">
                          {isProductExpired ? 'Vencido' : isProductExpiringSoon ? 'Por vencer' : 'Válido'}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {canEditProducts && (
                      <div className="flex justify-between pt-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron productos</p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Limpiar filtros
                </button>
              ) : (
                canEditProducts && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Agregar primer producto
                  </button>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Products List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Precios
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    Ganancia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Vencimiento
                  </th>
                  {canEditProducts && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => {
                    const stockStatus = getStockStatus(product);
                    const expirationStatus = getExpirationStatus(product.expirationDate);
                    const isProductExpired = isExpired(product.expirationDate);
                    const isProductExpiringSoon = isExpiringSoon(product.expirationDate);
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.imageUrl ? (
                              <div className="relative">
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name}
                                  className="h-10 w-10 rounded-md object-cover mr-3"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <Package className="h-8 w-8 text-gray-400 mr-3 hidden" />
                              </div>
                            ) : (
                              <Package className="h-8 w-8 text-gray-400 mr-3" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.brand}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className="text-sm text-gray-900 font-mono">{product.code}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="text-sm text-gray-900">{product.category}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockColor(stockStatus)}`}>
                              {product.currentStock}
                            </span>
                            {stockStatus === 'low' && (
                              <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-sm text-gray-900">
                            Costo: S/ {product.costPrice.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Venta: S/ {product.salePrice.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden xl:table-cell">
                          <div className="text-sm font-medium text-green-600">
                            {product.profitPercentage.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            S/ {(product.salePrice - product.costPrice).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                          {product.expirationDate ? (
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${getExpirationColor(expirationStatus).split(' ')[0]}`}>
                                {new Date(product.expirationDate).toLocaleDateString('es-ES')}
                              </span>
                              <div className="flex items-center mt-1">
                                {isProductExpired && (
                                  <>
                                    <AlertTriangle className="h-3 w-3 text-red-500 mr-1" />
                                    <span className="text-xs text-red-600">Vencido</span>
                                  </>
                                )}
                                {isProductExpiringSoon && !isProductExpired && (
                                  <>
                                    <Clock className="h-3 w-3 text-orange-500 mr-1" />
                                    <span className="text-xs text-orange-600">Por vencer</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Sin fecha</span>
                          )}
                        </td>
                        {canEditProducts && (
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                                title="Editar producto"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                                title="Eliminar producto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={canEditProducts ? 8 : 7} className="px-6 py-12 text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No se encontraron productos</p>
                      {hasActiveFilters ? (
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Limpiar filtros
                        </button>
                      ) : (
                        canEditProducts && (
                          <button
                            onClick={() => setShowForm(true)}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Agregar primer producto
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de vista previa de imagen */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Vista previa</h3>
              <button
                onClick={() => setImagePreview(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <img 
                src={imagePreview} 
                alt="Vista previa" 
                className="max-h-64 max-w-full object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xOCAxNUwxMiA5TDYgMTUiIHN0cm9rZT0iIzlDQTBCMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}