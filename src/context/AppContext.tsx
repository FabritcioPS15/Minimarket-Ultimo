// src/context/AppContext.tsx
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Sale, User, KardexEntry, CashSession, Alert, AuditEntry } from '../types';
import { useProducts } from '../hooks/useProducts';
import { useBatchAlerts } from '../hooks/useBatchAlerts';
import { useUsers } from '../hooks/useUsers';
import { useSales } from '../hooks/useSales';
import { useClients } from '../hooks/useClients';
import { useAuditLog } from '../hooks/useAuditLog';

interface AppState {
  kardexEntries: KardexEntry[];
  cashSessions: CashSession[];
  alerts: Alert[];
  auditEntries: AuditEntry[];   // 👈 agregado
  currentUser: User | null;
  currentCashSession: CashSession | null;
  settings?: {
    locale: string;
    currency: string;
    fontScale: number; // 1 = normal
  };
}

type AppAction =
  | { type: 'ADD_KARDEX_ENTRY'; payload: KardexEntry }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'START_CASH_SESSION'; payload: CashSession }
  | { type: 'END_CASH_SESSION' }
  | { type: 'ADD_CASH_SESSION_HISTORY'; payload: CashSession }
  | { type: 'ADD_AUDIT_ENTRY'; payload: AuditEntry }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'MARK_ALERT_READ'; payload: string }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> };

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'userId' | 'username'>) => void;
  auditLog: {
    auditEntries: AuditEntry[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
  };
  products: {
    data: any[];
    loading: boolean;
    error: string | null;
    addProduct: (product: any) => Promise<any>;
    updateProduct: (product: any) => Promise<any>;
    deleteProduct: (id: string) => Promise<void>;
    activateProduct: (id: string) => Promise<boolean>;
    refetch: () => Promise<void>;
  };
  users: {
    data: User[];
    loading: boolean;
    error: string | null;
    addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    findUserByUsername: (username: string) => Promise<User | null>;
    refetch: () => Promise<void>;
  };
  sales: {
    data: Sale[];
    loading: boolean;
    error: string | null;
    addSale: (sale: Omit<Sale, 'id'>) => Promise<any>;
    // opcional si está disponible
    // @ts-ignore
    addSaleWithBatchConsumption?: (sale: Omit<Sale, 'id'>) => Promise<any>;
    updateSale: (sale: Sale) => Promise<void>;
    deleteSale: (id: string) => Promise<void>;
    getSalesByDateRange: (startDate: string, endDate: string) => Promise<Sale[]>;
    getSalesStats: () => Promise<any>;
    refetch: () => Promise<void>;
  };
  clients: {
    data: any[];
    loading: boolean;
    error: string | null;
    addClient: (client: any) => Promise<any>;
    updateClient: (client: any) => Promise<any>;
    deleteClient: (id: string) => Promise<void>;
    findClientByDocument: (documentNumber: string) => Promise<any>;
    getAllClients: () => Promise<any[]>;
    refetch: () => Promise<void>;
  };
  // Exponer helper para generar alertas desde secciones
  pushAlert?: (alert: Alert) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const initialState: AppState = {
  kardexEntries: [],
  cashSessions: [],
  alerts: [],
  auditEntries: [],   // 👈 inicializado vacío
  currentUser: null,
  currentCashSession: null,
  settings: {
    locale: (localStorage.getItem('app_locale') || 'es-PE'),
    currency: (localStorage.getItem('app_currency') || 'PEN'),
    fontScale: Number(localStorage.getItem('app_font_scale') || 1),
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_KARDEX_ENTRY':
      return { ...state, kardexEntries: [...state.kardexEntries, action.payload] };
    
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    
    case 'LOGOUT':
      return { ...state, currentUser: null, currentCashSession: null };
    
    case 'START_CASH_SESSION':
      return { 
        ...state, 
        currentCashSession: action.payload, 
        cashSessions: [...state.cashSessions, action.payload] 
      };
    
    case 'END_CASH_SESSION':
      const updatedSession = state.currentCashSession ? {
        ...state.currentCashSession,
        endTime: new Date().toISOString(),
        status: 'closed' as const,
      } : null;
      
      return {
        ...state,
        currentCashSession: null,
        cashSessions: updatedSession ? 
          state.cashSessions.map(s => s.id === updatedSession.id ? updatedSession : s) :
          state.cashSessions,
      };
    
    case 'ADD_CASH_SESSION_HISTORY':
      return {
        ...state,
        cashSessions: state.cashSessions.map(s => 
          s.id === action.payload.id ? action.payload : s
        ),
      };
    
    case 'ADD_ALERT':
      return { ...state, alerts: [...state.alerts, action.payload] };
    
    case 'MARK_ALERT_READ':
      return {
        ...state,
        alerts: state.alerts.map(a => a.id === action.payload ? { ...a, isRead: true } : a),
      };
    
    case 'LOAD_DATA':
      return { ...state, ...action.payload };

    case 'ADD_AUDIT_ENTRY':
      return { ...state, auditEntries: [...state.auditEntries, action.payload] };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings!,
          ...action.payload,
        },
      };
    
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const productsHook = useProducts();
  const usersHook = useUsers();
  const salesHook = useSales();
  const clientsHook = useClients();
  const batchAlertsHook = useBatchAlerts();
  const auditLogHook = useAuditLog();

  // Debug: Log específico para auditLog (solo cuando cambia)
  // console.log('🔍 AppProvider - AuditLog Hook:', {
  //   auditEntries: auditLogHook.auditEntries?.length || 0,
  //   loading: auditLogHook.loading,
  //   error: auditLogHook.error
  // });

  // 👉 función para registrar eventos de auditoría
  const addAuditEntry = async (
    entry: Omit<AuditEntry, 'id' | 'timestamp' | 'userId' | 'username'>
  ) => {
    if (!state.currentUser) {
      console.warn('⚠️ No hay usuario actual para registrar auditoría');
      return;
    }
    
    const auditEntry: Omit<AuditEntry, 'id' | 'timestamp'> = {
      userId: state.currentUser.id,
      username: state.currentUser.username,
      ...entry,
    };

    console.log('📝 Creando entrada de auditoría:', auditEntry);

    try {
      // Guardar en la base de datos
      await auditLogHook.addAuditEntry(auditEntry);
      
      // También agregar al estado local para actualización inmediata
      const localEntry: AuditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...auditEntry,
      };
      dispatch({ type: 'ADD_AUDIT_ENTRY', payload: localEntry });
    } catch (error) {
      console.error('Error saving audit entry:', error);
      // Fallback: solo agregar al estado local
      const localEntry: AuditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...auditEntry,
      };
      dispatch({ type: 'ADD_AUDIT_ENTRY', payload: localEntry });
    }
  };

  // Push alert helper
  const pushAlert = (alert: Alert) => {
    dispatch({ type: 'ADD_ALERT', payload: alert });
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('inventorySystem');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Solo cargar datos que no vienen de la base de datos
        dispatch({ type: 'LOAD_DATA', payload: {
          kardexEntries: parsedData.kardexEntries || [],
          cashSessions: parsedData.cashSessions || [],
          alerts: parsedData.alerts || [],
          // auditEntries ahora viene de la base de datos, no del localStorage
        }});
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    }
  }, []);

  // Sincronizar entradas de auditoría desde la base de datos
  useEffect(() => {
    if (auditLogHook.auditEntries.length > 0) {
      dispatch({ type: 'LOAD_DATA', payload: {
        auditEntries: auditLogHook.auditEntries,
      }});
    }
  }, [auditLogHook.auditEntries]);

  // Save data to localStorage on state changes
  useEffect(() => {
    const dataToSave = {
      kardexEntries: state.kardexEntries,
      cashSessions: state.cashSessions,
      alerts: state.alerts,
      // auditEntries ya no se guarda en localStorage, viene de la base de datos
    };
    
    try {
      localStorage.setItem('inventorySystem', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  }, [state.kardexEntries, state.cashSessions, state.alerts]);

  // Persist settings and apply font scale
  useEffect(() => {
    if (state.settings) {
      try {
        localStorage.setItem('app_locale', state.settings.locale);
        localStorage.setItem('app_currency', state.settings.currency);
        localStorage.setItem('app_font_scale', String(state.settings.fontScale));
        document.documentElement.style.setProperty('--app-font-scale', String(state.settings.fontScale));
        document.documentElement.style.fontSize = `${state.settings.fontScale * 16}px`;
      } catch {}
    }
  }, [state.settings]);

  // Restaurar sesión de caja activa al cambiar de usuario (persistencia real)
  useEffect(() => {
    const loadActiveCashSession = async () => {
      try {
        const { data, error } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('status', 'active')
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return;
        if (data) {
          const session = {
            id: data.id,
            userId: data.user_id,
            startAmount: data.start_amount,
            currentAmount: data.current_amount,
            totalSales: data.total_sales,
            startTime: data.start_time,
            endTime: data.end_time || undefined,
            status: data.status,
          } as any;
          if (!state.currentCashSession || state.currentCashSession.id !== session.id) {
            dispatch({ type: 'START_CASH_SESSION', payload: session });
          }
        }
      } catch {}
    };

    if (state.currentUser) {
      loadActiveCashSession();
    }
  }, [state.currentUser]);

  // Sincronizar alertas importantes (vencimientos y stock) cada 10 minutos y al cargar
  useEffect(() => {
    let cancelled = false;
    const syncAlerts = async () => {
      try {
        // Lotes: por vencer y vencidos
        await batchAlertsHook.refetch();
        const expiring = batchAlertsHook.expiringBatches || [];
        const expired = batchAlertsHook.expiredBatches || [];

        const nowIso = new Date().toISOString();
        expiring.forEach((b: any) => {
          const id = `exp:${b.productId}:${b.batchNumber}`;
          if (!state.alerts.some(a => a.id === id)) {
            pushAlert({
              id,
              type: 'expiration',
              productId: b.productId,
              productName: b.productName,
              message: `${b.productName}${b.productCode ? ` (${b.productCode})` : ''} — ${b.batchNumber} por vencer en ${b.daysUntilExpiry} día(s)`,
              severity: 'medium',
              isRead: false,
              createdAt: nowIso,
              metadata: { batchNumber: b.batchNumber }
            } as any);
          }
        });
        expired.forEach((b: any) => {
          const id = `expd:${b.productId}:${b.batchNumber}`;
          if (!state.alerts.some(a => a.id === id)) {
            pushAlert({
              id,
              type: 'expiration',
              productId: b.productId,
              productName: b.productName,
              message: `${b.productName}${b.productCode ? ` (${b.productCode})` : ''} — ${b.batchNumber} vencido hace ${b.daysExpired} día(s)`,
              severity: 'high',
              isRead: false,
              createdAt: nowIso,
              metadata: { batchNumber: b.batchNumber }
            } as any);
          }
        });

        // Stock bajo por producto
        const lowStock = await batchAlertsHook.getLowStockAlerts();
        (lowStock.productAlerts || []).forEach((p: any) => {
          const id = `stk:${p.productId}`;
          if (!state.alerts.some(a => a.id === id)) {
            pushAlert({
              id,
              type: 'low_stock',
              productId: p.productId,
              productName: p.productName,
              message: `${p.productName}${p.productCode ? ` (${p.productCode})` : ''}: stock bajo ${p.currentStock}/${p.minStock}`,
              severity: 'high',
              isRead: false,
              createdAt: nowIso,
              metadata: { currentStock: p.currentStock, minStock: p.minStock }
            } as any);
          }
        });
      } catch (e) {
        // silencioso
      }
    };

    // Ejecutar ahora y luego cada 10 minutos
    syncAlerts();
    const interval = setInterval(() => { if (!cancelled) syncAlerts(); }, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [batchAlertsHook.expiringBatches, batchAlertsHook.expiredBatches, state.alerts]);

  return (
    <AppContext.Provider value={{ 
      state, 
      dispatch,
      addAuditEntry,
      products: {
        data: productsHook.data,
        loading: productsHook.loading,
        error: productsHook.error,
        addProduct: productsHook.addProduct,
        updateProduct: productsHook.updateProduct,
        deleteProduct: productsHook.deleteProduct,
        activateProduct: (productsHook as any).activateProduct,
        refetch: productsHook.refetch,
      },
      users: {
        data: usersHook.users,
        loading: usersHook.loading,
        error: usersHook.error,
        addUser: usersHook.addUser,
        updateUser: usersHook.updateUser,
        deleteUser: usersHook.deleteUser,
        findUserByUsername: usersHook.findUserByUsername,
        refetch: usersHook.refetch,
      },
      sales: {
        data: salesHook.sales,
        loading: salesHook.loading,
        error: salesHook.error,
        addSale: salesHook.addSale,
    // @ts-ignore
    addSaleWithBatchConsumption: (salesHook as any).addSaleWithBatchConsumption,
        updateSale: salesHook.updateSale,
        deleteSale: salesHook.deleteSale,
        getSalesByDateRange: salesHook.getSalesByDateRange,
        getSalesStats: salesHook.getSalesStats,
        refetch: salesHook.refetch,
      },
      clients: {
        data: clientsHook.clients,
        loading: clientsHook.loading,
        error: clientsHook.error,
        addClient: clientsHook.addClient,
        updateClient: clientsHook.updateClient,
        deleteClient: clientsHook.deleteClient,
        findClientByDocument: clientsHook.findClientByDocument,
        getAllClients: clientsHook.getAllClients,
        refetch: clientsHook.refetch,
      },
      auditLog: {
        auditEntries: auditLogHook.auditEntries,
        loading: auditLogHook.loading,
        error: auditLogHook.error,
        refetch: auditLogHook.refetch,
      },
      pushAlert,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
