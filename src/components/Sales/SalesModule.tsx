import React, { useState } from 'react';
import { PointOfSale } from './PointOfSale';
import { SalesList } from './SalesList';
import { ShoppingCart, List} from 'lucide-react';

export function SalesModule() {
  const [activeTab, setActiveTab] = useState<'pos' | 'list'>('pos');

  const tabs = [
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'list', label: 'Lista de Ventas', icon: List },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Módulo de Ventas</h2>
        <p className="text-gray-600">Gestiona las ventas y transacciones</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'pos' && (
          <div>
            <PointOfSale />
            <div className="mt-4 flex space-x-2">

            </div>
          </div>
        )}
        {activeTab === 'list' && <SalesList />}
      </div>
    </div>
  );
}