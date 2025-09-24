import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Users, 
  CreditCard, 
  Bell, 
  LogOut, 
  Home, 
  History, 
  Truck, 
  UserRoundCog,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Settings,
  HelpCircle
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Layout({ children, activeView, onViewChange }: LayoutProps) {
  const { state, dispatch, addAuditEntry } = useApp();
  const { currentUser, currentCashSession, alerts } = state;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Soporte para navegación global por eventos (e.g., desde CashModule)
  React.useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.view) {
        onViewChange(e.detail.view);
      }
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, [onViewChange]);

  // Al cambiar de pestaña/vista, volver al inicio de la página
  React.useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [activeView]);

  if (!currentUser) {
    return <div>{children}</div>;
  }

  const unreadAlerts = alerts.filter(alert => !alert.isRead).length;

  const handleLogout = async () => {
    // Registrar en auditoría antes del logout
    if (currentUser) {
      await addAuditEntry({
        action: 'LOGOUT',
        entity: 'auth',
        entityId: currentUser.id,
        entityName: currentUser.username,
        details: `Usuario "${currentUser.username}" cerró sesión`,
        metadata: {
          userRole: currentUser.role,
          sessionDuration: 'N/A', // Podríamos calcular esto si guardamos el login time
        },
      });
    }
    dispatch({ type: 'LOGOUT' });
  };

  const navigationItems = [
    { icon: Home, label: 'Dashboard', id: 'dashboard', roles: ['admin', 'supervisor', 'cashier'] },
    { icon: Package, label: 'Productos', id: 'products', roles: ['admin', 'supervisor'] },
    { icon: ShoppingCart, label: 'Ventas', id: 'sales', roles: ['admin', 'supervisor', 'cashier'] },
    { icon: BarChart3, label: 'Reportes', id: 'reports', roles: ['admin', 'supervisor'] },
    { icon: UserRoundCog, label: 'Usuarios', id: 'users', roles: ['admin'] },
    { icon: CreditCard, label: 'Caja', id: 'cash', roles: ['admin', 'supervisor', 'cashier'] },
    { icon: Users, label: 'Clientes', id: 'clients', roles: ['admin'] },
    { icon: Truck, label: 'Proveedores', id: 'suppliers', roles: ['admin'] },
    { icon: History, label: 'Auditoría', id: 'audit', roles: ['admin'] },
    { icon: Settings, label: 'Configuración', id: 'settings', roles: ['admin'] },
    { icon: HelpCircle, label: 'Ayuda', id: 'help', roles: ['admin', 'supervisor', 'cashier'] },
  ];

  const allowedItems = navigationItems.filter(item => 
    item.roles.includes(currentUser.role)
  );

  // Función para traducir el rol a español
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'cashier': return 'Cajero';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 bg-white shadow-lg border-r border-gray-200 min-h-screen transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg font-bold text-gray-900">Inventario</h1>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex justify-center w-full">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600"
              title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {allowedItems.map(({ icon: Icon, label, id }) => (
              <button
                key={id}
                onClick={() => {
                  onViewChange(id);
                  setMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center rounded-xl transition-all duration-200 p-3
                  ${activeView === id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                  }
                  ${sidebarCollapsed ? 'justify-center' : 'justify-start space-x-3'}
                `}
                title={sidebarCollapsed ? label : ''}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">{label}</span>}
              </button>
            ))}
          </nav>

          {/* User Section */}
          <div className={`
            border-t border-gray-200 p-4
            ${sidebarCollapsed ? 'flex flex-col items-center' : 'space-y-3'}
          `}>
            {/* User Info */}
            <div className={`
              flex items-center
              ${sidebarCollapsed ? 'flex-col space-y-2' : 'space-x-3'}
            `}>
              <div className={`
                rounded-full bg-blue-100 flex items-center justify-center
                ${sidebarCollapsed ? 'h-10 w-10' : 'h-10 w-10'}
              `}>
                <span className="text-blue-600 font-semibold">
                  {currentUser.username.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentUser.username}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {getRoleLabel(currentUser.role)}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`
              flex items-center
              ${sidebarCollapsed ? 'flex-col space-y-2 pt-2' : 'justify-between pt-3'}
            `}>
              <button
                onClick={handleLogout}
                className={`
                  flex items-center rounded-lg p-2 transition-colors
                  ${sidebarCollapsed 
                    ? 'text-gray-600 hover:text-red-600 hover:bg-red-50 justify-center' 
                    : 'text-gray-700 hover:text-red-700 hover:bg-red-50 space-x-2 flex-1'
                  }
                `}
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
                {!sidebarCollapsed && <span className="text-sm">Cerrar sesión</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0 min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                {sidebarCollapsed && (
                  <div className="hidden lg:flex items-center space-x-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Sistema de Inventario</h1>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Cash Session Status */}
                {currentCashSession && (
                  <div className="hidden sm:flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Caja Abierta</span>
                  </div>
                )}
                
                {/* Alerts */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 relative"
                    title="Notificaciones"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadAlerts > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadAlerts}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="flex items-center justify-between px-3 py-2 border-b">
                        <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          Cerrar
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {alerts.length === 0 && (
                          <div className="p-4 text-sm text-gray-500">Sin notificaciones</div>
                        )}
                        {alerts
                          .slice()
                          .sort((a, b) => Number(a.isRead) - Number(b.isRead))
                          .map((a) => (
                            <div
                              key={a.id}
                              className={`px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${a.isRead ? '' : 'bg-blue-50'}`}
                              onClick={() => {
                                // Notificar filtro sugerido según tipo de alerta
                                try {
                                  if ((a as any).type === 'expiration') {
                                    window.dispatchEvent(new CustomEvent('products-apply-filter', { detail: { expiration: 'expiring', batchNumber: (a as any).metadata?.batchNumber, productId: (a as any).productId } }));
                                  } else if ((a as any).type === 'low_stock') {
                                    window.dispatchEvent(new CustomEvent('products-apply-filter', { detail: { stock: 'low', productId: (a as any).productId } }));
                                  } else if ((a as any).type === 'over_stock') {
                                    window.dispatchEvent(new CustomEvent('products-apply-filter', { detail: { stock: 'high', productId: (a as any).productId } }));
                                  }
                                } catch {}
                                // Navegar a productos y cerrar panel
                                onViewChange('products');
                                setShowNotifications(false);
                                // Marcar como leído
                                dispatch({ type: 'MARK_ALERT_READ', payload: a.id });
                              }}
                              title="Ir a productos"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-2">
                                  <div className="text-sm font-medium text-gray-900">
                                    {a.type === 'expiration' ? 'Vencimiento de lote' : a.type === 'low_stock' ? 'Stock bajo' : a.type === 'over_stock' ? 'Sobre stock' : 'Alerta'}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    {a.message}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString('es-PE')}</div>
                                </div>
                                {!a.isRead && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px]">Nuevo</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                      <div className="px-3 py-2 border-t flex items-center justify-between">
                        <button
                          onClick={() => {
                            alerts.forEach(a => {
                              if (!a.isRead) dispatch({ type: 'MARK_ALERT_READ', payload: a.id });
                            });
                          }}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Marcar todo como leído
                        </button>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setShowNotifications(false);
                              onViewChange('notifications');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Ver todos
                          </button>
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info (visible on larger screens) */}
                <div className="hidden md:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{currentUser.username}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {getRoleLabel(currentUser.role)}
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-100 h-10 w-10 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}