import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useCashSessions } from '../../hooks/useCashSessions';
import { CashSession } from '../../types';
import { 
  CreditCard, 
  DollarSign, 
  Calculator, 
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';

export function CashModule() {
  const { state, dispatch, products, sales, users, addAuditEntry } = useApp();
  const { currentUser, currentCashSession, cashSessions } = state;
  const cash = useCashSessions();
  const [startAmount, setStartAmount] = useState('');
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [detailsSession, setDetailsSession] = useState<CashSession | null>(null);
  const isAdminOrSupervisor = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Refrescar duración de la sesión activa en vivo
  useEffect(() => {
    if (!currentCashSession) return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [currentCashSession]);

  // Función para obtener las ventas de una sesión específica
  const getSessionSales = (session: CashSession) => {
    return sales.data.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const sessionStart = new Date(session.startTime);
      const sessionEnd = session.endTime ? new Date(session.endTime) : new Date();
      
      return saleDate >= sessionStart && saleDate <= sessionEnd;
    });
  };

  // Función para formatear la duración en horas, minutos y segundos
  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const durationMs = end - start;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Función para obtener duración en segundos (para ordenamiento)
  const getDurationInSeconds = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    return Math.floor((end - start) / 1000);
  };

  // Ventas de la sesión actual
  const sessionSales = currentCashSession ? getSessionSales(currentCashSession) : [];
  const cashSales = sessionSales.filter(sale => sale.paymentMethod === 'cash');
  const totalCashSales = cashSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSessionSales = sessionSales.reduce((sum, sale) => sum + (sale.total ?? 0), 0);
  const expectedCash = (currentCashSession?.startAmount || 0) + totalCashSales;
  const sessionOwner = currentCashSession ? users.data.find(u => u.id === currentCashSession.userId) : undefined;
  const formatCurrency = (value: number) => {
    const locale = state.settings?.locale || 'es-PE';
    const currency = state.settings?.currency || 'PEN';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(value || 0);
    } catch {
      return `S/ ${(value || 0).toFixed(2)}`;
    }
  };

  const handleOpenSession = async () => {
    if (!isAdminOrSupervisor) {
      alert('Solo administradores o supervisores pueden abrir la caja.');
      return;
    }
    const amount = parseFloat(startAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Ingrese un monto válido');
      return;
    }

    try {
      const created = await cash.openSession(currentUser!.id, amount);
      const session: CashSession = {
        id: created.id,
        userId: created.user_id,
        startAmount: created.start_amount,
        currentAmount: created.current_amount,
        totalSales: created.total_sales,
        startTime: created.start_time,
        status: created.status,
      };
      dispatch({ type: 'START_CASH_SESSION', payload: session });
      
      // Registrar en auditoría
      await addAuditEntry({
        action: 'CASH_OPEN',
        entity: 'cash_sessions',
        entityId: session.id,
        entityName: `Sesión de caja #${session.id.slice(-6)}`,
        details: `Apertura de caja con S/.${amount.toFixed(2)}`,
        newValue: {
          startAmount: amount,
          sessionId: session.id,
        },
        metadata: {
          openedBy: currentUser?.username,
        },
      });
      
      setShowOpenDialog(false);
      setStartAmount('');
    } catch (e: any) {
      alert('Error abriendo caja: ' + (e.message || 'desconocido'));
    }
  };

  const handleCloseSession = async () => {
    if (!isAdminOrSupervisor) {
      alert('Solo administradores o supervisores pueden cerrar la caja.');
      return;
    }
    if (currentCashSession) {
      // Calcular el total de ventas para esta sesión
      const sessionSalesTotal = sessionSales.reduce((sum, sale) => sum + sale.total, 0);

      try {
        await cash.closeSession(currentCashSession.id, { totalCashSales: totalCashSales, totalSales: sessionSalesTotal });
        const closedSession: CashSession = {
          ...currentCashSession,
          endTime: new Date().toISOString(),
          totalSales: sessionSalesTotal,
          status: 'closed'
        };
        dispatch({ type: 'END_CASH_SESSION' });
        dispatch({ type: 'ADD_CASH_SESSION_HISTORY', payload: closedSession });
        
        // Registrar en auditoría
        await addAuditEntry({
          action: 'CASH_CLOSE',
          entity: 'cash_sessions',
          entityId: currentCashSession.id,
          entityName: `Sesión de caja #${currentCashSession.id.slice(-6)}`,
          details: `Cierre de caja - Ventas: S/.${sessionSalesTotal.toFixed(2)}, Efectivo: S/.${totalCashSales.toFixed(2)}`,
          newValue: {
            totalSales: sessionSalesTotal,
            totalCashSales,
            endTime: closedSession.endTime,
          },
          metadata: {
            closedBy: currentUser?.username,
            sessionDuration: formatDuration(currentCashSession.startTime, closedSession.endTime),
          },
        });
        
        setShowCloseDialog(false);
      } catch (e: any) {
        alert('Error cerrando caja: ' + (e.message || 'desconocido'));
      }
    }
  };

  const OpenSessionDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Abrir Sesión de Caja</h3>
          <button onClick={() => setShowOpenDialog(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto Inicial *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">S/</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="^[0-9]*[.,]?[0-9]*$"
                required
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={startAmount}
                onChange={(e) => setStartAmount(e.target.value.replace(/,/g, '.'))}
                placeholder="0.00"
                autoFocus
              />
            </div>
            {/* Quick amount buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[20, 50, 100, 200, 500].map(v => (
                <button
                  key={v}
                  onClick={() => setStartAmount(String(v))}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  S/ {v}
                </button>
              ))}
              <button
                onClick={() => setStartAmount('0')}
                className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
              >
                Vaciar
              </button>
            </div>
            {/* Validation tip */}
            {startAmount !== '' && Number(startAmount) < 0 && (
              <p className="text-xs text-red-600 mt-1">El monto no puede ser negativo</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Información</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Registra el efectivo con el que inicias tu turno. Este monto será usado para calcular el cierre de caja.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={() => setShowOpenDialog(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleOpenSession}
            disabled={startAmount.trim() === '' || Number(startAmount) < 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Abrir Caja
          </button>
        </div>
      </div>
    </div>
  );

  const SessionDetailsModal = () => {
    if (!detailsSession) return null;
    const items = sales.data
      .filter(s => {
        const d = new Date(s.createdAt).getTime();
        const start = new Date(detailsSession.startTime).getTime();
        const end = detailsSession.endTime ? new Date(detailsSession.endTime).getTime() : Date.now();
        return d >= start && d <= end;
      })
      .flatMap(s => s.items.map(i => ({
        ...i,
        saleNumber: s.saleNumber,
        paymentMethod: s.paymentMethod,
        createdBy: s.createdBy,
        customerName: s.customerName,
        customerDocument: s.customerDocument
      })));

    const total = items.reduce((sum, i) => sum + (i.total ?? (i.unitPrice ?? 0) * (i.quantity ?? 0)), 0);

    const exportCsv = (delimiter: string, filename: string) => {
      const headers = [
        'Venta', 'Producto', 'Cantidad', 'Precio Unitario', 'Total', 'Pago', 'Cliente', 'Registrado por'
      ];
      const rows = items.map((i: any) => [
        i.saleNumber,
        i.productName,
        i.quantity,
        (i.unitPrice ?? 0).toFixed(2),
        (i.total ?? (i.unitPrice ?? 0) * (i.quantity ?? 0)).toFixed(2),
        i.paymentMethod,
        i.customerName || i.customerDocument || 'Cliente General',
        users.data.find(u => u.id === i.createdBy)?.username || i.createdBy || '-'
      ]);
      const csvContent = [headers, ...rows]
        .map(r => r.map(v => {
          const s = String(v ?? '').replace(/"/g, '""');
          return /["\n\r,;\t]/.test(s) ? `"${s}"` : s;
        }).join(delimiter))
        .join('\r\n');
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Detalle de ventas</h3>
            <button onClick={() => setDetailsSession(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {items.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">No hay ventas en este periodo</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-gray-600">Venta</th>
                      <th className="px-3 py-2 text-left text-gray-600">Producto</th>
                      <th className="px-3 py-2 text-right text-gray-600">Cant.</th>
                      <th className="px-3 py-2 text-right text-gray-600">P. Unit.</th>
                      <th className="px-3 py-2 text-right text-gray-600">Total</th>
                      <th className="px-3 py-2 text-left text-gray-600">Pago</th>
                      <th className="px-3 py-2 text-left text-gray-600">Cliente</th>
                      <th className="px-3 py-2 text-left text-gray-600">Registrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-3 py-2">{i.saleNumber}</td>
                        <td className="px-3 py-2">{i.productName}</td>
                        <td className="px-3 py-2 text-right">{i.quantity}</td>
                        <td className="px-3 py-2 text-right">S/ {(i.unitPrice ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">S/ {(i.total ?? (i.unitPrice ?? 0) * (i.quantity ?? 0)).toFixed(2)}</td>
                        <td className="px-3 py-2">{i.paymentMethod}</td>
                        <td className="px-3 py-2">{i.customerName || i.customerDocument || 'Cliente General'}</td>
                        <td className="px-3 py-2">{users.data.find(u => u.id === (i as any).createdBy)?.username || (i as any).createdBy || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 text-right text-sm">
              <span className="text-gray-600 mr-2">Total vendido:</span>
              <span className="font-semibold">S/ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between gap-2">
            <div className="flex gap-2">

              <button
                onClick={() => exportCsv(';', `ventas_sesion_${new Date(detailsSession.startTime).toISOString().slice(0,10)}_excel.csv`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Exportar Excel
              </button>
            </div>
            <button onClick={() => setDetailsSession(null)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CloseSessionDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Cerrar Sesión de Caja</h3>
          <button onClick={() => setShowCloseDialog(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Efectivo Inicial</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(currentCashSession?.startAmount || 0)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600">Ventas en Efectivo</p>
              <p className="text-sm font-bold text-green-700">{formatCurrency(totalCashSales)}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">Efectivo Esperado</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(expectedCash)}</p>
              </div>
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <div className="text-center py-2">
            <p className="text-xs text-gray-600">
              Total de ventas realizadas: <span className="font-semibold">{sessionSales.length}</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Duración de la sesión: <span className="font-semibold">
                {currentCashSession && formatDuration(currentCashSession.startTime)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={() => setShowCloseDialog(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleCloseSession}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Cerrar Caja
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Banners de estado */}
      {!currentCashSession && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-yellow-900">No hay sesión de caja activa</div>
              <div className="text-xs text-yellow-700">Debe abrir una sesión de caja para registrar ventas y movimientos.</div>
            </div>
          </div>
        </div>
      )}
      {currentCashSession && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start">
              <CreditCard className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-green-900">Caja abierta</div>
                <div className="text-xs text-green-700">
                  Usuario: <span className="font-semibold">{sessionOwner?.username || currentCashSession.userId}</span>
                  {' '}• Inicio: {new Date(currentCashSession.startTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  {' '}• Tiempo: {formatDuration(currentCashSession.startTime)}
                </div>
                {!isAdminOrSupervisor && (
                  <div className="text-[11px] text-yellow-700 mt-1">Gestionada por administración. No puedes cerrar la caja.</div>
                )}
              </div>
            </div>
            <div className="mt-3 sm:mt-0 text-sm">
              <span className="text-gray-600">Efectivo esperado: </span>
              <span className="font-semibold text-green-700">{formatCurrency(expectedCash)}</span>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Control de Caja</h2>
          <p className="text-sm sm:text-base text-gray-600">Gestiona las sesiones de caja y control de efectivo</p>
        </div>
        
        {!currentCashSession ? (
          <button
            onClick={() => {
              if (!isAdminOrSupervisor) {
                alert('Solo administradores o supervisores pueden abrir la caja.');
                return;
              }
              setShowOpenDialog(true);
            }}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto text-sm ${isAdminOrSupervisor ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Abrir Caja</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (!isAdminOrSupervisor) {
                alert('Solo administradores o supervisores pueden cerrar la caja.');
                return;
              }
              setShowCloseDialog(true);
            }}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto text-sm ${isAdminOrSupervisor ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            <Clock className="h-4 w-4" />
            <span>Cerrar Caja</span>
          </button>
        )}
      </div>

      {/* Current Session Status */}
      {currentCashSession ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-2 sm:p-3 rounded-full">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-green-800">Sesión Activa</h3>
                <p className="text-green-600 text-xs sm:text-sm">
                  Iniciada el {new Date(currentCashSession.startTime).toLocaleDateString('es-ES')} 
                  a las {new Date(currentCashSession.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-green-600 text-xs mt-1">
                  Duración: {formatDuration(currentCashSession.startTime)}
                </p>
                <p className="text-green-700 text-xs mt-1">
                  Usuario: <span className="font-semibold">{sessionOwner?.username || currentCashSession.userId}</span>
                </p>
                {!isAdminOrSupervisor && (
                  <p className="text-yellow-700 text-xs mt-2">
                    Caja gestionada por administración. No puedes cerrarla.
                  </p>
                )}
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xl sm:text-2xl font-bold text-green-700">
                {formatCurrency(expectedCash)}
              </p>
              <p className="text-xs sm:text-sm text-green-600">Efectivo esperado</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-yellow-800">No hay sesión activa</h3>
              <p className="text-yellow-700 text-xs sm:text-sm">Debes abrir una sesión de caja para poder realizar ventas.</p>
              {!isAdminOrSupervisor && (
                <p className="text-yellow-700 text-xs sm:text-sm mt-1">Pide a un administrador o supervisor que la abra.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Stats */}
      {currentCashSession && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Efectivo Inicial</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(currentCashSession.startAmount)}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Ventas de la sesión</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{sessionSales.length}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Ventas en Efectivo</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totalCashSales)}</p>
              </div>
              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Duración</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatDuration(currentCashSession.startTime)}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Quick actions when session active */}
      {currentCashSession && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              // Ir al módulo de ventas vía Layout onViewChange si está disponible a través de evento
              const evt = new CustomEvent('navigate', { detail: { view: 'sales' } });
              window.dispatchEvent(evt);
            }}
            className="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm"
          >
            Ver ventas de la sesión ({sessionSales.length})
          </button>
        </div>
      )}

      {/* Payment Methods Breakdown */}
      {currentCashSession && sessionSales.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Resumen por Método de Pago</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {['cash', 'card', 'transfer', 'yape', 'plin', 'other'].map(method => {
              const methodSales = sessionSales.filter(sale => sale.paymentMethod === method);
              const methodTotal = methodSales.reduce((sum, sale) => sum + sale.total, 0);
              
              if (methodSales.length === 0) return null;
              
              return (
                <div key={method} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 capitalize">
                        {method === 'cash' ? 'Efectivo' :
                         method === 'card' ? 'Tarjeta' :
                         method === 'transfer' ? 'Transferencia' :
                         method}
                      </p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(methodTotal)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{methodSales.length} ventas</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Historial de Sesiones</h3>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efectivo Inicial
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Ventas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...cashSessions]
                .filter(session => session.status === 'closed')
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .slice(0, 10)
                .map(session => {
                  // Para sesiones antiguas que no tienen totalSales, calcularlo
                  const sessionTotalSales = session.totalSales > 0 ? 
                    session.totalSales : 
                    getSessionSales(session).reduce((sum, sale) => sum + sale.total, 0);
                  
                  return (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(session.startTime).toLocaleDateString('es-ES')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(session.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {users.data.find(u => u.id === session.userId)?.username || session.userId}
              </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(session.startAmount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(sessionTotalSales)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(session.startTime, session.endTime)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Cerrada
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setDetailsSession(session)}
                          className="inline-flex items-center px-2 py-1 text-xs text-blue-700 hover:text-blue-900"
                          title="Ver detalle de ventas"
                        >
                          <Eye className="h-4 w-4 mr-1" /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Cards */}
        <div className="md:hidden">
          {[...cashSessions]
            .filter(session => session.status === 'closed')
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .slice(0, 10)
            .map(session => {
              const sessionTotalSales = session.totalSales > 0 ? 
                session.totalSales : 
                getSessionSales(session).reduce((sum, sale) => sum + sale.total, 0);
                
              return (
                <div key={session.id} className="border-b border-gray-200 p-4">
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(session.startTime).toLocaleDateString('es-ES')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(session.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {expandedSession === session.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  
                  {expandedSession === session.id && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Usuario:</span>
                        <span className="text-xs font-medium">{session.userId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Efectivo Inicial:</span>
                        <span className="text-xs font-medium">{formatCurrency(session.startAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Total Ventas:</span>
                        <span className="text-xs font-medium">{formatCurrency(sessionTotalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Duración:</span>
                        <span className="text-xs font-medium">{formatDuration(session.startTime, session.endTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Estado:</span>
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Cerrada
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {cashSessions.filter(s => s.status === 'closed').length === 0 && (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No hay historial de sesiones</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showOpenDialog && <OpenSessionDialog />}
      {showCloseDialog && <CloseSessionDialog />}
      {detailsSession && <SessionDetailsModal />}
    </div>
  );
}