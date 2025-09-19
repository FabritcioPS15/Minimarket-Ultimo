import { useEffect, useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Sale, SaleItem, PaymentMethod } from '../../types';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Scan, 
  CreditCard,
  Smartphone,
  DollarSign,
  Receipt,
  Calculator,
  Package,
  Eye,
  X,
  User,
  Search,
  Check
} from 'lucide-react';
import { PrintableInvoice } from './PrintableInvoice';

export function InvoiceModal({ open, onClose, sale, type, setType }: any) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const win = window.open('', '', 'width=400,height=600');
      win?.document.write(`
        <html>
          <head>
            <title>Imprimir ${type === 'factura' ? 'Factura' : 'Boleta'}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .invoice { max-width: 300px; margin: 0 auto; }
            </style>
          </head>
          <body>${printContents}</body>
        </html>
      `);
      win?.document.close();
      win?.focus();
      win?.print();
      win?.close();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-semibold mb-4 text-center">Generar Comprobante</h3>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">Tipo de Comprobante:</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setType('boleta')}
              className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                type === 'boleta'
                  ? 'bg-blue-100 border-blue-500 text-blue-700 font-medium shadow-sm'
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Boleta
            </button>
            <button
              onClick={() => setType('factura')}
              className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                type === 'factura'
                  ? 'bg-blue-100 border-blue-500 text-blue-700 font-medium shadow-sm'
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Factura
            </button>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 p-3 mb-4 bg-gray-50 rounded-lg">
          <PrintableInvoice ref={printRef} sale={sale} type={type} />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
            >
            <Receipt className="h-4 w-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function PointOfSale() {
  const { state, dispatch, products, sales, clients } = useApp();
  const { currentUser, currentCashSession } = state;
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [operationNumber, setOperationNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'boleta' | 'factura'>('boleta');
  const [currentSale, setCurrentSale] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSaleConfirmation, setShowSaleConfirmation] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showAddClientFromSearch, setShowAddClientFromSearch] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    firstName: '',
    lastName: '',
    documentType: 'DNI',
    documentNumber: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  });
  const clientSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setInvoiceOpen(true);
    window.addEventListener('openInvoiceModal', handler);
    return () => window.removeEventListener('openInvoiceModal', handler);
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Función para agregar cliente rápido
  const handleAddClient = async () => {
    try {
      // Validar campos obligatorios
      if (!newClientForm.firstName.trim() || !newClientForm.lastName.trim() || !newClientForm.documentNumber.trim()) {
        alert('Por favor complete los campos obligatorios: nombres, apellidos y número de documento');
        return;
      }

      // Validar formato de DNI
      if (newClientForm.documentType === 'DNI' && !/^\d{8}$/.test(newClientForm.documentNumber)) {
        alert('El DNI debe tener 8 dígitos');
        return;
      }

      // Validar formato de RUC
      if (newClientForm.documentType === 'RUC' && !/^\d{11}$/.test(newClientForm.documentNumber)) {
        alert('El RUC debe tener 11 dígitos');
        return;
      }

      // Validar email si está presente
      if (newClientForm.email && !/\S+@\S+\.\S+/.test(newClientForm.email)) {
        alert('El formato del email no es válido');
        return;
      }

      // Crear objeto cliente
      const clientData = {
        documentType: newClientForm.documentType,
        documentNumber: newClientForm.documentNumber,
        firstName: newClientForm.firstName.trim(),
        lastName: newClientForm.lastName.trim(),
        email: newClientForm.email.trim() || undefined,
        phone: newClientForm.phone.trim() || undefined,
        address: newClientForm.address.trim() || undefined,
        isActive: true,
      };

      // Guardar cliente
      await clients.addClient(clientData);
      
      // Cerrar modal y resetear formulario
      setShowAddClientFromSearch(false);
      setNewClientForm({
        firstName: '',
        lastName: '',
        documentType: 'DNI',
        documentNumber: '',
        email: '',
        phone: '',
        address: '',
        isActive: true,
      });
      
      // Actualizar la lista de clientes
      clients.refetch();
      
      alert('Cliente agregado exitosamente');
      
    } catch (error: any) {
      console.error('Error al agregar cliente:', error);
      alert('Error al agregar cliente: ' + (error.message || 'Intente nuevamente'));
    }
  };

  // CORRECCIÓN: Acceder a products.data en lugar de products directamente
  const productsArray = products.data || [];
  const filteredProducts = productsArray.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quitar IGV - el total es igual al subtotal
const subtotal = cart.reduce((sum, item) => sum + ((item.unitPrice ?? 0) * (item.quantity ?? 0)), 0);  const total = subtotal; // Sin IGV

  // Filtrar clientes según búsqueda
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return [];
    
    return clients.data.filter(client =>
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.documentNumber.includes(clientSearch) ||
      client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.phone?.includes(clientSearch)
    );
  }, [clientSearch, clients.data]);

  // Manejar selección de cliente
  const handleSelectClient = (client: any) => {
    setSelectedClientId(client.id);
    setCustomerName(`${client.firstName} ${client.lastName}`);
    setCustomerDocument(client.documentNumber);
    setClientSearch(`${client.firstName} ${client.lastName}`);
    setShowClientSuggestions(false);
  };

  // Manejar búsqueda de cliente
  const handleClientSearch = (value: string) => {
    setClientSearch(value);
    setShowClientSuggestions(true);
    
    // Si se borra la búsqueda, resetear a cliente general
    if (!value.trim()) {
      setSelectedClientId(null);
      setCustomerName('');
      setCustomerDocument('');
    }
  };

  // Preparar formulario para nuevo cliente desde búsqueda
  const prepareNewClientFromSearch = () => {
    // Intentar extraer nombre y apellido de la búsqueda
    const searchParts = clientSearch.trim().split(' ');
    let firstName = '';
    let lastName = '';
    
    if (searchParts.length === 1) {
      firstName = searchParts[0];
    } else if (searchParts.length >= 2) {
      firstName = searchParts[0];
      lastName = searchParts.slice(1).join(' ');
    }
    
    setNewClientForm({
      ...newClientForm,
      firstName,
      lastName,
      documentNumber: clientSearch.trim().length === 8 || clientSearch.trim().length === 11 ? clientSearch.trim() : ''
    });
    
    setShowAddClientFromSearch(true);
    setShowClientSuggestions(false);
  };

  // Función para determinar el color del número de stock
  const getStockColor = (product: Product) => {
    if (product.currentStock <= 0) {
      return 'text-red-600 font-bold'; // Sin stock - Rojo
    } else if (product.currentStock <= product.minStock) {
      return 'text-orange-600 font-bold'; // Stock bajo - Naranja
    } else if (product.currentStock >= product.maxStock) {
      return 'text-blue-600'; // Stock máximo - Azul
    } else {
      return 'text-green-600'; // Stock normal - Verde
    }
  };

  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      alert('Producto sin stock disponible');
      return;
    }

    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      updateQuantity(existing.id, existing.quantity + 1);
      return;
    }
    setCart([
      ...cart,
{
  id: Date.now().toString(),
  productId: product.id,
  productName: product.name,
  unitPrice: product.salePrice, // ← Esta es la propiedad correcta
  quantity: 1,
  total: product.salePrice,     // ← Y aquí también
}
    ]);
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const item = cart.find(i => i.id === itemId);
    // CORRECCIÓN: Usar productsArray en lugar de products.data
    const product = productsArray.find(p => p.id === item?.productId);
    
    if (product && newQuantity > product.currentStock) {
      alert('No hay suficiente stock disponible');
      return;
    }

setCart(cart.map(item => 
  item.id === itemId 
    ? { ...item, quantity: newQuantity, total: (item.unitPrice ?? 0) * newQuantity }
    : item
));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerDocument('');
    setOperationNumber('');
    setPaymentMethod('cash');
    setClientSearch('');
    setSelectedClientId(null);
  };

  const processSale = async () => {
    if (!currentCashSession && currentUser?.role !== 'admin') {
      alert('Debe abrir una sesión de caja para realizar ventas');
      return;
    }

    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (paymentMethod !== 'cash' && !operationNumber.trim()) {
      alert('Debe ingresar el número de operación para pagos electrónicos');
      return;
    }

    const saleNumber = `V-${Date.now()}`;
    
    // CORRECCIÓN: Usar productsArray en lugar de products.find
    const saleItems = cart.map(item => {
      const product = productsArray.find(p => p.id === item.productId);
      return {
        ...item,
        name: item.productName ?? product?.name ?? '',
        unitPrice: item.unitPrice ?? product?.salePrice ?? 0,
        total: (item.unitPrice ?? product?.salePrice ?? 0) * (item.quantity ?? 1),
      };
    });

    const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal; // Sin IGV

    // Determinar información del cliente
    let finalCustomerName = '';
    let finalCustomerDocument = '';
    
    if (selectedClientId) {
      const selectedClient = clients.data.find(c => c.id === selectedClientId);
      if (selectedClient) {
        finalCustomerName = `${selectedClient.firstName} ${selectedClient.lastName}`;
        finalCustomerDocument = selectedClient.documentNumber;
      }
    } else if (clientSearch.trim()) {
      finalCustomerName = clientSearch;
    }

    const sale: Sale = {
      id: Date.now().toString(),
      saleNumber,
      items: saleItems,
      subtotal,
      tax: 0, // IGV en 0
      total,
      paymentMethod,
      operationNumber: operationNumber || undefined,
      customerName: finalCustomerName || undefined,
      customerDocument: finalCustomerDocument || undefined,
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || '',
    };

    // Guardar venta en la base de datos
    try {
      await sales.addSale(sale);
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Error al guardar la venta: ' + (typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error)));
      return;
    }

    // Actualizar stock y kardex
    cart.forEach(item => {
      // CORRECCIÓN: Usar productsArray en lugar de products.data
      const product = productsArray.find(p => p.id === item.productId);
      if (product) {
        const updatedProduct = {
          ...product,
          currentStock: product.currentStock - item.quantity,
          updatedAt: new Date().toISOString(),
        };
        products.updateProduct(updatedProduct);

        dispatch({
          type: 'ADD_KARDEX_ENTRY',
          payload: {
            id: Date.now().toString() + Math.random(),
            productId: product.id,
            type: 'exit',
            quantity: item.quantity,
            unitCost: product.costPrice,
            totalCost: product.costPrice * item.quantity,
            reason: 'Venta',
            reference: saleNumber,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.id || '',
          },
        });
      }
    });

    setCurrentSale(sale);
    setConfirmedSale(sale);
    setShowSaleConfirmation(true);
    clearCart(); 
  };

  const paymentMethods = [
    { 
      id: 'cash', 
      label: 'Efectivo', 
      icon: DollarSign,
      color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      activeColor: 'bg-green-100 border-green-500 text-green-800 shadow-sm'
    },
    { 
      id: 'card', 
      label: 'Tarjeta', 
      icon: CreditCard,
      color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      activeColor: 'bg-blue-100 border-blue-500 text-blue-800 shadow-sm'
    },
    { 
      id: 'transfer', 
      label: 'Transferencia', 
      icon: Receipt,
      color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      activeColor: 'bg-purple-100 border-purple-500 text-purple-800 shadow-sm'
    },
    { 
      id: 'yape', 
      label: 'Yape', 
      icon: Smartphone,
      color: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
      activeColor: 'bg-teal-100 border-teal-500 text-teal-800 shadow-sm'
    },
    { 
      id: 'plin', 
      label: 'Plin', 
      icon: Smartphone,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
      activeColor: 'bg-indigo-100 border-indigo-500 text-indigo-800 shadow-sm'
    },
    { 
      id: 'other', 
      label: 'Otro', 
      icon: Calculator,
      color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
      activeColor: 'bg-gray-100 border-gray-500 text-gray-800 shadow-sm'
    },
  ];

  const SaleConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md mx-4">
        <div className="text-center">
          <div className="bg-green-100 rounded-full p-4 inline-block mb-4">
            <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Venta Realizada!</h3>
          <p className="text-gray-600 mb-6">La compra ha sido registrada exitosamente</p>
          
          {confirmedSale && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">N° de Venta:</span>
                  <span className="text-sm font-medium text-gray-900">{confirmedSale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-lg font-bold text-green-600">S/ {confirmedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Método de Pago:</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{confirmedSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Productos:</span>
                  <span className="text-sm font-medium text-gray-900">{confirmedSale.items.length} items</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowSaleConfirmation(false);
                setCurrentSale(confirmedSale);
                setInvoiceOpen(true);
              }}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Receipt className="h-5 w-5" />
              <span>Generar Comprobante</span>
            </button>
            
            <button
              onClick={() => {
                setShowSaleConfirmation(false);
                setConfirmedSale(null);
              }}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Continuar Vendiendo
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Product Search */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Productos</h3>
          <div className="mt-2 relative">
            <input
              type="text"
              placeholder="Buscar productos por nombre o código..."
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Scan className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {filteredProducts.slice(0, 24).map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={`text-left p-3 border border-gray-200 rounded-lg transition-all ${
                  product.currentStock > 0 
                    ? 'hover:bg-blue-50 hover:border-blue-300' 
                    : 'opacity-70 cursor-not-allowed'
                }`}
                disabled={product.currentStock <= 0}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex flex-col items-center">
                    {product.imageUrl ? (
                      <div className="relative mb-2">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="h-20 w-20 object-cover rounded-md"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="h-14 w-14 bg-gray-100 rounded-md flex items-center justify-center hidden">
                          <Package className="h-7 w-7 text-gray-400" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-14 w-14 bg-gray-100 rounded-md flex items-center justify-center mb-2">
                        <Package className="h-7 w-7 text-gray-400" />
                      </div>
                    )}
                    
                    {product.imageUrl && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview(product.imageUrl!);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center cursor-pointer"
                        title="Ver imagen"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-[18px] mb-1 line-clamp-2">
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 mb-1">{product.code}</p>
                    
                    <div className="mb-2">
                      <p className="text-[20px] font-semibold text-blue-600">
                        S/ {product.salePrice.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Stock:</span>
                      <span className={`text-xs font-medium ${getStockColor(product)}`}>
                        {product.currentStock}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shopping Cart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Carrito ({cart.length})
          </h3>
        </div>

        <div className="p-4">
          {/* Cart Items */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cart.map(item => {
              const product = productsArray.find(p => p.id === item.productId);
              return (
                <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  {product?.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="h-10 w-10 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{item.productName}</h4>
                    <p className="text-xs text-gray-500">S/ {(item.unitPrice ?? 0).toFixed(2)} c/u</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 text-gray-500 hover:text-blue-600"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-gray-500 hover:text-red-600 ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {cart.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Carrito vacío</p>
              </div>
            )}
          </div>

          {/* Totals - Sin IGV */}
          {cart.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Cliente */}
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            
            <div className="relative" ref={clientSearchRef}>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <Search className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  className="flex-1 outline-none text-sm"
                  value={clientSearch}
                  onChange={(e) => handleClientSearch(e.target.value)}
                  onFocus={() => setShowClientSuggestions(true)}
                  placeholder="Buscar cliente por nombre, documento, email..."
                />
              </div>
              
              {/* Sugerencias de clientes */}
              {showClientSuggestions && clientSearch.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                        onClick={() => handleSelectClient(client)}
                      >
                        <div>
                          <div className="font-medium">{client.firstName} {client.lastName}</div>
                          <div className="text-xs text-gray-500">
                            {client.documentType}: {client.documentNumber}
                            {client.email && ` • ${client.email}`}
                          </div>
                        </div>
                        {selectedClientId === client.id && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div
                      className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center text-blue-600"
                      onClick={prepareNewClientFromSearch}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Agregar "{clientSearch}" como nuevo cliente</span>
                    </div>
                  )}
                  
                  {/* Opción para cliente general */}
                  <div
                    className="px-4 py-2 border-t border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedClientId(null);
                      setCustomerName('');
                      setCustomerDocument('');
                      setClientSearch('');
                      setShowClientSuggestions(false);
                    }}
                  >
                    <div className="font-medium">Cliente General</div>
                    <div className="text-xs text-gray-500">No especificar cliente</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal para agregar cliente desde búsqueda */}
            {showAddClientFromSearch && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
                  <button
                    onClick={() => setShowAddClientFromSearch(false)}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <h3 className="text-lg font-semibold mb-4 text-center flex items-center justify-center">
                    <User className="h-5 w-5 mr-2" />
                    Agregar Nuevo Cliente
                  </h3>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleAddClient();
                    }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={newClientForm.firstName}
                          onChange={e => setNewClientForm({ ...newClientForm, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={newClientForm.lastName}
                          onChange={e => setNewClientForm({ ...newClientForm, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento *</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={newClientForm.documentType}
                          onChange={e => setNewClientForm({ ...newClientForm, documentType: e.target.value })}
                        >
                          <option value="DNI">DNI</option>
                          <option value="RUC">RUC</option>
                          <option value="CE">Carnet de Extranjería</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={newClientForm.documentNumber}
                          onChange={e => setNewClientForm({ ...newClientForm, documentNumber: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={newClientForm.email}
                        onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={newClientForm.phone}
                        onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={newClientForm.address}
                        onChange={e => setNewClientForm({ ...newClientForm, address: e.target.value })}
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium mt-2"
                    >
                      Guardar Cliente
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Campos manuales si es Cliente General */}
            {!selectedClientId && clientSearch && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800 mb-2">
                  Se registrará como: <strong>{clientSearch}</strong>
                </div>
                <div className="text-xs text-blue-600">
                  Esta información se asociará a la venta como "Cliente General"
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    paymentMethod === method.id
                      ? method.activeColor
                      : method.color
                  }`}
                >
                  <method.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Operation Number for Electronic Payments */}
          {paymentMethod !== 'cash' && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Operación *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                placeholder="Número de operación"
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-2">
            <button
              onClick={processSale}
              disabled={cart.length === 0}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
            >
              <Receipt className="h-5 w-5" />
              <span>Procesar Venta</span>
            </button>
            
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Limpiar Carrito
            </button>
          </div>
        </div>
      </div>

      {/* Modal de vista previa de imagen */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Vista previa</h3>
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

      <InvoiceModal
        open={invoiceOpen}
        onClose={() => {
          setInvoiceOpen(false);
          setCurrentSale(null);
        }}
        sale={currentSale}
        type={invoiceType}
        setType={setInvoiceType}
      />
      {showSaleConfirmation && <SaleConfirmationModal />}
    </div>
  );
}