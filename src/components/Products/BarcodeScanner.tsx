import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { ArrowLeft, Scan, Search, Camera, CameraOff, Shield } from 'lucide-react';

interface BarcodeScannerProps {
  onClose: () => void;
  onProductFound: (product: Product) => void;
}

export function BarcodeScanner({ onClose, onProductFound }: BarcodeScannerProps) {
  const { products } = useApp();
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'https-required'>('prompt');
  const [isLocalhost, setIsLocalhost] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Verificar si estamos en localhost (donde HTTP funciona para cámara)
    setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    checkCameraPermission();
    
    requestCameraAccess();
    return () => {
      stopScanner();
    };
  }, []);

  const checkCameraPermission = async () => {
  try {
    const local = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Verificar si estamos en HTTPS o localhost
    if (!window.location.protocol.includes('https') && !local) {
      setCameraPermission('https-required');
      setError('Se requiere HTTPS para acceder a la cámara en producción.');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermission(permissionStatus.state as 'granted' | 'denied');
      
      permissionStatus.onchange = () => {
        setCameraPermission(permissionStatus.state as 'granted' | 'denied');
      };
    }
  } catch (error) {
    console.log('Permissions API not supported');
  }
};


  const startScanner = async () => {
    try {
      setError('');
      
      // Verificar HTTPS antes de continuar
      if (!window.location.protocol.includes('https') && !isLocalhost) {
        setCameraPermission('https-required');
        setError('Se requiere HTTPS para acceder a la cámara. Usa localhost para desarrollo.');
        return;
      }

      setScanning(true);
      
      // Limpiar cualquier escáner existente
      await stopScanner();

      // Crear nuevo escáner
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      // Renderizar el escáner
      scannerRef.current.render(
        (decodedText) => {
          handleCodeFound(decodedText);
        },
        (error) => {
          if (!error?.toString().includes("No MultiFormat Readers")) {
            console.warn("Scan error:", error);
          }
        }
      ).catch((err) => {
        console.error("Error rendering scanner:", err);
        handleCameraError(err);
      });

    } catch (err) {
      console.error("Error starting scanner:", err);
      handleCameraError(err);
    }
  };

  const handleCameraError = (error: any) => {
    const errorMessage = error.toString();
    
    if (errorMessage.includes('HTTPS') || errorMessage.includes('secure')) {
      setError('Se requiere HTTPS para acceder a la cámara. Usa localhost para desarrollo o despliega con HTTPS.');
      setCameraPermission('https-required');
    } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
      setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara.');
      setCameraPermission('denied');
    } else if (errorMessage.includes('found') || errorMessage.includes('device')) {
      setError('No se encontró cámara disponible o está siendo usada por otra aplicación.');
    } else {
      setError('Error al acceder a la cámara. Verifica la configuración de tu dispositivo.');
    }
    
    setScanning(false);
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const scannerElement = document.getElementById('qr-reader');
        if (scannerElement) {
          scannerElement.innerHTML = '';
        }
        scannerRef.current = null;
      }
      setScanning(false);
    } catch (error) {
      console.error("Error stopping scanner:", error);
    }
  };

  const handleCodeFound = (code: string) => {
    const cleanedCode = code.trim();
    
    if (!cleanedCode) return;
    
    const product = products.data.find(p => p.code === cleanedCode);
    if (product) {
      stopScanner();
      onProductFound(product);
    } else {
      alert(`Producto con código ${cleanedCode} no encontrado. Puedes crear uno nuevo.`);
    }
  };

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      handleCodeFound(manualCode.trim());
    }
  };

 const requestCameraAccess = async () => {
  try {
    const local = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (!window.location.protocol.includes('https') && !local) {
      setCameraPermission('https-required');
      setError('Se requiere HTTPS para acceder a la cámara en producción.');
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    setCameraPermission('granted');
    setError('');
    startScanner();
  } catch (err) {
    console.error("Camera access denied:", err);
    handleCameraError(err);
  }
};


  const getHttpsGuide = () => {
    if (isLocalhost) {
      return (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Estás en localhost:</strong> La cámara debería funcionar con HTTP en localhost.
            Si no funciona, verifica que tu navegador permita cámaras en sitios no seguros.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
        <p className="text-sm text-yellow-700">
          <strong>Solución:</strong> 
          <ul className="list-disc list-inside mt-2">
            <li>Para desarrollo: Usa localhost o 127.0.0.1</li>
            <li>Para producción: Despliega tu aplicación con HTTPS</li>
            <li>Alternativa: Usa la búsqueda manual a continuación</li>
          </ul>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onClose}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Escanear Código de Barras</h2>
          <p className="text-gray-600">Usa la cámara o ingresa el código manualmente</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            {cameraPermission === 'https-required' ? (
              <Shield className="h-5 w-5 mr-2" />
            ) : (
              <CameraOff className="h-5 w-5 mr-2" />
            )}
            {error}
          </div>
          {cameraPermission === 'https-required' && getHttpsGuide()}
          {cameraPermission === 'denied' && (
            <div className="mt-2 text-sm">
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 underline mr-4"
              >
                Reintentar
              </button>
              <button
                onClick={() => {
                  if (navigator.userAgent.includes('Chrome')) {
                    alert('Chrome: Configuración → Privacidad → Configuración de sitios → Cámara');
                  } else if (navigator.userAgent.includes('Firefox')) {
                    alert('Firefox: Opciones → Privacidad → Permisos → Cámara');
                  }
                }}
                className="text-blue-600 underline"
              >
                ¿Cómo cambiar permisos?
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Scanner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Scan className="h-5 w-5 mr-2" />
            Escanear con Cámara
          </h3>
          
          {cameraPermission === 'https-required' ? (
            <div className="text-center py-6">
              <div className="bg-yellow-50 rounded-full p-4 inline-block mb-4">
                <Shield className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-gray-600 mb-4">Se requiere HTTPS para la cámara</p>
              <div className="space-y-2">
                <button
                  onClick={handleManualSearch}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Usar Búsqueda Manual
                </button>
              </div>
            </div>
          ) : cameraPermission === 'denied' ? (
            <div className="text-center py-6">
              <div className="bg-red-50 rounded-full p-4 inline-block mb-4">
                <CameraOff className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-gray-600 mb-4">Permiso de cámara denegado</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : !scanning ? (
            <div className="text-center py-6">
              <div className="bg-blue-50 rounded-full p-4 inline-block mb-4">
                <Camera className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-gray-600 mb-4">Haz clic para activar la cámara</p>
              <button
                onClick={requestCameraAccess}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Activar Cámara
              </button>
            </div>
          ) : (
            <div>
              <div id="qr-reader" className="w-full"></div>
              <div className="mt-4 text-center">
                <button
                  onClick={stopScanner}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Detener Escáner
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Manual Entry - Siempre visible */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Búsqueda Manual
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código del Producto
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ingresa el código manualmente"
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
              />
            </div>
            
            <button
              onClick={handleManualSearch}
              disabled={!manualCode.trim()}
              className="w-full bg-green-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>Buscar Producto</span>
            </button>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Productos registrados:</strong> {products.data.length}
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto">
                {products.data.slice(0, 5).map(product => (
                  <div key={product.id} className="text-xs text-gray-500 py-1">
                    {product.code} - {product.name}
                  </div>
                ))}
                {products.data.length > 5 && (
                  <div className="text-xs text-gray-400">Y {products.data.length - 5} más...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}