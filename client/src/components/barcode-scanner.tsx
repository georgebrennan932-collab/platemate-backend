import { useState, useRef, useEffect } from "react";
import { QrCode, X, Scan, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface BarcodeScannerProps {
  onScanSuccess: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScanSuccess, onClose, isOpen }: BarcodeScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setIsScanning(true);
      setScanError(null);

      // Create code reader instance
      codeReaderRef.current = new BrowserMultiFormatReader();

      // Get user media for camera
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();

        // Start scanning
        codeReaderRef.current.decodeFromVideoDevice(
          undefined, // Use default camera
          videoRef.current,
          (result, error) => {
            if (result) {
              const scannedText = result.getText();
              console.log('📷 Barcode scanned:', scannedText);
              
              // Avoid duplicate scans of the same code
              if (scannedText !== lastScannedCode) {
                setLastScannedCode(scannedText);
                toast({
                  title: "Barcode Scanned!",
                  description: `Found: ${scannedText}`,
                });
                onScanSuccess(scannedText);
              }
            }
            
            if (error && !(error instanceof NotFoundException)) {
              console.warn('Scanning error:', error);
              setScanError('Scanning error - try positioning the barcode differently');
            }
          }
        );
      }
    } catch (error: any) {
      console.error('Failed to start barcode scanner:', error);
      setScanError(error.message || 'Failed to access camera');
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = () => {
    try {
      // Stop the code reader
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }

      // Stop the video stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsScanning(false);
      setLastScannedCode(null);
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-2xl border border-border/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <QrCode className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-bold">Scan Barcode</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-scanner"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scanner View */}
        <div className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden mb-4">
          {isScanning ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                data-testid="video-scanner"
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary border-dashed rounded-lg animate-pulse">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                </div>
              </div>

              {/* Status indicator */}
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                <Scan className="h-4 w-4 text-green-400 animate-pulse" />
                <span className="text-white text-sm font-medium">Scanning...</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Camera Loading...</p>
              </div>
            </div>
          )}
        </div>

        {/* Error display */}
        {scanError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{scanError}</p>
            </div>
          </div>
        )}

        {/* Last scanned result */}
        {lastScannedCode && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Last Scanned:</p>
                <p className="text-xs text-green-600 dark:text-green-400 font-mono">{lastScannedCode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground mb-4">
          <p>Point your camera at a product barcode</p>
          <p>The scanner will automatically detect and read the code</p>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-scan"
          >
            Cancel
          </Button>
          <Button
            onClick={startScanner}
            disabled={isScanning}
            className="flex-1"
            data-testid="button-restart-scan"
          >
            {isScanning ? 'Scanning...' : 'Restart Scanner'}
          </Button>
        </div>
      </div>
    </div>
  );
}