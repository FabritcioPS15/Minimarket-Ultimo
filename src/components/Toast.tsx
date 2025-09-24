import React, { useEffect, useState } from 'react';

type ToastItem = {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
};

export function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || {};
      const toast: ToastItem = {
        id: `${Date.now()}_${Math.random()}`,
        type: detail.type || 'info',
        message: detail.message || '',
      };
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, detail.duration || 3000);
    };
    window.addEventListener('toast', handler as any);
    return () => window.removeEventListener('toast', handler as any);
  }, []);

  const bgClass = (type: ToastItem['type']) => {
    switch (type) {
      case 'success': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      case 'warning': return 'bg-yellow-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`text-white px-4 py-2 rounded shadow-lg ${bgClass(t.type)}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}


