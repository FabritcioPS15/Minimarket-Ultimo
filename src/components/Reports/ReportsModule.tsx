import React, { useState } from 'react';
import { SalesReports } from './SalesReports';
import { InventoryReports } from './InventoryReports';
import { ProfitAnalysis } from './ProfitAnalysis';
import { BarChart3, Package, TrendingUp, Calendar } from 'lucide-react';

export function ReportsModule() {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'profits'>('sales');

  const tabs = [
    { id: 'sales', label: 'Ventas', icon: BarChart3 },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'profits', label: 'Ganancias', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h2>
        <p className="text-gray-600">Análisis detallado del rendimiento del negocio</p>
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
        {activeTab === 'sales' && <SalesReports />}
        {activeTab === 'inventory' && <InventoryReports />}
        {activeTab === 'profits' && <ProfitAnalysis />}
      </div>
    </div>
  );
}