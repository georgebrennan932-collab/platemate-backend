import { useState, useRef, useEffect } from 'react';
import { X, Zap, ZapOff, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createBarcodeScanner, ScannerResult, ScannerError } from '@/services/scanner-service';
import { PermissionDebugger } from '@/components/permission-debugger';

interface ScannerModalProps {
  isOpen: boolean;
  onScanSuccess: (barcode: string) => void;
  onClose: () => void;
}

export function ScannerModal({ isOpen, onScanSuccess, onClose }: ScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<ReturnType<typeof createBarcodeScanner> | null>(null);

  // Create scanner instance
  useEffect(() => {
    if (!isOpen) return;

    const handleScanResult = (result: ScannerResult) => {
      console.log('🔍 Barcode detected:', result.barcode);
      
      // Vibrate on successful scan (if supported)
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      
      // Play success sound
      try {
        const audio = new Audio('/success-beep.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (error) {
        console.log('Could not play success sound:', error);
      }
      
      // Stop scanning and notify parent
      stopScanning();
      onScanSuccess(result.barcode);
    };

    const handleScanError = (scanError: ScannerError) => {
      console.error('Scanner error:', scanError);
      setError(scanError.message);
      setIsScanning(false);
      setScannerReady(false);
      
      // Auto-fallback to manual entry for permission errors
      if (scanError.type === 'permission') {
        console.log('🔄 Scanner permission error, auto-opening manual entry in 2 seconds...');
        
        setTimeout(() => {
          console.log('🔄 Opening manual barcode entry automatically...');
          const event = new CustomEvent('open-manual-barcode', { detail: { manual: true, autoFallback: true } });
          window.dispatchEvent(event);
          onClose();
        }, 2000);
      }
    };

    scannerRef.current = createBarcodeScanner(handleScanResult, handleScanError);
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stopScanning();
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess]);

  const startScanning = async () => {
    if (!videoRef.current || !scannerRef.current) return;
    
    setError(null);
    setIsScanning(true);
    
    try {
      console.log('🚀 Starting camera scanner...');
      await scannerRef.current.startScanning(videoRef.current);
      setScannerReady(true);
      console.log('✅ Camera scanner started successfully');
      
      // Check torch support
      const supported = await scannerRef.current.isTorchSupported();
      setTorchSupported(supported);
    } catch (error) {
      console.error('❌ Failed to start scanning:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Camera error: ${errorMessage}`);
      setIsScanning(false);
      setScannerReady(false);
      
      // Auto-fallback to manual entry for permission errors
      if (error instanceof Error && 
          (error.name === 'NotAllowedError' || 
           error.message.includes('Permission denied') ||
           error.message.includes('Camera access'))) {
        console.log('🔄 Camera permission denied, auto-opening manual entry in 2 seconds...');
        
        // Brief delay to let user see the error, then auto-open manual entry
        setTimeout(() => {
          console.log('🔄 Opening manual barcode entry automatically...');
          const event = new CustomEvent('open-manual-barcode', { detail: { manual: true, autoFallback: true } });
          window.dispatchEvent(event);
          onClose();
        }, 2000);
      }
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning();
    }
    setIsScanning(false);
    setScannerReady(false);
    setTorchEnabled(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    
    try {
      const enabled = await scannerRef.current.toggleTorch();
      setTorchEnabled(enabled);
    } catch (error) {
      console.log('Failed to toggle torch:', error);
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  // Auto-start scanning when modal opens
  useEffect(() => {
    if (isOpen && videoRef.current && !isScanning) {
      startScanning();
    } else if (!isOpen) {
      stopScanning();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full w-screen h-screen p-0 bg-black flex flex-col" data-testid="modal-barcode-scanner">
        <DialogTitle className="sr-only">Barcode Scanner</DialogTitle>
        <DialogDescription className="sr-only">
          Use your camera to scan product barcodes for nutrition information
        </DialogDescription>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm border-b border-white/10">
          <div>
            <h2 className="text-white text-lg font-semibold" data-testid="text-scanner-title">
              Scan Barcode
            </h2>
            <p className="text-white/60 text-xs">Allow camera access when prompted</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/10"
            data-testid="button-close-scanner"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Video Container */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
            data-testid="video-scanner"
          />
          
          {/* Scan Guide Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              {/* Scan Frame */}
              <div className="w-64 h-32 border-2 border-white rounded-lg border-dashed opacity-80"></div>
              
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-blue-500 rounded-tl"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-blue-500 rounded-tr"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-blue-500 rounded-bl"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-blue-500 rounded-br"></div>
              
              {/* Status Text */}
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                <p className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full" data-testid="text-scan-status">
                  {!scannerReady && isScanning && 'Starting camera...'}
                  {scannerReady && 'Position barcode within frame'}
                  {error && 'Camera access failed'}
                  {!isScanning && !error && 'Tap to start scanning'}
                </p>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center max-w-sm mx-4">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">Camera Permission Needed</h3>
                <p className="text-white/80 text-sm mb-4" data-testid="text-error-message">
                  {error}
                </p>
                <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-4 mb-4">
                  <h4 className="text-blue-300 font-semibold text-sm mb-2">🔧 Troubleshooting Steps:</h4>
                  <div className="text-white/80 text-xs space-y-1 text-left">
                    <p>• <strong>Replit Mobile App:</strong> Try "Open in Browser" button</p>
                    <p>• <strong>Chrome:</strong> Look for 🎥 camera icon in address bar</p>
                    <p>• <strong>Safari:</strong> Check Privacy & Security → Camera</p>
                    <p>• <strong>Firefox:</strong> Click shield icon → Allow camera</p>
                  </div>
                </div>
                
                <div className="bg-orange-900/30 border border-orange-600/30 rounded-lg p-3 mb-6">
                  <h4 className="text-orange-300 font-semibold text-xs mb-1">⚠️ Replit App Limitation</h4>
                  <p className="text-white/70 text-xs">Camera may be blocked in mobile app. Manual entry will open automatically in 2 seconds...</p>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={startScanning}
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                    data-testid="button-retry-camera"
                  >
                    🎥 Allow Camera Access
                  </Button>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => setShowDebugger(true)}
                      className="border-white/20 bg-white/10 hover:bg-white/20 text-white flex-1"
                    >
                      🔧 Debug Issue
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        handleClose();
                        // Trigger manual entry immediately when user clicks
                        setTimeout(() => {
                          const event = new CustomEvent('open-manual-barcode', { detail: { manual: true } });
                          window.dispatchEvent(event);
                        }, 100);
                      }}
                      className="border-white/20 bg-orange-600 hover:bg-orange-700 text-white flex-1 font-medium"
                      data-testid="button-enter-manually"
                    >
                      📝 Enter Manually
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-black/80 backdrop-blur-sm border-t border-white/10 flex items-center justify-center space-x-6">
          {/* Torch Toggle */}
          {torchSupported && (
            <Button
              variant="outline"
              size="lg"
              onClick={toggleTorch}
              className={`border-white/20 ${torchEnabled ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-white/10 hover:bg-white/20'}`}
              data-testid="button-torch-toggle"
            >
              {torchEnabled ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
            </Button>
          )}

          {/* Manual Entry Fallback */}
          <Button
            variant="outline" 
            onClick={() => {
              handleClose();
              // Open manual entry by clicking barcode button again
              setTimeout(() => {
                const barcodeButton = document.querySelector('[data-testid="button-barcode"]') as HTMLButtonElement;
                if (barcodeButton) {
                  // Create a manual entry event
                  const event = new CustomEvent('open-manual-barcode', { detail: { manual: true } });
                  window.dispatchEvent(event);
                }
              }, 100);
            }}
            className="border-white/20 bg-white/10 hover:bg-white/20 text-white"
            data-testid="button-manual-entry"
          >
            Enter Manually
          </Button>

          {/* Rescan Button */}
          <Button
            onClick={scannerReady ? stopScanning : startScanning}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 px-8"
            data-testid="button-rescan"
          >
            {scannerReady ? 'Stop' : 'Start'} Scan
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-black/60 text-center border-t border-white/10">
          <p className="text-white/70 text-xs" data-testid="text-scan-instructions">
            Hold steady and position the barcode within the frame. The scanner will automatically detect and process the code.
          </p>
        </div>
      </DialogContent>
      
      {/* Debug Modal - render outside Dialog to avoid z-index conflicts */}
      {showDebugger && (
        <PermissionDebugger onClose={() => setShowDebugger(false)} />
      )}
    </Dialog>
  );
}