import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditEntry } from '../../types';
import { Clock, User, Search, Filter, Activity, ShoppingCart, Package, Users, DollarSign, LogIn, LogOut, Settings, Eye, Plus, Edit, Trash2, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { clearAuditLog, createTestAuditEntries, checkAuditLogStatus } from '../../utils/auditDebug';
import { supabase } from '../../lib/supabase';

const actionIcons = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  SALE: ShoppingCart,
  CASH_OPEN: DollarSign,
  CASH_CLOSE: DollarSign,
  PRODUCT_CREATE: Plus,
  PRODUCT_UPDATE: Edit,
  PRODUCT_DELETE: Trash2,
  USER_CREATE: Users,
  USER_UPDATE: Users,
  USER_DELETE: Users,
  SYSTEM_ACCESS: Eye,
  OTHER: Activity
};

const actionColors = {
  LOGIN: 'text-green-600 bg-green-100',
  LOGOUT: 'text-red-600 bg-red-100',
  SALE: 'text-blue-600 bg-blue-100',
  CASH_OPEN: 'text-emerald-600 bg-emerald-100',
  CASH_CLOSE: 'text-orange-600 bg-orange-100',
  PRODUCT_CREATE: 'text-purple-600 bg-purple-100',
  PRODUCT_UPDATE: 'text-yellow-600 bg-yellow-100',
  PRODUCT_DELETE: 'text-red-600 bg-red-100',
  USER_CREATE: 'text-indigo-600 bg-indigo-100',
  USER_UPDATE: 'text-indigo-600 bg-indigo-100',
  USER_DELETE: 'text-red-600 bg-red-100',
  SYSTEM_ACCESS: 'text-gray-600 bg-gray-100',
  OTHER: 'text-gray-600 bg-gray-100'
};

export const AuditLog: React.FC = () => {
  const { auditLog, state } = useApp();
  const { auditEntries, loading, error, refetch } = auditLog;
  const { currentUser } = state;
  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    let filtered = [...auditEntries];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by entity
    if (selectedEntity !== 'all') {
      filtered = filtered.filter(entry => entry.entity === selectedEntity);
    }

    // Filter by action
    if (selectedAction !== 'all') {
      filtered = filtered.filter(entry => entry.action === selectedAction);
    }

    // Filter by user
    if (selectedUser !== 'all') {
      filtered = filtered.filter(entry => entry.username === selectedUser);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(entry => new Date(entry.timestamp) >= filterDate);
      }
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredEntries(filtered);
  }, [auditEntries, searchTerm, selectedEntity, selectedAction, selectedUser, dateFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    const IconComponent = actionIcons[action as keyof typeof actionIcons] || Activity;
    return IconComponent;
  };

  const getActionColor = (action: string) => {
    return actionColors[action as keyof typeof actionColors] || 'text-gray-600 bg-gray-100';
  };

  const getEntityStats = () => {
    const stats = auditEntries.reduce((acc, entry) => {
      acc[entry.entity] = (acc[entry.entity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stats).map(([entity, count]) => ({ entity, count }));
  };

  const getUniqueUsers = () => {
    const users = Array.from(new Set(auditEntries.map(entry => entry.username).filter(Boolean)));
    return users.sort();
  };

  const handleDebugActions = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔧 Iniciando acciones de debug...');
      console.log('🔧 Usuario actual:', currentUser);
      
      // Verificar estado actual
      await checkAuditLogStatus();
      
      // Limpiar datos existentes
      await clearAuditLog();
      
      // Crear datos de prueba
      await createTestAuditEntries(currentUser.id, currentUser.username);
      
      // Recargar datos
      await refetch();
      
      alert('Datos de prueba creados. Revisa la consola para más detalles.');
    } catch (error) {
      console.error('Error en acciones de debug:', error);
      alert('Error en acciones de debug. Revisa la consola.');
    }
  };

  const handleDiagnostic = async () => {
    try {
      console.log('🔍 Iniciando diagnóstico completo...');
      console.log('🔍 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('🔍 Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Presente' : 'Faltante');
      
      // Verificar autenticación
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('🔍 Estado de autenticación:', { authData, authError });
      
      // Verificar conexión básica
      const { data: testData, error: testError } = await supabase
        .from('audit_logs')
        .select('count')
        .limit(1);
        
      console.log('🔍 Test de conexión básica:', { testData, testError });
      
      if (testError) {
        console.error('❌ Error de conexión:', testError);
        alert(`Error de conexión: ${testError.message}`);
        return;
      }
      
      // Verificar políticas RLS
      const { data: policiesData, error: policiesError } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(5);
        
      console.log('🔍 Test de políticas RLS:', { policiesData, policiesError });
      
      if (policiesError) {
        console.error('❌ Error de políticas:', policiesError);
        alert(`Error de políticas: ${policiesError.message}`);
        return;
      }
      
      // Verificar estructura de la tabla
      const { data: structureData, error: structureError } = await supabase
        .from('audit_logs')
        .select('id, user_id, username, action, entity, details, created_at')
        .limit(5);
        
      console.log('🔍 Test de estructura:', { structureData, structureError });
      
      // Verificar total de registros
      const { count, error: countError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });
        
      console.log('🔍 Total de registros:', { count, countError });
      
      alert(`Diagnóstico completado - Total de registros: ${count || 0}. Revisa la consola para más detalles`);
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      alert('Error en diagnóstico');
    }
  };

  const getTodayStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return auditEntries.filter(entry => new Date(entry.timestamp) >= today).length;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando registro de auditoría...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar auditoría</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h2>
          <p className="text-gray-600">Historial completo de actividades del sistema</p>
          <p className="text-sm text-gray-500 mt-1">
            Mostrando {filteredEntries.length} de {auditEntries.length} entradas
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Total: {auditEntries.length} registros</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Hoy: {getTodayStats()} actividades</span>
          </div>
          <button
            onClick={handleDiagnostic}
            className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            title="Diagnosticar conexión y políticas"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Diagnóstico</span>
          </button>
          <button
            onClick={handleDebugActions}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            title="Crear datos de prueba para debug"
          >
            <Database className="w-4 h-4" />
            <span>Debug</span>
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recargar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {getEntityStats().map(({ entity, count }) => (
          <div key={entity} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 capitalize">{entity}</p>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar en auditoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Entity Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las entidades</option>
            <option value="auth">Autenticación</option>
            <option value="sales">Ventas</option>
            <option value="cash_sessions">Caja</option>
            <option value="products">Productos</option>
            <option value="users">Usuarios</option>
            <option value="system">Sistema</option>
          </select>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las acciones</option>
            <option value="LOGIN">Inicios de sesión</option>
            <option value="LOGOUT">Cierres de sesión</option>
            <option value="SALE">Ventas</option>
            <option value="CASH_OPEN">Apertura de caja</option>
            <option value="CASH_CLOSE">Cierre de caja</option>
            <option value="PRODUCT_CREATE">Crear producto</option>
            <option value="PRODUCT_UPDATE">Editar producto</option>
            <option value="PRODUCT_DELETE">Eliminar producto</option>
          </select>

          {/* User Filter */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los usuarios</option>
            {getUniqueUsers().map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
        </div>
      </div>

      {/* Audit Entries */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Registros de Auditoría ({filteredEntries.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron registros con los filtros aplicados</p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const IconComponent = getActionIcon(entry.action);
              const colorClass = getActionColor(entry.action);
              
              return (
                <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {entry.details}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium">{entry.username || 'Usuario desconocido'}</span>
                        </div>
                        <span className="capitalize">{entry.entity}</span>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {entry.action}
                        </span>
                      </div>
                      
                      {entry.metadata && (
                        <div className="mt-2 text-xs text-gray-400">
                          <details className="cursor-pointer">
                            <summary>Ver detalles técnicos</summary>
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};