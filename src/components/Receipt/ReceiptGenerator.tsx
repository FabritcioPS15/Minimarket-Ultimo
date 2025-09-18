import React from 'react';
import { Sale, Product } from '../../types';

interface ReceiptGeneratorProps {
  sale: Sale;
  products: Product[];
  businessInfo?: {
    name: string;
    address: string;
    phone: string;
    ruc?: string;
  };
}

export function ReceiptGenerator({ sale, products, businessInfo }: ReceiptGeneratorProps) {
  const generatePDFReceipt = () => {
    // This would use a PDF library like jsPDF or react-pdf
    // For now, we'll create a print-friendly version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHTML = generateReceiptHTML();
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const generateThermalReceipt = () => {
    // This would connect to a thermal printer API
    // For now, we'll show the thermal format
    const thermalHTML = generateThermalHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(thermalHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const generateReceiptHTML = () => {
    const business = businessInfo || {
      name: 'Mi Negocio',
      address: 'Dirección del negocio',
      phone: 'Teléfono: (01) 123-4567',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Boleta de Venta - ${sale.saleNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .business-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .business-info { font-size: 14px; }
          .receipt-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .customer-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; }
          .total-row { font-weight: bold; font-size: 16px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">${business.name}</div>
          <div class="business-info">
            ${business.address}<br>
            ${business.phone}
            ${business.ruc ? `<br>RUC: ${business.ruc}` : ''}
          </div>
        </div>

        <div class="receipt-info">
          <div>
            <strong>BOLETA DE VENTA</strong><br>
            N° ${sale.saleNumber}
          </div>
          <div>
            <strong>Fecha:</strong> ${new Date(sale.createdAt).toLocaleDateString('es-ES')}<br>
            <strong>Hora:</strong> ${new Date(sale.createdAt).toLocaleTimeString('es-ES')}
          </div>
        </div>

        ${sale.customerName || sale.customerDocument ? `
        <div class="customer-info">
          <strong>DATOS DEL CLIENTE</strong><br>
          ${sale.customerName ? `Nombre: ${sale.customerName}<br>` : ''}
          ${sale.customerDocument ? `Documento: ${sale.customerDocument}` : ''}
        </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>P. Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">S/ ${item.unitPrice.toFixed(2)}</td>
                <td class="text-right">S/ ${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <table style="margin-left: auto; width: 300px;">
            <tr>
              <td><strong>Sub Total:</strong></td>
              <td class="text-right"><strong>S/ ${sale.subtotal.toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td><strong>IGV (18%):</strong></td>
              <td class="text-right"><strong>S/ ${sale.tax.toFixed(2)}</strong></td>
            </tr>
            <tr class="total-row">
              <td><strong>TOTAL:</strong></td>
              <td class="text-right"><strong>S/ ${sale.total.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 20px;">
          <strong>Método de Pago:</strong> ${sale.paymentMethod.toUpperCase()}
          ${sale.operationNumber ? `<br><strong>N° Operación:</strong> ${sale.operationNumber}` : ''}
        </div>

        <div class="footer">
          <p>¡Gracias por su compra!</p>
          <p>Sistema de Inventario - ${new Date().getFullYear()}</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Imprimir
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            Cerrar
          </button>
        </div>
      </body>
      </html>
    `;
  };

  const generateThermalHTML = () => {
    const business = businessInfo || {
      name: 'Mi Negocio',
      address: 'Dirección del negocio',
      phone: 'Tel: (01) 123-4567',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket Térmico - ${sale.saleNumber}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            width: 300px; 
            margin: 0 auto; 
            padding: 10px;
            line-height: 1.2;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .separator { border-bottom: 1px dashed #000; margin: 5px 0; }
          .item-row { display: flex; justify-content: space-between; }
          .no-margin { margin: 0; }
          @media print {
            body { padding: 0; width: 80mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold" style="font-size: 14px;">${business.name}</div>
          <div>${business.address}</div>
          <div>${business.phone}</div>
          ${business.ruc ? `<div>RUC: ${business.ruc}</div>` : ''}
        </div>
        
        <div class="separator"></div>
        
        <div class="center bold">BOLETA DE VENTA</div>
        <div class="center">${sale.saleNumber}</div>
        
        <div class="separator"></div>
        
        <div>
          Fecha: ${new Date(sale.createdAt).toLocaleDateString('es-ES')}<br>
          Hora: ${new Date(sale.createdAt).toLocaleTimeString('es-ES')}
        </div>
        
        ${sale.customerName || sale.customerDocument ? `
        <div class="separator"></div>
        <div>
          ${sale.customerName ? `Cliente: ${sale.customerName}<br>` : ''}
          ${sale.customerDocument ? `Doc: ${sale.customerDocument}` : ''}
        </div>
        ` : ''}
        
        <div class="separator"></div>
        
        ${sale.items.map(item => `
          <div>
            <div class="bold">${item.productName}</div>
            <div class="item-row">
              <span>${item.quantity} x S/ ${item.unitPrice.toFixed(2)}</span>
              <span>S/ ${item.total.toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
        
        <div class="separator"></div>
        
        <div class="item-row">
          <span>SUBTOTAL:</span>
          <span>S/ ${sale.subtotal.toFixed(2)}</span>
        </div>
        <div class="item-row">
          <span>IGV (18%):</span>
          <span>S/ ${sale.tax.toFixed(2)}</span>
        </div>
        <div class="item-row bold" style="font-size: 14px;">
          <span>TOTAL:</span>
          <span>S/ ${sale.total.toFixed(2)}</span>
        </div>
        
        <div class="separator"></div>
        
        <div>
          Pago: ${sale.paymentMethod.toUpperCase()}
          ${sale.operationNumber ? `<br>Op: ${sale.operationNumber}` : ''}
        </div>
        
        <div class="separator"></div>
        <div class="center">¡Gracias por su compra!</div>
        <div class="center" style="font-size: 10px;">Sistema de Inventario</div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 5px 10px; font-size: 12px;">Imprimir</button>
          <button onclick="window.close()" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;">Cerrar</button>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="flex space-x-4">
      <button
        onClick={generatePDFReceipt}
        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <span>📄</span>
        <span>Boleta PDF</span>
      </button>
      
      <button
        onClick={generateThermalReceipt}
        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        <span>🖨️</span>
        <span>Ticket Térmico</span>
      </button>
    </div>
  );
}