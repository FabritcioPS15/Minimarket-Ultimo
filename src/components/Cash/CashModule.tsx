import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  ChevronUp
} from 'lucide-react';

export function CashModule() {
  const { state, dispatch, products, sales } = useApp();
  const { currentUser, currentCashSession, cashSessions } = state;
  const [startAmount, setStartAmount] = useState('');
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

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

  const handleOpenSession = () => {
    const amount = parseFloat(startAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Ingrese un monto válido');
      return;
    }

    const session: CashSession = {
      id: Date.now().toString(),
      userId: currentUser!.id,
      startAmount: amount,
      currentAmount: amount,
      totalSales: 0,
      startTime: new Date().toISOString(),
      status: 'active',
    };

    dispatch({ type: 'START_CASH_SESSION', payload: session });
    setShowOpenDialog(false);
    setStartAmount('');
  };

  const handleCloseSession = () => {
    if (currentCashSession) {
      // Calcular el total de ventas para esta sesión
      const sessionSalesTotal = sessionSales.reduce((sum, sale) => sum + sale.total, 0);
      
      const closedSession: CashSession = {
        ...currentCashSession,
        endTime: new Date().toISOString(),
        totalSales: sessionSalesTotal, // Guardar el total de ventas
        status: 'closed'
      };

      dispatch({ type: 'END_CASH_SESSION' });
      dispatch({ type: 'ADD_CASH_SESSION_HISTORY', payload: closedSession });
      setShowCloseDialog(false);
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
                type="number"
                step="0.01"
                required
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={startAmount}
                onChange={(e) => setStartAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Abrir Caja
          </button>
        </div>
      </div>
    </div>
  );

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
              <p className="text-sm font-bold text-gray-900">S/ {currentCashSession?.startAmount.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600">Ventas en Efectivo</p>
              <p className="text-sm font-bold text-green-700">S/ {totalCashSales.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">Efectivo Esperado</p>
                <p className="text-lg font-bold text-blue-800">S/ {expectedCash.toFixed(2)}</p>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Control de Caja</h2>
          <p className="text-sm sm:text-base text-gray-600">Gestiona las sesiones de caja y control de efectivo</p>
        </div>
        
        {!currentCashSession ? (
          <button
            onClick={() => setShowOpenDialog(true)}
            className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto text-sm"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Abrir Caja</span>
          </button>
        ) : (
          <button
            onClick={() => setShowCloseDialog(true)}
            className="flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto text-sm"
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
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xl sm:text-2xl font-bold text-green-700">
                S/ {expectedCash.toFixed(2)}
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
                <p className="text-lg sm:text-xl font-bold text-gray-900">S/ {currentCashSession.startAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Ventas Totales</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{sessionSales.length}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Ventas en Efectivo</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">S/ {totalCashSales.toFixed(2)}</p>
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
                      <p className="text-sm font-bold text-gray-900">S/ {methodTotal.toFixed(2)}</p>
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
                        {session.userId}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        S/ {session.startAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        S/ {sessionTotalSales.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(session.startTime, session.endTime)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Cerrada
                        </span>
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
                        <span className="text-xs font-medium">S/ {session.startAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Total Ventas:</span>
                        <span className="text-xs font-medium">S/ {sessionTotalSales.toFixed(2)}</span>
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
    </div>
  );
}