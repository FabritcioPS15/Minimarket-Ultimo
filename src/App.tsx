import React from 'react';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/Products/ProductList';
import { SalesModule } from './components/Sales/SalesModule';
import { ReportsModule } from './components/Reports/ReportsModule';
import { UsersModule } from './components/Users/UsersModule';
import { CashModule } from './components/Cash/CashModule';
import { AuditLog } from './components/Audit/AuditLog';
import { useApp } from './context/AppContext';
import { ClientsPage } from './components/Clients/ClientsPage';
import { SuppliersPage } from './components/Suppliers/SuppliersPage'; // Agregar esta importación
import { Settings } from './components/Settings';
import { Help } from './components/Help';
import { Toast } from './components/Toast';
import { Notifications } from './components/Notifications';

function MainApp() {
  const { state } = useApp();
  const { currentUser } = state;
  const [activeView, setActiveView] = React.useState<string>('dashboard');

  if (!currentUser) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductList />;
      case 'sales':
        return <SalesModule />;
      case 'reports':
        return <ReportsModule />;
      case 'users':
        return <UsersModule />;
      case 'cash':
        return <CashModule />;
      case 'audit':
        return <AuditLog />;
      case 'settings':
        return <Settings />;
      case 'clients':
        return <ClientsPage />; // Corregido: usar return directamente
      case 'suppliers':
        return <SuppliersPage />; // Corregido: usar return directamente
      case 'notifications':
        return <Notifications />;
      case 'help':
        return <Help />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <MainApp />
      <Toast />
    </AppProvider>
  );
}

export default App;