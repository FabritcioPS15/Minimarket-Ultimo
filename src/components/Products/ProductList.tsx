import React, { useState, useEffect, useRef } from 'react';
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
  Grid,
  List,
  ChevronDown,
  ChevronRight,
  Layers,
  Download
} from 'lucide-react';
import { useProductBatchSummary } from '../../hooks/useProductBatchSummary';
import { useBatchAlerts } from '../../hooks/useBatchAlerts';

export function ProductList() {
  const { state, products, addAuditEntry } = useApp();
  const { currentUser } = state;
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[id]).length;
  const [enabling, setEnabling] = useState(false);
  const desktopSearchRef = useRef<HTMLInputElement | null>(null);

  // Atajo "/" para enfocar búsqueda
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const target = e.target as HTMLElement;
        const isEditable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable);
        if (!isEditable) {
          e.preventDefault();
          try { desktopSearchRef.current?.focus(); } catch {}
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Aplicar filtros desde notificaciones
  useEffect(() => {
    const handler = (e: any) => {
      const d = e?.detail || {};
      if (d.expiration) {
        setExpirationFilter(d.expiration);
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Filtro aplicado: por vencer' } }));
      }
      if (d.stock) {
        setStockFilter(d.stock);
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: d.stock === 'low' ? 'Filtro aplicado: stock bajo' : 'Filtro aplicado: sobre stock' } }));
      }
      if (d.productId) {
        // Enfocar búsqueda por producto específico si viene productId
        const prod = (products.data || []).find((p: any) => p.id === d.productId);
        if (prod) {
          setSearchTerm(prod.name);
          try { desktopSearchRef.current?.focus(); } catch {}
        }
      }
      if (d.batchNumber) {
        // Expandir lotes del producto si está en vista de detalle (grid) — toggle a grid si fuera lista
        const prod = (products.data || []).find((p: any) => p.id === d.productId);
        if (prod) {
          // Forzar grid view y expandir el producto si corresponde
          setViewMode('grid');
          setTimeout(() => {
            setExpandedBatches(prev => ({ ...prev, [prod.id!]: true }));
          }, 0);
        }
      }
    };
    window.addEventListener('products-apply-filter', handler as any);
    return () => window.removeEventListener('products-apply-filter', handler as any);
  }, []);
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
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Extraer categorías únicas de los productos
  useEffect(() => {
    if (products.data && products.data.length > 0) {
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

  // Resumen de lotes para los productos
  const productIds = (products.data || []).map(p => p.id);
  const { batchSummaries, loading: batchesLoading, refetch: refetchBatchSummaries } = useProductBatchSummary(productIds);
  const { getLowStockAlerts } = useBatchAlerts();

  // Filtrado de productos (usar fecha del lote más cercano si existe)
  const filteredProducts = (products.data || [])
    .filter(p => showArchived ? (p as any).isActive === false : (p as any).isActive !== false)
    .filter(product => {
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

    const nearest = getNearestBatchExpiration(product.id, product.expirationDate);
    let matchesExpiration = true;
    if (expirationFilter === 'expiring') {
      matchesExpiration = isExpiringSoon(nearest);
    } else if (expirationFilter === 'expired') {
      matchesExpiration = isExpired(nearest);
    }

    return matchesSearch && matchesCategory && matchesStock && matchesExpiration;
  });

  const toggleBatchExpand = (productId: string) => {
    if (!batchSummaries[productId]) {
      refetchBatchSummaries();
    }
    setExpandedBatches(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  function getNearestBatchExpiration(productId: string, fallback?: string) {
    const summary = batchSummaries[productId];
    if (!summary || !summary.batches || summary.batches.length === 0) return fallback;
    const dates = summary.batches
      .map(b => b.expirationDate)
      .filter((d): d is string => !!d)
      .map(d => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
    // Devolver string local-friendly para evitar “parpadeos” por UTC
    return dates.length > 0 ? dates[0].toISOString().split('T')[0] : fallback;
  }

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        const product = products.data.find(p => p.id === productId);
        await products.deleteProduct(productId);
        
        // Registrar en auditoría
        await addAuditEntry({
          action: 'PRODUCT_DELETE',
          entity: 'products',
          entityId: productId,
          entityName: product?.name || 'Producto',
          details: `Producto "${product?.name || 'Desconocido'}" (${product?.code || 'Sin código'}) ocultado/eliminado`,
          oldValue: product,
          metadata: {
            productCode: product?.code,
            productCategory: product?.category,
          },
        });
        
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Producto ocultado' } }));
        // Recalcular alertas de stock tras ocultar
        try {
          const alerts = await getLowStockAlerts();
          // Enviar alertas a notificaciones (bajo stock por producto)
          alerts.productAlerts.forEach((pa: any) => {
            const alert = {
              id: `${Date.now()}_${Math.random()}`,
              type: 'low_stock',
              productId: pa.productId,
              productName: pa.productName,
              message: `Stock bajo en ${pa.productName}: ${pa.currentStock}/${pa.minStock}`,
              isRead: false,
              createdAt: new Date().toISOString(),
            } as any;
            // Emitir a Layout para que el estado lo presente (simplificado: usar toast adicional)
            window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: alert.message } }));
          });
        } catch {}
      } catch (error: any) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: error?.message || 'Error al ocultar producto' } }));
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
  const expiringProductsCount = (products.data || []).filter(p => isExpiringSoon(p.expirationDate)).length;
  const expiredProductsCount = (products.data || []).filter(p => isExpired(p.expirationDate)).length;

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
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto justify-center"
            >
              <Scan className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Escanear</span>
            </button>
            {canEditProducts && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Agregar</span>
              </button>
            )}

            <button
              onClick={() => {
                const headers = ['ID','Código','Nombre','Categoría','Marca','Costo','Venta','Ganancia %','Stock','Vence'];
                const rows = (products.data || []).map(p => [
                  p.id,
                  p.code,
                  p.name,
                  p.category,
                  p.brand,
                  (p.costPrice ?? 0).toFixed(2),
                  (p.salePrice ?? 0).toFixed(2),
                  (p.profitPercentage ?? 0).toFixed(1),
                  p.currentStock,
                  p.expirationDate ? new Date(p.expirationDate).toLocaleDateString('es-PE') : ''
                ]);
                const style = `
                  <style>
                    table { border-collapse: collapse; width: 100%; font-family: Arial; }
                    th { background: #1E3A8A; color: #fff; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
                    td { padding: 8px; border: 1px solid #e2e8f0; }
                    tr:nth-child(even) td { background: #f8fafc; }
                    .num { text-align: right; }
                  </style>`;
                const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
                const tbody = rows.map(r => `<tr>${r.map((v, idx) => `<td class="${idx>=5 && idx<=8 ? 'num' : ''}">${v ?? ''}</td>`).join('')}</tr>`).join('');
                const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${style}</head><body><table>${thead}${tbody}</table></body></html>`;
                const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `productos_formato_${new Date().toISOString().slice(0,10)}.xls`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center space-x-2 bg-green-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-green-800 transition-colors w-full sm:w-auto justify-center"
              title="Exportar Excel con formato"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Exportar Excel</span>
            </button>
          </div>
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

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg w-full sm:w-auto justify-center border ${showArchived ? 'bg-gray-800 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            title={showArchived ? 'Ver activos' : 'Ver archivados'}
          >
            {showArchived ? 'Ver activos' : 'Archivados'}
          </button>

          {showArchived && (
            <>
              <button
                onClick={() => {
                  const idsOnPage = filteredProducts.map(p => p.id!).filter(Boolean);
                  const allSelected = idsOnPage.every(id => selectedIds[id]);
                  if (allSelected) {
                    // Limpiar selección visible
                    const next = { ...selectedIds };
                    idsOnPage.forEach(id => delete next[id]);
                    setSelectedIds(next);
                  } else {
                    const next = { ...selectedIds };
                    idsOnPage.forEach(id => next[id] = true);
                    setSelectedIds(next);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg w-full sm:w-auto justify-center bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                title="Seleccionar/Limpiar visibles"
              >
                {filteredProducts.every(p => selectedIds[p.id!]) && filteredProducts.length > 0 ? 'Limpiar visibles' : 'Seleccionar visibles'}
              </button>
            </>
          )}

          {showArchived && (
            <button
              onClick={async () => {
                const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
                if (ids.length === 0) {
                  alert('Selecciona al menos un producto archivado');
                  return;
                }
                if (!confirm(`¿Habilitar ${ids.length} producto(s) seleccionado(s)?`)) return;
                try {
                  setEnabling(true);
                  const reactivatedProducts = [];
                  for (const id of ids) {
                    const product = products.data.find(p => p.id === id);
                    // @ts-ignore
                    await products.activateProduct(id);
                    if (product) reactivatedProducts.push(product);
                  }
                  
                  // Registrar en auditoría
                  await addAuditEntry({
                    action: 'PRODUCT_UPDATE',
                    entity: 'products',
                    entityId: ids.join(','),
                    entityName: `${reactivatedProducts.length} productos reactivados`,
                    details: `Productos reactivados: ${reactivatedProducts.map(p => `"${p.name}" (${p.code})`).join(', ')}`,
                    newValue: reactivatedProducts,
                    metadata: {
                      reactivatedCount: reactivatedProducts.length,
                      productCodes: reactivatedProducts.map(p => p.code),
                    },
                  });
                  
                  window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Productos habilitados' } }));
                  setSelectedIds({});
                } catch (e: any) {
                  window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: e?.message || 'Error al habilitar productos' } }));
                } finally {
                  setEnabling(false);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg w-full sm:w-auto justify-center bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={selectedCount === 0 || enabling}
              title="Habilitar seleccionados"
            >
              {enabling ? 'Habilitando...' : `Habilitar seleccionados (${selectedCount})`}
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
              ref={desktopSearchRef}
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
                  {showArchived && (
                    <div className="mb-2">
                      <label className="inline-flex items-center text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={!!selectedIds[product.id!]}
                          onChange={(e) => setSelectedIds(prev => ({ ...prev, [product.id!]: e.target.checked }))}
                        />
                        Seleccionar
                      </label>
                    </div>
                  )}
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

                    {/* Expiration (nearest from batches if available) */}
                    {(() => {
                      const nearest = getNearestBatchExpiration(product.id, product.expirationDate);
                      if (!nearest) return null;
                      const status = getExpirationStatus(nearest);
                      const expired = isExpired(nearest);
                      const expSoon = isExpiringSoon(nearest);
                      return (
                        <div className={`rounded-lg p-2 ${getExpirationColor(status)}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs">
                              {new Date(nearest).toLocaleDateString('es-ES')}
                            </span>
                            {expired && (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                            {expSoon && !expired && (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <p className="text-xs mt-1">
                            {expired ? 'Vencido' : expSoon ? 'Por vencer' : 'Válido'}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Batches expand toggle */}
                    {batchSummaries[product.id]?.totalBatches > 1 && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleBatchExpand(product.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          {expandedBatches[product.id] ? (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Ocultar lotes ({batchSummaries[product.id].totalBatches})
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-3 w-3 mr-1" />
                              Ver lotes ({batchSummaries[product.id].totalBatches})
                            </>
                          )}
                        </button>
                        {expandedBatches[product.id] && (
                          <div className="mt-2 bg-gray-50 rounded p-2 max-h-40 overflow-y-auto">
                            <ul className="space-y-1">
                              {batchSummaries[product.id].batches
                                .slice()
                                .sort((a, b) => a.batchNumber.localeCompare(b.batchNumber, undefined, { numeric: true }))
                                .map(b => (
                                  <li key={b.id} className="text-xs text-gray-700 flex justify-between">
                                    <span className="font-mono">{b.batchNumber}</span>
                                    <span>Qty: {b.quantity}</span>
                                    <span>Vence: {b.expirationDate ? new Date(b.expirationDate).toLocaleDateString('es-ES') : '—'}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
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
                          title="Eliminar (las ventas conservarán el nombre del producto)"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </button>
                        <button
                          onClick={() => { setViewProduct(product); setShowViewModal(true); }}
                          className="text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center"
                          title="Ver información"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
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

      {/* Products List View - eliminado por solicitud del usuario */}
      {/* Products List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lotes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Precios</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Ganancia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Vencimiento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <React.Fragment key={product.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-start">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded-md object-cover mr-3" />
                              ) : (
                                <Package className="h-8 w-8 text-gray-400 mr-3" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                {product.description && (
                                  <div className="text-xs text-gray-600 max-w-[60ch] truncate">{product.description}</div>
                                )}
                                {product.brand && (
                                  <div className="text-xs text-gray-400">{product.brand}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell"><span className="text-sm font-mono">{product.code}</span></td>
                          <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell"><span className="text-sm">{product.category}</span></td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockColor(stockStatus)}`}>{product.currentStock}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-700 mr-2">{batchSummaries[product.id]?.totalBatches || 0}</span>
                              {(!batchesLoading && (batchSummaries[product.id]?.totalBatches || 0) > 1) && (
                                <button
                                  onClick={() => toggleBatchExpand(product.id)}
                                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                                  title={expandedBatches[product.id] ? 'Ocultar lotes' : 'Ver lotes'}
                                >
                                  {expandedBatches[product.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="text-sm text-gray-900">Costo: S/ {product.costPrice.toFixed(2)}</div>
                            <div className="text-sm text-gray-600">Venta: S/ {product.salePrice.toFixed(2)}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap hidden xl:table-cell">
                            <div className="text-sm font-medium text-green-600">{product.profitPercentage.toFixed(1)}%</div>
                            <div className="text-xs text-gray-500">S/ {(product.salePrice - product.costPrice).toFixed(2)}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                            {(() => {
                              const nearest = getNearestBatchExpiration(product.id, product.expirationDate);
                              if (!nearest) return <span className="text-gray-400 text-sm">Sin fecha</span>;
                              const status = getExpirationStatus(nearest);
                              const expired = isExpired(nearest);
                              const expSoon = isExpiringSoon(nearest);
                              return (
                                <div className="flex items-center space-x-2">
                                  <span className={`text-sm font-medium ${getExpirationColor(status).split(' ')[0]}`}>{new Date(nearest).toLocaleDateString('es-ES')}</span>
                                  {expired && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                  {expSoon && !expired && <Clock className="h-3 w-3 text-orange-500" />}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => { setViewProduct(product); setShowViewModal(true); }}
                                className="text-gray-700 hover:text-gray-900 p-1 hover:bg-gray-50 rounded"
                                title="Ver información"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {canEditProducts && (
                                <>
                                  <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded" title="Editar"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded" title="Ocultar (soft-delete)"><Trash2 className="h-4 w-4" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedBatches[product.id] && (
                          <tr className="bg-gray-50">
                            <td className="px-4 py-3" colSpan={9}>
                              <div className="text-xs text-gray-700">
                                <div className="flex items-center mb-2">
                                  <Layers className="h-3 w-3 mr-2 text-gray-500" />
                                  <span className="font-medium">Lotes ({batchSummaries[product.id]?.totalBatches || 0})</span>
                                </div>
                                <div className="max-h-40 overflow-y-auto">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="text-gray-500">
                                        <th className="py-1 pr-2">Lote</th>
                                        <th className="py-1 pr-2">Cantidad</th>
                                        <th className="py-1 pr-2">Costo</th>
                                        <th className="py-1 pr-2">Vencimiento</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {batchSummaries[product.id]?.batches
                                        .slice()
                                        .sort((a, b) => a.batchNumber.localeCompare(b.batchNumber, undefined, { numeric: true }))
                                        .map(b => (
                                          <tr key={b.id} className="border-t border-gray-200">
                                            <td className="py-1 pr-2 font-mono">{b.batchNumber}</td>
                                            <td className="py-1 pr-2">{b.quantity}</td>
                                            <td className="py-1 pr-2">S/ {Number(b.costPrice).toFixed(2)}</td>
                                            <td className="py-1 pr-2">{b.expirationDate ? new Date(b.expirationDate).toLocaleDateString('es-ES') : '—'}</td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No se encontraron productos</p>
                      {hasActiveFilters ? (
                        <button onClick={clearFilters} className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">Limpiar filtros</button>
                      ) : (canEditProducts && (
                        <button onClick={() => setShowForm(true)} className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">Agregar primer producto</button>
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Ver información del producto */}
      {showViewModal && viewProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Información del Producto</h3>
              <button onClick={() => { setShowViewModal(false); setViewProduct(null); }} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-gray-500">Código</div>
                <div className="text-base font-medium font-mono">{viewProduct.code}</div>
                <div className="text-sm text-gray-500 mt-3">Nombre</div>
                <div className="text-base font-medium">{viewProduct.name}</div>
                {viewProduct.description && (
                  <>
                    <div className="text-sm text-gray-500 mt-3">Descripción</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{viewProduct.description}</div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-gray-500">Categoría</div>
                    <div className="text-gray-900">{viewProduct.category}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Marca</div>
                    <div className="text-gray-900">{viewProduct.brand}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-gray-500">Costo</div>
                    <div className="text-gray-900">S/ {viewProduct.costPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Venta</div>
                    <div className="text-gray-900">S/ {viewProduct.salePrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Ganancia</div>
                    <div className="text-gray-900">{viewProduct.profitPercentage.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Stock</div>
                    <div className="text-gray-900">{viewProduct.currentStock}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-500">Imagen</div>
                <div className="rounded-md bg-gray-50 border p-3 flex items-center justify-center min-h-[160px]">
                  {viewProduct.imageUrl ? (
                    <img src={viewProduct.imageUrl} alt={viewProduct.name} className="max-h-48 object-contain" />
                  ) : (
                    <Package className="h-12 w-12 text-gray-300" />
                  )}
                </div>
                <div className="text-sm text-gray-500">Lotes</div>
                <div className="rounded-md border bg-gray-50 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-2 py-1 text-left">Lote</th>
                        <th className="px-2 py-1 text-left">Cant.</th>
                        <th className="px-2 py-1 text-left">Costo</th>
                        <th className="px-2 py-1 text-left">Vence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((batchSummaries as any)[viewProduct?.id || '']?.batches || []).slice().sort((a: any, b: any) => a.batchNumber.localeCompare(b.batchNumber, undefined, { numeric: true })).map((b: any) => (
                        <tr key={b.id} className="border-t">
                          <td className="px-2 py-1 font-mono">{b.batchNumber}</td>
                          <td className="px-2 py-1">{b.quantity}</td>
                          <td className="px-2 py-1">S/ {Number(b.costPrice).toFixed(2)}</td>
                          <td className="px-2 py-1">{b.expirationDate ? new Date(b.expirationDate).toLocaleDateString('es-ES') : '—'}</td>
                        </tr>
                      ))}
                      {(!(batchSummaries as any)[viewProduct?.id || ''] || ((((batchSummaries as any)[viewProduct?.id || '']?.batches) || []).length === 0)) && (
                        <tr>
                          <td colSpan={4} className="px-2 py-4 text-center text-gray-500">Sin lotes</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => { setShowViewModal(false); setViewProduct(null); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cerrar</button>
            </div>
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