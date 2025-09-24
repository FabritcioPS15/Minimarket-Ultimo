import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { ArrowLeft, Package, Save, Calculator, Eye, ScanBarcode, Plus, Trash2, Edit, X, Check, Calendar, AlertTriangle } from 'lucide-react';
import { useProductBatches } from '../../hooks/useProductBatches';
import { useSuppliers } from '../../hooks/useSuppliers';

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
}

// Categorías predefinidas con códigos asociados
const PREDEFINED_CATEGORIES = [
  { name: 'Bebidas', code: 'BEB' },
  { name: 'Lácteos', code: 'LAC' },
  { name: 'Panadería', code: 'PAN' },
  { name: 'Snacks', code: 'SNK' },
  { name: 'Frutas y Verduras', code: 'FRU' },
  { name: 'Carnes', code: 'CAR' },
  { name: 'Limpieza', code: 'LIM' },
  { name: 'Cuidado Personal', code: 'CUI' },
  { name: 'Electrónicos', code: 'ELE' },
  { name: 'Ropa', code: 'ROP' },
  { name: 'Hogar', code: 'HOG' },
  { name: 'Juguetes', code: 'JUG' },
  { name: 'Deportes', code: 'DEP' },
  { name: 'Libros', code: 'LIB' },
  { name: 'Otros', code: 'OTR' }
];

// Interface para lotes locales (solo para productos nuevos)
interface LocalBatch {
  id: number;
  quantity: number;
  costPrice: number;
  purchaseDate: string;
  batchNumber: string;
  supplier: string;
  expirationDate?: string;
}

export function ProductForm({ product, onClose }: ProductFormProps) {
  const { products, addAuditEntry } = useApp();
  const { suppliers, addSupplier, refetch: refetchSuppliers } = useSuppliers();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    categoryCode: '',
    brand: '',
    costPrice: '0',
    salePrice: '',
    currentStock: '0',
    minStock: '',
    maxStock: '',
    imageUrl: '',
  });

  // Estados para lotes locales (solo para productos nuevos)
  const [localBatches, setLocalBatches] = useState<LocalBatch[]>([]);
  const [showLocalBatchForm, setShowLocalBatchForm] = useState(false);
  const [editingLocalBatchId, setEditingLocalBatchId] = useState<number | null>(null);
  const [localBatchForm, setLocalBatchForm] = useState({
    quantity: '',
    costPrice: '',
    purchaseDate: '',
    batchNumber: '',
    supplier: '',
    expirationDate: ''
  });

  // Hook para lotes en base de datos (productos existentes)
  const productBatches = useProductBatches(product?.id);
  
  // Estados para formulario de lote en BD
  const [savingBatch, setSavingBatch] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [newBatch, setNewBatch] = useState({
    batchNumber: '',
    quantity: '',
    costPrice: '',
    purchaseDate: '',
    supplier: '',
    expirationDate: ''
  });
  const [showSupplierSuggestionsDB, setShowSupplierSuggestionsDB] = useState(false);
  const [showSupplierSuggestionsLocal, setShowSupplierSuggestionsLocal] = useState(false);

  const [profitPercentage, setProfitPercentage] = useState(0);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryCode, setCustomCategoryCode] = useState('');

  // Función simple para mostrar notificaciones
  const showNotification = (message: string, _type: 'success' | 'error' | 'warning' = 'success') => {
    alert(message);
  };

  // CORREGIDO: Función para generar número de lote automático
  const generateBatchNumber = (): string => {
    try {
      if (product && productBatches.batches) {
        const nextNumber = (productBatches.batches.length || 0) + 1;
        return `Lote ${nextNumber}`;
      }
      return `Lote ${localBatches.length + 1}`;
    } catch (error) {
      console.error('Error generating batch number:', error);
      return `Lote ${Date.now()}`;
    }
  };

  // Calcular promedios y totales automáticamente
  const totalUnidadesLocal = localBatches.reduce((acc, batch) => acc + batch.quantity, 0);
  const totalUnidadesBatches = (productBatches.batches || []).reduce((acc, batch) => acc + batch.quantity, 0);
  
  // Calcular precio de costo promedio ponderado
  const calcularPrecioCostoPromedio = () => {
    if (!product) {
      // Para productos nuevos: promedio de lotes locales
      if (localBatches.length === 0) return 0;
      const totalInversion = localBatches.reduce((acc, batch) => acc + (batch.quantity * batch.costPrice), 0);
      return totalUnidadesLocal > 0 ? totalInversion / totalUnidadesLocal : 0;
    } else {
      // Para productos existentes: promedio de lotes en BD
      if (!productBatches.batches || productBatches.batches.length === 0) return 0;
      const totalInversion = productBatches.batches.reduce((acc, batch) => 
        acc + (batch.quantity * batch.costPrice), 0);
      return totalUnidadesBatches > 0 ? totalInversion / totalUnidadesBatches : 0;
    }
  };

  const precioCostoPromedio = calcularPrecioCostoPromedio();

  // Calcular total de inversión en lotes
  const totalInversionLocal = localBatches.reduce((acc, batch) => acc + (batch.quantity * batch.costPrice), 0);
  const totalInversionBatches = (productBatches.batches || []).reduce((acc, batch) => 
    acc + (batch.quantity * batch.costPrice), 0);

  // Actualizar stock y precio de costo automáticamente
  useEffect(() => {
    const nuevoPrecioCosto = precioCostoPromedio.toFixed(2);
    const nuevoStock = product ? totalUnidadesBatches.toString() : totalUnidadesLocal.toString();
    
    setFormData(prev => ({
      ...prev,
      currentStock: nuevoStock,
      costPrice: nuevoPrecioCosto
    }));
  }, [totalUnidadesLocal, totalUnidadesBatches, precioCostoPromedio, product]);

  // Calcular porcentaje de ganancia
  useEffect(() => {
    const cost = parseFloat(formData.costPrice) || 0;
    const sale = parseFloat(formData.salePrice) || 0;
    
    if (cost > 0 && sale > 0) {
      const profit = ((sale - cost) / cost) * 100;
      setProfitPercentage(profit);
    } else {
      setProfitPercentage(0);
    }
  }, [formData.costPrice, formData.salePrice]);

  // Verificar alertas de stock
  const minStock = parseInt(formData.minStock) || 0;
  const currentStock = parseInt(formData.currentStock) || 0;
  const maxStock = parseInt(formData.maxStock) || 0;
  
  const hasLowStock = minStock > 0 && currentStock <= minStock;
  const hasOverStock = maxStock > 0 && currentStock > maxStock;

  // Manejar formulario de lote local
  const handleLocalBatchFormChange = (field: string, value: string) => {
    setLocalBatchForm(prev => ({ ...prev, [field]: value }));
  };

  const resetLocalBatchForm = () => {
    setLocalBatchForm({
      quantity: '',
      costPrice: '',
      purchaseDate: '',
      batchNumber: generateBatchNumber(),
      supplier: '',
      expirationDate: ''
    });
    setEditingLocalBatchId(null);
    setShowLocalBatchForm(false);
  };

  const handleAddLocalBatch = () => {
    if (!localBatchForm.quantity || !localBatchForm.costPrice) {
      showNotification('La cantidad y el precio son obligatorios', 'error');
      return;
    }

    const quantityValue = Number(localBatchForm.quantity);
    const costPriceValue = Number(localBatchForm.costPrice);

    if (quantityValue <= 0) {
      showNotification('La cantidad debe ser mayor a 0', 'error');
      return;
    }

    if (costPriceValue < 0) {
      showNotification('El precio no puede ser negativo', 'error');
      return;
    }

    const newBatch: LocalBatch = {
      id: editingLocalBatchId || Date.now(),
      quantity: quantityValue,
      costPrice: costPriceValue,
      purchaseDate: localBatchForm.purchaseDate,
      batchNumber: localBatchForm.batchNumber || generateBatchNumber(),
      supplier: localBatchForm.supplier,
      expirationDate: localBatchForm.expirationDate || undefined
    };

    if (editingLocalBatchId) {
      setLocalBatches(localBatches.map(batch => batch.id === editingLocalBatchId ? newBatch : batch));
      showNotification('Lote actualizado correctamente', 'success');
    } else {
      setLocalBatches([...localBatches, newBatch]);
      showNotification('Lote agregado correctamente', 'success');
    }

    resetLocalBatchForm();
  };

  const handleEditLocalBatch = (batch: LocalBatch) => {
    setLocalBatchForm({
      quantity: batch.quantity.toString(),
      costPrice: batch.costPrice.toString(),
      purchaseDate: batch.purchaseDate,
      batchNumber: batch.batchNumber,
      supplier: batch.supplier,
      expirationDate: batch.expirationDate || ''
    });
    setEditingLocalBatchId(batch.id);
    setShowLocalBatchForm(true);
  };

  const handleDeleteLocalBatch = (id: number) => {
    const batchToDelete = localBatches.find(b => b.id === id);
    if (batchToDelete) {
      setLocalBatches(localBatches.filter(batch => batch.id !== id));
      showNotification('Lote eliminado correctamente', 'success');
    }
  };

  // Helpers proveedor: filtrar por nombre o documento
  const filterSuppliers = (q: string) => {
    const query = q.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.documentNumber || '').toLowerCase().includes(query)
    );
  };

  const quickCreateSupplier = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const created = await addSupplier({ name: trimmed, documentType: 'RUC' });
      await refetchSuppliers();
      return created;
    } catch (e) {
      alert('Error creando proveedor: ' + ((e as any)?.message || 'desconocido'));
      return null;
    }
  };

  // Inicializar formulario de lote con número automático
  useEffect(() => {
    if (!showLocalBatchForm && !showBatchForm) {
      setLocalBatchForm(prev => ({
        ...prev,
        batchNumber: generateBatchNumber()
      }));
      setNewBatch(prev => ({
        ...prev,
        batchNumber: generateBatchNumber()
      }));
    }
  }, [localBatches.length, productBatches.batches?.length, showLocalBatchForm, showBatchForm]);

// CORREGIDO: Agregar o editar lote en la base de datos
const addBatch = async () => {
  if (!product?.id) {
    showNotification('Guarda primero el producto para poder agregar lotes', 'error');
    return;
  }

  const qty = parseInt(newBatch.quantity || '0', 10);
  const cost = parseFloat(newBatch.costPrice || '0');
  const batchNumber = newBatch.batchNumber?.trim();

  // Validaciones básicas
  if (qty <= 0) {
    showNotification('La cantidad debe ser mayor a 0', 'error');
    return;
  }

  if (cost < 0) {
    showNotification('El costo no puede ser negativo', 'error');
    return;
  }

  if (!batchNumber) {
    showNotification('El número de lote es requerido', 'error');
    return;
  }

  setSavingBatch(true);

  try {
    console.log('🔍 Modo:', editingBatchId ? 'EDITANDO' : 'AGREGANDO');
    console.log('📝 Batch ID:', editingBatchId);
    console.log('🔢 Número de lote:', batchNumber);

    if (editingBatchId) {
      // MODO EDICIÓN
      console.log('✏️ Editando lote existente:', editingBatchId);
      
      await productBatches.updateBatch(editingBatchId, {
        batchNumber: batchNumber,
        quantity: qty,
        costPrice: cost,
        purchaseDate: newBatch.purchaseDate || undefined,
        supplier: newBatch.supplier || undefined,
        expirationDate: newBatch.expirationDate || undefined,
      });
      
      showNotification('Lote actualizado correctamente', 'success');
    } else {
      // MODO AGREGAR NUEVO
      console.log('➕ Agregando nuevo lote');
      
      await productBatches.addBatch({
        productId: product.id,
        batchNumber: batchNumber,
        quantity: qty,
        costPrice: cost,
        purchaseDate: newBatch.purchaseDate || undefined,
        supplier: newBatch.supplier || undefined,
        expirationDate: newBatch.expirationDate || undefined
      });
      
      showNotification('Lote agregado correctamente', 'success');
    }

    // Limpiar formulario
    setNewBatch({
      batchNumber: generateBatchNumber(),
      quantity: '',
      costPrice: '',
      purchaseDate: '',
      supplier: '',
      expirationDate: ''
    });
    setShowBatchForm(false);
    setEditingBatchId(null);
    
  } catch (error: any) {
    console.error('❌ Error guardando lote:', error);
    showNotification('Error al guardar lote: ' + error.message, 'error');
  } finally {
    setSavingBatch(false);
  }
};

  // Eliminar lote de la base de datos
  const deleteBatch = async (batchId: string) => {
    if (!confirm('¿Eliminar lote? Esta acción no se puede deshacer.')) return;

    try {
      await productBatches.deleteBatch(batchId);
      showNotification('Lote eliminado correctamente', 'success');
    } catch (error: any) {
      console.error('Error eliminando lote:', error);
      showNotification('Error al eliminar lote: ' + (error.message || 'Error desconocido'), 'error');
    }
  };

// CORREGIDO: Manejar edición de lote de BD
const startEditBatch = (batch: any) => {
  console.log('✏️ Iniciando edición del lote:', batch.id);
  setEditingBatchId(batch.id);
  setNewBatch({
    batchNumber: batch.batchNumber || generateBatchNumber(),
    quantity: batch.quantity.toString(),
    costPrice: batch.costPrice.toString(),
    purchaseDate: batch.purchaseDate || '',
    supplier: batch.supplier || '',
    expirationDate: batch.expirationDate || ''
  });
  setShowBatchForm(true);
};

  const cancelEditBatch = () => {
    setEditingBatchId(null);
    setShowBatchForm(false);
    setNewBatch({
      batchNumber: generateBatchNumber(),
      quantity: '',
      costPrice: '',
      purchaseDate: '',
      supplier: '',
      expirationDate: ''
    });
  };

  // Generar código automático al cargar el formulario para nuevos productos
  useEffect(() => {
    if (!product) {
      const defaultCategory = PREDEFINED_CATEGORIES[0];
      setFormData(prev => ({ 
        ...prev, 
        category: defaultCategory.name,
        categoryCode: defaultCategory.code
      }));
      
      setTimeout(() => {
        generateProductCode(defaultCategory.code);
      }, 100);
    }
  }, []);

  // Cargar datos del producto cuando se edita
  useEffect(() => {
    if (product) {
      const categoryObj = PREDEFINED_CATEGORIES.find(cat => cat.name === product.category);
      const categoryCode = categoryObj ? categoryObj.code : 'OTR';
      
      setFormData({
        code: product.code,
        name: product.name,
        description: product.description,
        category: product.category,
        categoryCode: categoryCode,
        brand: product.brand,
        costPrice: product.costPrice.toString(),
        salePrice: product.salePrice.toString(),
        currentStock: product.currentStock.toString(),
        minStock: product.minStock.toString(),
        maxStock: product.maxStock.toString(),
        imageUrl: product.imageUrl || '',
      });
      setProfitPercentage(product.profitPercentage);
      
      if (!PREDEFINED_CATEGORIES.map(c => c.name).includes(product.category) && product.category) {
        setShowCustomCategory(true);
        setCustomCategoryCode(product.code.substring(0, 3));
      }
    }
  }, [product]);

  const generateProductCode = (categoryCode: string) => {
    try {
      // Buscar el mayor correlativo existente para la categoría en la lista de productos
      const prefix = `${categoryCode}-`;
      const regex = new RegExp(`^${categoryCode}-\\d+$`);
      const sameCat = (products.data || [])
        .map(p => String(p.code || '').trim())
        .filter(c => regex.test(c));

      let maxNum = 0;
      sameCat.forEach(c => {
        const num = parseInt(c.replace(prefix, ''), 10);
        if (!isNaN(num)) maxNum = Math.max(maxNum, num);
      });

      // Siguiente número después del mayor
      const nextNumber = maxNum + 1;
      const padLen = 4; // mantener 4 dígitos para compatibilidad del formulario
      const newCode = `${categoryCode}-${nextNumber.toString().padStart(padLen, '0')}`;
      setFormData(prev => ({ ...prev, code: newCode }));
    } catch {
      const fallback = `${categoryCode}-0001`;
      setFormData(prev => ({ ...prev, code: fallback }));
    }
  };

  const regenerateCode = () => {
    if (formData.categoryCode) {
      generateProductCode(formData.categoryCode);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cost = parseFloat(formData.costPrice);
    const sale = parseFloat(formData.salePrice);
    
    if (cost >= sale) {
      showNotification('El precio de venta debe ser mayor al precio de costo', 'error');
      return;
    }

    if (!/^[A-Z]{3}-\d{4}$/.test(formData.code)) {
      showNotification('El código debe tener el formato: XXX-0000 (tres letras, un guión y cuatro números)', 'error');
      return;
    }

    if (parseInt(formData.minStock) > parseInt(formData.maxStock)) {
      showNotification('El stock mínimo no puede ser mayor al stock máximo', 'error');
      return;
    }

    setSaving(true);

    try {
      if (product) {
        // Actualizar producto existente
        const updateData = {
          id: product.id,
          code: formData.code,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          brand: formData.brand,
          costPrice: cost,
          salePrice: sale,
          profitPercentage: profitPercentage,
          currentStock: parseInt(formData.currentStock),
          minStock: parseInt(formData.minStock),
          maxStock: parseInt(formData.maxStock),
          imageUrl: formData.imageUrl || null,
          updatedAt: new Date().toISOString(),
        };
        
        console.log('Actualizando producto:', updateData);
        await products.updateProduct(updateData);
        
        // Registrar en auditoría
        await addAuditEntry({
          action: 'PRODUCT_UPDATE',
          entity: 'products',
          entityId: product.id || '',
          entityName: product.name,
          details: `Producto "${product.name}" (${product.code}) actualizado - Precio: S/.${sale.toFixed(2)}, Stock: ${formData.currentStock}`,
          oldValue: product,
          newValue: updateData,
          metadata: {
            productCode: product.code,
            productCategory: product.category,
            priceChange: sale !== product.salePrice,
            stockChange: parseInt(formData.currentStock) !== product.currentStock,
          },
        });
        
        showNotification('Producto actualizado correctamente', 'success');
      } else {
        // Crear nuevo producto
        const newProductData = {
          code: formData.code,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          brand: formData.brand,
          costPrice: cost,
          salePrice: sale,
          profitPercentage: profitPercentage,
          currentStock: parseInt(formData.currentStock),
          minStock: parseInt(formData.minStock),
          maxStock: parseInt(formData.maxStock),
          imageUrl: formData.imageUrl || null,
        };
        
        console.log('Creando producto:', newProductData);
        const createdProduct = await products.addProduct(newProductData);
        
        // Registrar en auditoría
        await addAuditEntry({
          action: 'PRODUCT_CREATE',
          entity: 'products',
          entityId: createdProduct?.id || '',
          entityName: newProductData.name,
          details: `Producto "${newProductData.name}" (${newProductData.code}) creado - Precio: S/.${sale.toFixed(2)}, Stock: ${formData.currentStock}, Categoría: ${formData.category}`,
          newValue: newProductData,
          metadata: {
            productCode: newProductData.code,
            productCategory: newProductData.category,
            batchesAdded: localBatches.length,
          },
        });
        
        // Agregar lotes locales al producto creado
        if (localBatches.length > 0 && createdProduct?.id) {
          try {
            for (const batch of localBatches) {
              await productBatches.addBatch({
                productId: createdProduct.id,
                batchNumber: batch.batchNumber,
                quantity: batch.quantity,
                costPrice: batch.costPrice,
                purchaseDate: batch.purchaseDate || undefined,
                supplier: batch.supplier || undefined,
                expirationDate: batch.expirationDate || undefined
              });
            }
            showNotification('Producto y lotes creados correctamente', 'success');
          } catch (error: any) {
            console.error('Error agregando lotes:', error);
            showNotification('Producto creado, pero error al agregar lotes: ' + error.message, 'warning');
          }
        } else {
          showNotification('Producto creado correctamente', 'success');
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('Error al guardar el producto: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const value = e.target.value;
    
    if (e.target.name === 'categorySelect') {
      if (value === "add_new") {
        setShowCustomCategory(true);
        setFormData(prev => ({ ...prev, category: '', categoryCode: '' }));
      } else {
        setShowCustomCategory(false);
        const selectedCategory = PREDEFINED_CATEGORIES.find(cat => cat.name === value);
        if (selectedCategory) {
          setFormData(prev => ({ 
            ...prev, 
            category: selectedCategory.name, 
            categoryCode: selectedCategory.code 
          }));
          generateProductCode(selectedCategory.code);
        }
      }
    } else if (e.target.name === 'customCategory') {
      setFormData(prev => ({ ...prev, category: value }));
    } else if (e.target.name === 'customCategoryCode') {
      const code = value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
      setCustomCategoryCode(code);
      setFormData(prev => ({ ...prev, categoryCode: code }));
      if (code.length === 3) {
        generateProductCode(code);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onClose}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? 'Editar Producto' : 'Agregar Producto'}
          </h2>
          <p className="text-gray-600">
            {product ? 'Modifica la información del producto' : 'Registra un nuevo producto en el inventario'}
          </p>
        </div>
      </div>

      {/* Alertas de stock */}
      {(hasLowStock || hasOverStock) && (
        <div className="space-y-3">
          {hasLowStock && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h4 className="font-medium text-yellow-800">Stock bajo</h4>
                <p className="text-yellow-700 text-sm">
                  El stock actual ({currentStock}) está por debajo del mínimo ({minStock})
                </p>
              </div>
            </div>
          )}
          
          {hasOverStock && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h4 className="font-medium text-blue-800">Stock excedido</h4>
                <p className="text-blue-700 text-sm">
                  El stock actual ({currentStock}) supera el máximo establecido ({maxStock})
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Información Básica
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código del Producto *
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <ScanBarcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      pattern="[A-Z]{3}-\d{4}"
                      title="Formato: XXX-0000 (tres letras, un guión y cuatro números)"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="ABC-0001"
                    />
                  </div>
                  {!product && (
                    <button
                      type="button"
                      onClick={regenerateCode}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      title="Generar nuevo código"
                    >
                      Regenerar
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formato: [Categoría]-[Número]. Ej: BEB-0001, LIM-0001
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del producto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del producto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  {!showCustomCategory ? (
                    <select
                      name="categorySelect"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.category}
                      onChange={handleCategoryChange}
                    >
                      <option value="">Seleccionar categoría</option>
                      {PREDEFINED_CATEGORIES.map((category) => (
                        <option key={category.code} value={category.name}>
                          {category.name} ({category.code})
                        </option>
                      ))}
                      <option value="add_new">+ Agregar nueva categoría</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          name="customCategory"
                          type="text"
                          required
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={formData.category}
                          onChange={handleCategoryChange}
                          placeholder="Nueva categoría"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomCategory(false);
                            setFormData(prev => ({ ...prev, category: '', categoryCode: '' }));
                          }}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          title="Usar categoría predefinida"
                        >
                          Cancelar
                        </button>
                      </div>
                      <div>
                        <input
                          name="customCategoryCode"
                          type="text"
                          required
                          maxLength={3}
                          pattern="[A-Z]{3}"
                          title="Tres letras mayúsculas"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                          value={customCategoryCode}
                          onChange={handleCategoryChange}
                          placeholder="Código de 3 letras (ej: PER)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ingresa 3 letras para el código de categoría
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Marca del producto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Imagen
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setShowImagePreview(true)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Vista previa de la imagen"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa la URL de una imagen para el producto (opcional)
                </p>
              </div>
            </div>

            {/* Pricing and Stock */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Precios y Stock
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de Costo *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      readOnly
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      value={formData.costPrice}
                      title="Precio calculado automáticamente del promedio de lotes"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Calculado del promedio de lotes</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de Venta *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Profit Calculation */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">Ganancia Calculada:</span>
                  <span className="text-lg font-bold text-green-800">{profitPercentage.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  Ganancia por unidad: S/ {(parseFloat(formData.salePrice) - parseFloat(formData.costPrice) || 0).toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Actual *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    value={formData.currentStock}
                    title="Stock calculado automáticamente de la suma de lotes"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculado de la suma de lotes</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Mínimo *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Máximo *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección de Lotes */}
          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Gestión de Lotes
                </h3>
                <p className="text-sm text-gray-600">
                  {product ? 'Administra los lotes del producto existente' : 'Agrega lotes para el nuevo producto'}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-600">Inversión total en lotes</div>
                <div className="text-xl font-bold text-green-600">
                  S/ {(product ? totalInversionBatches : totalInversionLocal).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {product ? (productBatches.batches?.length || 0) : localBatches.length} lote(s) - {product ? totalUnidadesBatches : totalUnidadesLocal} unidades
                </div>
              </div>
            </div>

            {product ? (
              /* Lotes para producto existente (base de datos) */
              <div className="space-y-4">
                {/* Botón para mostrar formulario de lote */}
{/* Botón para mostrar formulario de lote */}
{!showBatchForm ? (
  <div className="text-center py-4">
    <button
      type="button"
      onClick={() => {
        setEditingBatchId(null);
        setNewBatch({
          batchNumber: generateBatchNumber(),
          quantity: '',
          costPrice: '',
          purchaseDate: '',
          supplier: '',
          expirationDate: ''
        });
        setShowBatchForm(true);
      }}
      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
    >
      <Plus className="h-5 w-5" />
      <span className="font-medium">Agregar Nuevo Lote</span>
    </button>
  </div>
) : (
  <div className={`border rounded-lg p-4 ${editingBatchId ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <h4 className={`font-medium ${editingBatchId ? 'text-yellow-900' : 'text-blue-900'}`}>
          {editingBatchId ? '✏️ Editar Lote' : '➕ Agregar nuevo lote'}
        </h4>
        {editingBatchId && (
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            Editando
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={cancelEditBatch}
        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">N° Lote *</label>
        <input
          type="text"
          value={newBatch.batchNumber}
          onChange={(e) => setNewBatch(prev => ({ ...prev, batchNumber: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Número de lote"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad *</label>
        <input
          type="number"
          min={1}
          value={newBatch.quantity}
          onChange={(e) => setNewBatch(prev => ({ ...prev, quantity: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="0"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Precio Unitario Compra *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={newBatch.costPrice}
          onChange={(e) => setNewBatch(prev => ({ ...prev, costPrice: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="0.00"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Día de Adquisición</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="date"
            value={newBatch.purchaseDate}
            onChange={(e) => setNewBatch(prev => ({ ...prev, purchaseDate: e.target.value }))}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
      <div className="relative">
        <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
        <input
          type="text"
          value={newBatch.supplier}
          onChange={(e) => {
            const val = e.target.value;
            setNewBatch(prev => ({ ...prev, supplier: val }));
            setShowSupplierSuggestionsDB(true);
          }}
          onFocus={() => setShowSupplierSuggestionsDB(true)}
          onBlur={() => setTimeout(() => setShowSupplierSuggestionsDB(false), 150)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Proveedor (dejar vacío para 'Proveedor general')"
        />
        {showSupplierSuggestionsDB && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
            {newBatch.supplier.trim() === '' && (
              <div
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                onMouseDown={() => setNewBatch(prev => ({ ...prev, supplier: 'Proveedor general' }))}
              >
                Usar "Proveedor general"
              </div>
            )}
            {filterSuppliers(newBatch.supplier).map(s => (
              <div
                key={s.id}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                onMouseDown={() => setNewBatch(prev => ({ ...prev, supplier: s.name }))}
              >
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500">{s.documentType} {s.documentNumber || ''}</div>
              </div>
            ))}
            {filterSuppliers(newBatch.supplier).length === 0 && newBatch.supplier.trim() !== '' && (
              <div className="px-3 py-2 text-blue-600 hover:bg-blue-50 cursor-pointer text-sm"
                   onMouseDown={async () => {
                     const created = await quickCreateSupplier(newBatch.supplier);
                     if (created) setNewBatch(prev => ({ ...prev, supplier: created.name }));
                   }}>
                Crear proveedor "{newBatch.supplier.trim()}"
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="date"
            value={newBatch.expirationDate}
            onChange={(e) => setNewBatch(prev => ({ ...prev, expirationDate: e.target.value }))}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
    
    <div className="flex justify-end space-x-2 mt-3">
      <button
        type="button"
        onClick={cancelEditBatch}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={addBatch}
        disabled={savingBatch}
        className={`flex items-center space-x-2 text-white px-4 py-2 rounded-lg transition-colors text-sm ${
          editingBatchId 
            ? 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400' 
            : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
        }`}
      >
        <Check className="h-4 w-4" />
        <span>
          {savingBatch ? 'Guardando...' : (editingBatchId ? 'Guardar Cambios' : 'Agregar Lote')}
        </span>
      </button>
    </div>
  </div>
)}

                {/* Lista de lotes existentes */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Lotes registrados</h4>
                  {productBatches.loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Cargando lotes...</p>
                    </div>
                  ) : !productBatches.batches || productBatches.batches.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No hay lotes registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {productBatches.batches.map(batch => {
                        const costoTotalLote = batch.quantity * batch.costPrice;
                        return (
                          <div key={batch.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-2">
                                  <span className="font-medium text-gray-900">{batch.batchNumber}</span>
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                    {batch.quantity} unidades
                                  </span>
                                  {batch.expirationDate && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      new Date(batch.expirationDate) < new Date() 
                                        ? 'bg-red-100 text-red-800' 
                                        : new Date(batch.expirationDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {new Date(batch.expirationDate) < new Date() 
                                        ? 'Vencido' 
                                        : new Date(batch.expirationDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                        ? 'Por vencer'
                                        : 'Válido'
                                      }
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Precio unitario:</span>
                                    <br />S/ {batch.costPrice.toFixed(2)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Costo total lote:</span>
                                    <br />S/ {costoTotalLote.toFixed(2)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Información:</span>
                                    <br />
                                    {batch.purchaseDate && `Compra: ${new Date(batch.purchaseDate).toLocaleDateString()}`}
                                    {batch.supplier && ` - ${batch.supplier}`}
                                    {batch.expirationDate && (
                                      <>
                                        <br />
                                        Vence: {new Date(batch.expirationDate).toLocaleDateString()}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => startEditBatch(batch)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar lote"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteBatch(batch.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar lote"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Lotes para producto nuevo (locales) */
              <div className="space-y-4">
                {/* Botón para mostrar formulario de lote */}
                {!showLocalBatchForm ? (
                  <div className="text-center py-4">
                    <button
                      type="button"
                      onClick={() => setShowLocalBatchForm(true)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="font-medium">Agregar Nuevo Lote</span>
                    </button>
                  </div>
                ) : (
                  /* Formulario de lote */
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-900">
                        {editingLocalBatchId ? 'Editar Lote' : 'Nuevo Lote'}
                      </h4>
                      <button
                        type="button"
                        onClick={resetLocalBatchForm}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">N° Lote</label>
                        <input
                          type="text"
                          value={localBatchForm.batchNumber}
                          onChange={(e) => handleLocalBatchFormChange('batchNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Número de lote"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          value={localBatchForm.quantity}
                          onChange={(e) => handleLocalBatchFormChange('quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Precio Unitario Compra *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={localBatchForm.costPrice}
                          onChange={(e) => handleLocalBatchFormChange('costPrice', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Día de Adquisición</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="date"
                            value={localBatchForm.purchaseDate}
                            onChange={(e) => handleLocalBatchFormChange('purchaseDate', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
      <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
        <input
          type="text"
          value={localBatchForm.supplier}
          onChange={(e) => {
            handleLocalBatchFormChange('supplier', e.target.value);
            setShowSupplierSuggestionsLocal(true);
          }}
          onFocus={() => setShowSupplierSuggestionsLocal(true)}
          onBlur={() => setTimeout(() => setShowSupplierSuggestionsLocal(false), 150)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Proveedor (dejar vacío para 'Proveedor general')"
        />
        {showSupplierSuggestionsLocal && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
            {localBatchForm.supplier.trim() === '' && (
              <div
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                onMouseDown={() => handleLocalBatchFormChange('supplier', 'Proveedor general')}
              >
                Usar "Proveedor general"
              </div>
            )}
            {filterSuppliers(localBatchForm.supplier).map(s => (
              <div
                key={s.id}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                onMouseDown={() => handleLocalBatchFormChange('supplier', s.name)}
              >
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500">{s.documentType} {s.documentNumber || ''}</div>
              </div>
            ))}
            {filterSuppliers(localBatchForm.supplier).length === 0 && localBatchForm.supplier.trim() !== '' && (
              <div className="px-3 py-2 text-blue-600 hover:bg-blue-50 cursor-pointer text-sm"
                   onMouseDown={async () => {
                     const created = await quickCreateSupplier(localBatchForm.supplier);
                     if (created) handleLocalBatchFormChange('supplier', created.name);
                   }}>
                Crear proveedor "{localBatchForm.supplier.trim()}"
              </div>
            )}
          </div>
        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="date"
                            value={localBatchForm.expirationDate}
                            onChange={(e) => handleLocalBatchFormChange('expirationDate', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-3">
                      <button
                        type="button"
                        onClick={resetLocalBatchForm}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddLocalBatch}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <Check className="h-4 w-4" />
                        <span>{editingLocalBatchId ? 'Actualizar' : 'Agregar'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Resumen y lista de lotes */}
                {localBatches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border mb-3">
                      <div>
                        <div className="text-sm text-gray-600">Lotes agregados: <span className="font-medium">{localBatches.length}</span></div>
                        <div className="text-sm text-gray-600">Total unidades: <span className="font-medium">{totalUnidadesLocal}</span></div>
                        <div className="text-lg font-bold text-green-600">Inversión total: S/ {totalInversionLocal.toFixed(2)}</div>
                      </div>
                      {!showLocalBatchForm && (
                        <button
                          type="button"
                          onClick={() => setShowLocalBatchForm(true)}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Agregar Lote</span>
                        </button>
                      )}
                    </div>

                    {/* Lista de lotes */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Lotes agregados</h4>
                      <div className="space-y-3">
                        {localBatches.map((batch) => {
                          const costoTotalLote = batch.quantity * batch.costPrice;
                          return (
                            <div key={batch.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-4 mb-2">
                                    <span className="font-medium text-gray-900">{batch.batchNumber}</span>
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                      {batch.quantity} unidades
                                    </span>
                                    {batch.expirationDate && (
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        new Date(batch.expirationDate) < new Date() 
                                          ? 'bg-red-100 text-red-800' 
                                          : new Date(batch.expirationDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        {new Date(batch.expirationDate) < new Date() 
                                          ? 'Vencido' 
                                          : new Date(batch.expirationDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                          ? 'Por vencer'
                                          : 'Válido'
                                        }
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                                    <div>
                                      <span className="font-medium">Precio unitario:</span>
                                      <br />S/ {batch.costPrice.toFixed(2)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Costo total lote:</span>
                                      <br />S/ {costoTotalLote.toFixed(2)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Información:</span>
                                      <br />
                                      {batch.purchaseDate && `Compra: ${new Date(batch.purchaseDate).toLocaleDateString()}`}
                                      {batch.supplier && ` - ${batch.supplier}`}
                                      {batch.expirationDate && (
                                        <>
                                          <br />
                                          Vence: {new Date(batch.expirationDate).toLocaleDateString()}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditLocalBatch(batch)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar lote"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLocalBatch(batch.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar lote"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>
                {saving ? 'Guardando...' : (product ? 'Actualizar' : 'Guardar')} Producto
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de vista previa de imagen */}
      {showImagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista previa de la imagen</h3>
            <div className="flex justify-center mb-4">
              <img 
                src={formData.imageUrl} 
                alt="Vista previa" 
                className="max-h-64 max-w-full object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xOCAxNUwxMiA5TDYgMTUiIHN0cm9rZT0iIzlDQTBCMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                }}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowImagePreview(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}