import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, SaleItem } from '../../types';
import html2pdf from 'html2pdf.js';
import { 
  Receipt, 
  Search, 
  Eye, 
  Download,
  DollarSign,
  Printer,
  Filter,
  X,
  FileText,
  Calendar,
  CreditCard,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PrintableInvoice } from './PrintableInvoice';

export function SalesList() {
  const { sales } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [invoiceType, setInvoiceType] = useState<'boleta' | 'factura'>('boleta');
  const [actionType, setActionType] = useState<'view' | 'print' | 'download' | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const normalizeSaleItems = (items: any[]): SaleItem[] => {
    if (!items || !Array.isArray(items)) {
      console.error('Items no es un array válido:', items);
      return [];
    }
    
    return items.map((item) => {
      const productName = item.productName || item.name || 'Producto sin nombre';
      const quantity = item.quantity || 1;
      const unitPrice = item.unitPrice || item.price || 0;
      const total = item.total || (quantity * unitPrice);
      
      return {
        id: item.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
        productId: item.productId || item.id || '',
        productName,
        quantity,
        unitPrice,
        total
      };
    });
  };

  const getFilteredSales = () => {
    let filtered = sales.data;

    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerDocument?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items.some(item => 
          (item.productName || item.productName || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(sale => 
        new Date(sale.createdAt) >= startDate
      );
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const filteredSales = getFilteredSales();
  const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSales = filteredSales.length;

  const handleAction = (sale: Sale, type: 'view' | 'print' | 'download', invoiceType: 'boleta' | 'factura' = 'boleta') => {
    setSelectedSale(sale);
    setInvoiceType(invoiceType);
    setActionType(type);

    if (type === 'download') {
      setTimeout(() => {
        if (printRef.current) {
          html2pdf()
            .set({
              filename: `${invoiceType}-${sale.saleNumber}.pdf`,
              margin: 10,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .from(printRef.current)
            .save();
        }
      }, 300);
    } else if (type === 'print') {
      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const originalContents = document.body.innerHTML;
          
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Comprobante - ${sale.saleNumber}</title>
                  <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    @media print {
                      body { margin: 0; padding: 0; }
                    }
                  </style>
                </head>
                <body onload="window.print(); window.onafterprint = function() { window.close(); }">
                  ${printContents}
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        }
      }, 300);
    }
  };

  const closeModal = () => {
    setActionType(null);
    setSelectedSale(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setPaymentFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm || dateFilter !== 'all' || paymentFilter !== 'all' || statusFilter !== 'all';

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

  if (sales.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando ventas...</span>
      </div>
    );
  }

  if (sales.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <Receipt className="h-5 w-5 text-red-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error al cargar ventas</h3>
            <p className="text-sm text-red-700">{sales.error}</p>
            <button
              onClick={sales.refetch}
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
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Historial de Ventas</h2>
          <p className="text-sm sm:text-base text-gray-600">Gestiona y revisa todas las transacciones</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center text-xs sm:text-sm text-gray-600 hover:text-gray-800 bg-gray-100 px-3 py-2 rounded-lg"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Limpiar
            </button>
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-xs sm:text-sm bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 w-full sm:w-auto justify-center"
            >
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Filtros
          </button>
          <button
            onClick={() => {
              const headers = ['N° Venta','Fecha','Cliente','Documento','Pago','Total','IGV','Items'];
              const rows = filteredSales.map(s => [
                s.saleNumber,
                new Date(s.createdAt).toLocaleString('es-PE'),
                s.customerName || 'Cliente general',
                s.customerDocument || '',
                s.paymentMethod,
                (s.total || 0).toFixed(2),
                (s.tax || 0).toFixed(2),
                s.items.length
              ]);
              const style = `
                <style>
                  table { border-collapse: collapse; width: 100%; font-family: Arial; }
                  th { background: #0F766E; color: #fff; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
                  td { padding: 8px; border: 1px solid #e2e8f0; }
                  tr:nth-child(even) td { background: #f8fafc; }
                  .num { text-align: right; }
                </style>`;
              const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
              const tbody = rows.map(r => `<tr>${r.map((v, idx) => `<td class="${[5,6].includes(idx) ? 'num' : ''}">${v ?? ''}</td>`).join('')}</tr>`).join('');
              const html = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/>${style}</head><body><table>${thead}${tbody}</table></body></html>`;
              const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ventas_formato_${new Date().toISOString().slice(0,10)}.xls`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="flex items-center text-xs sm:text-sm bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-800"
            title="Exportar Excel con formato"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Exportar Excel
          </button>
          <button
            onClick={() => {
              const headers = ['N° Venta','Fecha','Cliente','Documento','Pago','Total','IGV','Items'];
              const rows = filteredSales.map(s => [
                s.saleNumber,
                new Date(s.createdAt).toLocaleString('es-PE'),
                s.customerName || 'Cliente general',
                s.customerDocument || '',
                s.paymentMethod,
                s.total.toFixed(2),
                s.tax.toFixed(2),
                s.items.length
              ]);
              const csv = [headers, ...rows]
                .map(r => r.map(v => {
                  const s = String(v ?? '').replace(/"/g,'""');
                  return /["\n\r,;\t]/.test(s) ? `"${s}"` : s;
                }).join(';'))
                .join('\r\n');
              const bom = new Uint8Array([0xEF,0xBB,0xBF]);
              const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ventas_${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="flex items-center text-xs sm:text-sm bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-900"
            title="Exportar Excel"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Ventas</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{totalSales}</p>
            </div>
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
              <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">S/ {totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Promedio por Venta</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                S/ {totalSales > 0 ? (totalAmount / totalSales).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="bg-purple-50 p-2 sm:p-3 rounded-lg">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${showFilters ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar ventas, clientes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="year">Último año</option>
            </select>
          </div>

          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">Todos los pagos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div className="relative">
            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="completed">Completadas</option>
              <option value="pending">Pendientes</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.length > 0 ? filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sale.saleNumber}</div>
                    <div className="text-xs text-gray-500">{sale.items.length} items</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm text-gray-900">
                          {sale.customerName || 'Cliente general'}
                        </div>
                        {sale.customerDocument && (
                          <div className="text-xs text-gray-500">{sale.customerDocument}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleDateString('es-ES')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(sale.createdAt).toLocaleTimeString('es-ES')}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">S/ {sale.total.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">
                      IGV: S/ {sale.tax.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        sale.paymentMethod === 'cash' ? 'bg-green-500' :
                        sale.paymentMethod === 'card' ? 'bg-blue-500' :
                        'bg-purple-500'
                      }`}></div>
                      <div className="text-sm text-gray-900">{formatPaymentMethod(sale.paymentMethod)}</div>
                    </div>
                    {sale.operationNumber && (
                      <div className="text-xs text-gray-500">Op: {sale.operationNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status === 'completed' ? 'Completada' :
                       sale.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                        onClick={() => handleAction(sale, 'view')}
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                        onClick={() => handleAction(sale, 'download')}
                        title="Descargar comprobante"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      
                      <button
                        className="text-gray-600 hover:text-gray-800 p-1 hover:bg-gray-50 rounded transition-colors"
                        onClick={() => handleAction(sale, 'print')}
                        title="Imprimir comprobante"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron ventas</p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-4">
        {filteredSales.length > 0 ? filteredSales.map(sale => (
          <div key={sale.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Venta #{sale.saleNumber}</h3>
                    <p className="text-xs text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <button 
                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                    className="text-gray-400 hover:text-gray-600 ml-2"
                  >
                    {expandedSale === sale.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="text-xs">
                    <span className="text-gray-500">Cliente:</span>
                    <p className="font-medium text-gray-900 truncate">
                      {sale.customerName || 'Cliente general'}
                    </p>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500">Total:</span>
                    <p className="font-medium text-gray-900">S/ {sale.total.toFixed(2)}</p>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500">Pago:</span>
                    <p className="font-medium text-gray-900">
                      {formatPaymentMethod(sale.paymentMethod)}
                    </p>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500">Estado:</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status === 'completed' ? 'Completada' :
                       sale.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {expandedSale === sale.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Documento:</span>
                    <span className="text-gray-900">{sale.customerDocument || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">N° Operación:</span>
                    <span className="text-gray-900">{sale.operationNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IGV:</span>
                    <span className="text-gray-900">S/ {sale.tax.toFixed(2)}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-gray-500 font-medium mb-2">Productos:</p>
                    <ul className="space-y-1">
                      {normalizeSaleItems(sale.items).map((item: SaleItem) => (
                        <li key={item.id} className="text-xs text-gray-900 flex justify-between">
                          <span className="truncate flex-1 mr-2">
                            {item.productName} x {item.quantity}
                          </span>
                          <span className="flex-shrink-0">
                            S/ {(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-4 mt-4 pt-4 border-t border-gray-200">
                  <button
                    className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                    onClick={() => handleAction(sale, 'view')}
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  <button
                    className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                    onClick={() => handleAction(sale, 'download')}
                    title="Descargar comprobante"
                      >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  <button
                    className="text-gray-600 hover:text-gray-800 p-1 hover:bg-gray-50 rounded transition-colors"
                    onClick={() => handleAction(sale, 'print')}
                    title="Imprimir comprobante"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron ventas</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {actionType === 'view' && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Detalles de Venta</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Información de la Venta</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">N° Venta:</span> {selectedSale.saleNumber}</p>
                    <p><span className="font-medium">Fecha:</span> {new Date(selectedSale.createdAt).toLocaleString('es-ES')}</p>
                    <p><span className="font-medium">Método de pago:</span> {formatPaymentMethod(selectedSale.paymentMethod)}</p>
                    {selectedSale.operationNumber && (
                      <p><span className="font-medium">N° Operación:</span> {selectedSale.operationNumber}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Información del Cliente</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nombre:</span> {selectedSale.customerName || 'Cliente general'}</p>
                    {selectedSale.customerDocument && (
                      <p><span className="font-medium">Documento:</span> {selectedSale.customerDocument}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4">Productos</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Precio Unit.</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {normalizeSaleItems(selectedSale.items).map((item: SaleItem) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                            <td className="px-3 py-2 text-sm">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm">S/ {item.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm font-medium">S/ {(item.unitPrice * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-sm font-medium text-right">Subtotal:</td>
                          <td className="px-3 py-2 text-sm font-medium">S/ {selectedSale.subtotal?.toFixed(2) || (selectedSale.total - selectedSale.tax).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-sm font-medium text-right">IGV (18%):</td>
                          <td className="px-3 py-2 text-sm font-medium">S/ {selectedSale.tax.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-sm font-medium text-right">Total:</td>
                          <td className="px-3 py-2 text-sm font-medium text-green-600">S/ {selectedSale.total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-4 sm:p-6 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        {selectedSale && (
          <div ref={printRef}>
            <PrintableInvoice sale={selectedSale} type={invoiceType} />
          </div>
        )}
      </div>
    </div>
  );
}