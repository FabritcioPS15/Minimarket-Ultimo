import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditEntry } from '../../types';
import { Clock, User, Search, Filter, Activity, ShoppingCart, Users, DollarSign, LogIn, LogOut, Eye, Plus, Edit, Trash2, AlertCircle, RefreshCw, Database, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isMobileView, setIsMobileView] = useState(false);
  const [isTabletView, setIsTabletView] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Detectar cambio de tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobileView(width < 768);
      setIsTabletView(width >= 768 && width < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    let filtered = [...auditEntries];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.action.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (isMobileView) {
      return date.toLocaleString('es-PE', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (isTabletView) {
      return date.toLocaleString('es-PE', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
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

  const getEntityStats = (): { entity: string; count: number }[] => {
    const stats = auditEntries.reduce<Record<string, number>>((acc, entry: AuditEntry) => {
      acc[entry.entity] = (acc[entry.entity] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats).map(([entity, count]) => ({ entity, count }));
  };

  const getUniqueUsers = (): string[] => {
    const users = Array.from(new Set(
      auditEntries.map((entry: AuditEntry) => entry.username).filter((u): u is string => Boolean(u))
    ));
    return users.sort((a, b) => a.localeCompare(b));
  };

  const handleDebugActions = async () => {
    if (!currentUser) return;
    
    try {
      // Debug silenciado en producción
      
      await checkAuditLogStatus();
      await clearAuditLog();
      await createTestAuditEntries(currentUser.id, currentUser.username);
      await refetch();
      
      alert('Datos de prueba creados. Revisa la consola para más detalles.');
    } catch (error) {
      // Mantener logs mínimos solo en error si fuera necesario
      alert('Error en acciones de debug. Revisa la consola.');
    }
  };

  const handleDiagnostic = async () => {
    try {
      await supabase.auth.getUser();
      
      const { error: testError } = await supabase
        .from('audit_logs')
        .select('count')
        .limit(1);
      
      if (testError) {
        alert(`Error de conexión: ${testError.message}`);
        return;
      }
      
      alert(`Diagnóstico completado. Revisa la consola para más detalles`);
    } catch (error) {
      alert('Error en diagnóstico');
    }
  };

  const getTodayStats = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return auditEntries.filter((entry: AuditEntry) => new Date(entry.timestamp) >= today).length;
  };

  // Componente para tarjeta móvil
  const MobileAuditCard = ({ entry }: { entry: AuditEntry }) => {
    const IconComponent = getActionIcon(entry.action);
    const colorClass = getActionColor(entry.action);
    const isExpanded = expandedEntry === entry.id;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`p-1.5 rounded-lg ${colorClass} flex-shrink-0`}>
              <IconComponent className="w-3 h-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {entry.details}
              </p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                  {entry.action.replace('_', ' ').toLowerCase()}
                </span>
                <span className="text-xs text-gray-500 capitalize truncate max-w-[80px]">
                  {entry.entity}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded ml-1 flex-shrink-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1 truncate flex-1 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{entry.username || 'Usuario desconocido'}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Clock className="w-3 h-3" />
            <span className="whitespace-nowrap">{formatDate(entry.timestamp)}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {entry.metadata && (
              <div className="text-xs">
                <div className="font-medium text-gray-700 mb-2">Detalles técnicos</div>
                <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Componente para tarjeta tablet
  const TabletAuditCard = ({ entry }: { entry: AuditEntry }) => {
    const IconComponent = getActionIcon(entry.action);
    const colorClass = getActionColor(entry.action);
    const isExpanded = expandedEntry === entry.id;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0 mt-0.5`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1 truncate">
                {entry.details}
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize">
                  {entry.action.replace('_', ' ').toLowerCase()}
                </span>
                <span className="text-xs text-gray-500 capitalize">
                  {entry.entity}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[100px]">{entry.username || 'Usuario desconocido'}</span>
                </div>
              </div>
              
              {isExpanded && entry.metadata && (
                <div className="mt-2 text-xs">
                  <pre className="p-2 bg-gray-50 rounded overflow-x-auto max-h-32 overflow-y-auto">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
              <Clock className="w-3 h-3" />
              <span>{formatDate(entry.timestamp)}</span>
            </div>
            <button 
              onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap"
            >
              {isExpanded ? 'Menos detalles' : 'Más detalles'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Vista Desktop mejorada
  const DesktopAuditRow = ({ entry }: { entry: AuditEntry }) => {
    const IconComponent = getActionIcon(entry.action);
    const colorClass = getActionColor(entry.action);
    const isExpanded = expandedEntry === entry.id;

    return (
      <>
        <div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 lg:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
        >
          {/* Icono y Acción */}
          <div className="lg:col-span-2 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-900 capitalize hidden lg:block">
              {entry.action.replace('_', ' ').toLowerCase()}
            </span>
          </div>

          {/* Detalles */}
          <div className="lg:col-span-4 min-w-0">
            <p className="text-sm text-gray-900 font-medium truncate">
              {entry.details}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className="capitalize bg-gray-100 px-2 py-1 rounded">
                {entry.entity}
              </span>
            </div>
          </div>

          {/* Usuario */}
          <div className="lg:col-span-2 flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{entry.username || 'Usuario desconocido'}</span>
          </div>

          {/* Fecha */}
          <div className="lg:col-span-2 flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{formatDate(entry.timestamp)}</span>
          </div>

          {/* Acciones */}
          <div className="lg:col-span-2 flex items-center justify-end">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setExpandedEntry(isExpanded ? null : entry.id);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Ocultar
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Detalles
                </>
              )}
            </button>
          </div>
        </div>

        {/* Detalles expandidos */}
        {isExpanded && entry.metadata && (
          <div className="px-4 lg:px-6 pb-4 lg:pb-6 bg-gray-50 border-t">
            <div className="text-sm font-medium text-gray-700 mb-2">Detalles técnicos</div>
            <pre className="text-xs p-3 bg-white rounded border overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando registro de auditoría...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
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
    <div className="space-y-4 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Auditoría del Sistema</h2>
          <p className="text-gray-600 text-sm sm:text-base mt-1">Historial completo de actividades del sistema</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Mostrando {filteredEntries.length} de {auditEntries.length} entradas
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              <span>Total: {auditEntries.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Hoy: {getTodayStats()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={handleDiagnostic}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs sm:text-sm w-full sm:w-auto"
              title="Diagnosticar conexión y políticas"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Diagnóstico</span>
            </button>
            <button
              onClick={handleDebugActions}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs sm:text-sm w-full sm:w-auto"
              title="Crear datos de prueba para debug"
            >
              <Database className="w-4 h-4" />
              <span>Debug</span>
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm w-full sm:w-auto"
              title="Recargar datos"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {getEntityStats().slice(0, 4).map(({ entity, count }) => (
          <div key={entity} className="bg-white p-3 sm:p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 capitalize truncate">
                  {entity.replace('_', ' ')}
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{count}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow border border-gray-200">
        {/* Barra de búsqueda y botón de filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3 sm:mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar en auditoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          {(isMobileView || isTabletView) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros {showFilters ? '▲' : '▼'}</span>
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className={`
          ${isMobileView || isTabletView ? (showFilters ? 'grid' : 'hidden') : 'grid'}
          grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3
        `}>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">Todas las entidades</option>
            <option value="auth">Autenticación</option>
            <option value="sales">Ventas</option>
            <option value="cash_sessions">Caja</option>
            <option value="products">Productos</option>
            <option value="users">Usuarios</option>
            <option value="system">Sistema</option>
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">Todos los usuarios</option>
            {getUniqueUsers().map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
        </div>

        {/* Botones para limpiar filtros */}
        {(searchTerm || selectedEntity !== 'all' || selectedAction !== 'all' || selectedUser !== 'all' || dateFilter !== 'all') && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedEntity('all');
                setSelectedAction('all');
                setSelectedUser('all');
                setDateFilter('all');
              }}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* Entradas de Auditoría */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Registros de Auditoría ({filteredEntries.length})
            </h3>
            {filteredEntries.length > 0 && (
              <div className="text-sm text-gray-500">
                Ordenado por más reciente primero
              </div>
            )}
          </div>
        </div>
        
        {/* Vista Móvil */}
        {isMobileView && (
          <div className="p-3">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No se encontraron registros con los filtros aplicados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <MobileAuditCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Vista Tablet */}
        {isTabletView && (
          <div className="p-4">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No se encontraron registros con los filtros aplicados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <TabletAuditCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Vista Desktop */}
        {!isMobileView && !isTabletView && (
          <div className="divide-y divide-gray-200">
            {/* Header de la tabla en desktop */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Acción</div>
              <div className="col-span-4">Detalles</div>
              <div className="col-span-2">Usuario</div>
              <div className="col-span-2">Fecha y Hora</div>
              <div className="col-span-2 text-right">Acciones</div>
            </div>
            
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No se encontraron registros con los filtros aplicados</p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <DesktopAuditRow key={entry.id} entry={entry} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};