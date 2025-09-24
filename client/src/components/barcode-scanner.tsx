import { useState, useRef } from "react";
import { QrCode, X, Scan, AlertCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { BrowserMultiFormatReader } from "@zxing/library";

interface BarcodeScannerProps {
  onScanSuccess: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScanSuccess, onClose, isOpen }: BarcodeScannerProps) {
  const { toast } = useToast();
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Use the same camera approach as the working food photo feature
  const handleCameraCapture = async () => {
    console.log("📷 Barcode camera capture requested");
    setIsProcessing(true);
    setScanError(null);
    
    try {
      // Use Capacitor Camera API if available (native app)
      if (Capacitor.isNativePlatform()) {
        console.log("📱 Using Capacitor camera for barcode...");
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
        });
        
        console.log("📸 Barcode photo captured successfully");
        
        // Convert base64 to File object
        const response = await fetch(`data:image/jpeg;base64,${image.base64String}`);
        const blob = await response.blob();
        const file = new File([blob], 'barcode-photo.jpg', { type: 'image/jpeg' });
        
        await processBarcodeImage(file);
      } else {
        // For web browsers, use camera input (same as food photos)
        console.log("🌐 Using web camera input for barcode...");
        cameraInputRef.current?.click();
      }
    } catch (error: any) {
      console.error('❌ Error taking barcode photo:', error);
      setIsProcessing(false);
      setScanError('Failed to access camera. Please try again.');
      toast({
        title: "Camera Error",
        description: "Failed to take photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      console.log("📁 Barcode image selected:", file.name);
      await processBarcodeImage(file);
    }
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const processBarcodeImage = async (file: File) => {
    try {
      setIsProcessing(true);
      setScanError(null);
      
      // Create preview URL
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);
      
      console.log("🔍 Processing barcode image...");
      
      // Create image element for barcode detection
      const img = new Image();
      img.onload = async () => {
        try {
          // Create canvas to get image data
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          // Use ZXing to detect barcode from image
          const codeReader = new BrowserMultiFormatReader();
          
          // Convert image to blob and create object URL
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
          });
          const blobUrl = URL.createObjectURL(blob);
          
          // Create image element for decoding
          const imageElement = document.createElement('img');
          imageElement.src = blobUrl;
          
          // Wait for image to load then decode
          await new Promise((resolve) => {
            imageElement.onload = resolve;
          });
          
          // Try different ZXing decode methods
          let result;
          try {
            // Try decodeFromImageUrl first
            result = await codeReader.decodeFromImageUrl(blobUrl);
          } catch (e) {
            // If that fails, try other methods
            console.warn('decodeFromImageUrl failed, trying alternative...', e);
            throw new Error("Failed to decode barcode from image");
          }
          
          // Clean up blob URL
          URL.revokeObjectURL(blobUrl);
          
          if (result) {
            const barcode = result.getText();
            console.log("✅ Barcode detected:", barcode);
            
            toast({
              title: "Barcode Found!",
              description: `Detected: ${barcode}`,
            });
            
            onScanSuccess(barcode);
          } else {
            throw new Error("No barcode detected in image");
          }
        } catch (error: any) {
          console.error("❌ Barcode detection failed:", error);
          setScanError('No barcode detected in this image. Please try again with a clearer photo.');
          toast({
            title: "No Barcode Found",
            description: "Please try taking a clearer photo of the barcode.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
          URL.revokeObjectURL(imageUrl);
        }
      };
      
      img.onerror = () => {
        setIsProcessing(false);
        setScanError('Failed to load image. Please try again.');
      };
      
      img.src = imageUrl;
      
    } catch (error: any) {
      console.error("❌ Error processing barcode image:", error);
      setIsProcessing(false);
      setScanError('Failed to process image. Please try again.');
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

        {/* Camera Interface */}
        <div className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden mb-4">
          {capturedImage ? (
            <div className="relative w-full h-full">
              <img 
                src={capturedImage} 
                alt="Captured barcode" 
                className="w-full h-full object-cover rounded-xl"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Scan className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                    <p className="text-lg font-medium">Detecting barcode...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center cursor-pointer" onClick={handleCameraCapture}>
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Tap to take photo</p>
                <p className="text-sm text-gray-300 mt-2">Point camera at barcode</p>
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

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <QrCode className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium mb-1">How to scan:</p>
            <p>1. Tap the camera area above</p>
            <p>2. Point your camera at the product barcode</p>
            <p>3. Take a clear photo of the barcode lines</p>
          </div>
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
          {capturedImage ? (
            <Button
              onClick={() => {
                setCapturedImage(null);
                setIsProcessing(false);
                setScanError(null);
              }}
              className="flex-1"
              data-testid="button-retake-photo"
            >
              Retake Photo
            </Button>
          ) : (
            <Button
              onClick={handleCameraCapture}
              disabled={isProcessing}
              className="flex-1"
              data-testid="button-take-photo"
            >
              {isProcessing ? 'Processing...' : 'Take Photo'}
            </Button>
          )}
        </div>
        
        {/* Hidden file inputs - same as food camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-camera"
        />
      </div>
    </div>
  );
}