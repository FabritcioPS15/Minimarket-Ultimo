import React, { forwardRef } from 'react';

export const PrintableInvoice = forwardRef(function PrintableInvoice(
  { sale, type }: { sale: any, type: 'boleta' | 'factura' },
  ref: React.Ref<HTMLDivElement>
) {
  if (!sale) return null;

  // Función para normalizar items (igual que en SalesList)
  const normalizeSaleItems = (items: any[]) => {
    return items.map(item => ({
      id: item.id || Math.random().toString(36).substr(2, 9),
      productId: item.productId || item.id || '',
      productName: item.productName || item.name || 'Producto sin nombre',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.price || 0,
      total: item.total || (item.quantity || 1) * (item.unitPrice || item.price || 0)
    }));
  };

  const normalizedItems = normalizeSaleItems(sale.items || []);

  const baseStyle = {
    width: '100%',
    maxWidth: '360px',
    fontFamily: "Arial, Helvetica, sans-serif",
    background: '#fff',
    color: '#222',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    margin: '0 auto',
    fontSize: '14px',
    lineHeight: '1.4'
  };

  const boletaStyle = {
    borderTop: '4px solid #43A047',
    headerColor: '#1B5E20',
    accentColor: '#43A047'
  };

  const facturaStyle = {
    borderTop: '4px solid #1565C0',
    headerColor: '#0D47A1',
    accentColor: '#1565C0'
  };

  const docStyle = type === 'factura' ? facturaStyle : boletaStyle;

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

  return (
    <div ref={ref} style={baseStyle}>
      {/* Encabezado empresa */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '16px', 
        padding: '12px',
        borderRadius: '6px',
        border: `1px solid ${docStyle.accentColor}40`
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px', color: docStyle.headerColor }}>
          Minimarket Karito
        </div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
          RUC: 12345678901<br />
          Jr. Ejemplo 123, Lima<br />
          Tel: 958-077-827
        </div>
      </div>

      {/* Tipo de documento */}
      <div style={{ 
        textAlign: 'center', 
        fontWeight: 'bold', 
        fontSize: '16px', 
        padding: '8px 0',
        color: docStyle.headerColor,
        borderTop: `2px dashed ${docStyle.accentColor}40`,
        borderBottom: `2px dashed ${docStyle.accentColor}40`,
        marginBottom: '14px'
      }}>
        {type === 'factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA'}
      </div>

      {/* Datos de la venta */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold' }}>Fecha:</span>
          <span>{new Date(sale.createdAt).toLocaleString('es-PE')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold' }}>N°:</span>
          <span>{sale.saleNumber}</span>
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold' }}>Cliente:</span> {sale.customerName || 'Consumidor Final'}
        </div>
        {sale.customerDocument && (
          <div>
            <span style={{ fontWeight: 'bold' }}>Documento:</span> {sale.customerDocument}
          </div>
        )}
      </div>

      {/* Detalle productos */}
      <div style={{ marginBottom: '14px', overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse'
        }}>
          <thead>
            <tr style={{ background: `${docStyle.accentColor}10` }}>
              <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '12px' }}>Producto</th>
              <th style={{ textAlign: 'center', padding: '6px 4px', width: '15%', fontSize: '12px' }}>Cant</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', width: '20%', fontSize: '12px' }}>Precio</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', width: '25%', fontSize: '12px' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {normalizedItems.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 4px', fontSize: '12px' }}>{item.productName}</td>
                <td style={{ textAlign: 'center', padding: '6px 4px', fontSize: '12px' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '6px 4px', fontSize: '12px' }}>S/ {(item.unitPrice ?? 0).toFixed(2)}</td>
                <td style={{ textAlign: 'right', padding: '6px 4px', fontSize: '12px' }}>S/ {((item.unitPrice ?? 0) * (item.quantity ?? 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div style={{ 
        padding: '8px 0',
        borderTop: `2px dashed ${docStyle.accentColor}40`,
        borderBottom: `2px dashed ${docStyle.accentColor}40`,
        marginBottom: '14px'
      }}>
        <div style={{ 
          textAlign: 'right', 
          fontWeight: 'bold',
          color: docStyle.headerColor
        }}>
          Total: S/ {(sale.total ?? 0).toFixed(2)}
        </div>
      </div>

      {/* Pago */}
      <div style={{ marginBottom: '14px', fontSize: '12px' }}>
        <div><strong>Método de pago:</strong> {formatPaymentMethod(sale.paymentMethod)}</div>
        {sale.operationNumber && (
          <div style={{ marginTop: '4px' }}>
            <strong>N° Operación:</strong> {sale.operationNumber}
          </div>
        )}
      </div>

      {/* Pie de página */}
      <div style={{ 
        textAlign: 'center', 
        color: '#666',
        padding: '8px',
        borderTop: `2px dashed ${docStyle.accentColor}40`,
        fontSize: '11px'
      }}>
        <div style={{ marginBottom: '4px' }}>Gracias por su compra</div>
        <div style={{ fontStyle: 'italic', fontSize: '10px' }}>
          {type === 'factura' 
            ? 'Este documento es representación impresa de la factura electrónica.' 
            : 'Este documento es representación impresa de la boleta electrónica.'}
        </div>
      </div>
    </div>
  );
});