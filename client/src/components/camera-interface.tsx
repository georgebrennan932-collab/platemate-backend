import { useState, useRef, useEffect } from "react";
import { Images, Zap, Camera, CloudUpload, Syringe, QrCode, Flame } from "lucide-react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { mediaService } from '@/lib/media-service';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ScannerModal } from "@/components/scanner-modal";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { scanBarcodeFromImage } from "@/services/scanner-service";
import { compressImage, preprocessAndCompress } from "@/lib/image-compression";
import type { FoodAnalysis } from "@shared/schema";

interface CameraInterfaceProps {
  onAnalysisStart: () => void;
  onAnalysisSuccess: (data: FoodAnalysis) => void;
  onAnalysisError: (error: string, errorType?: 'food' | 'barcode') => void;
  caloriesConsumed?: number;
  caloriesGoal?: number;
}

export function CameraInterface({
  onAnalysisStart,
  onAnalysisSuccess,
  onAnalysisError,
  caloriesConsumed = 0,
  caloriesGoal = 2000,
}: CameraInterfaceProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [barcodeScanningMode, setBarcodeScanningMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize media service
  useEffect(() => {
    if (!mediaService.isMediaSupported()) {
      toast({
        title: "Camera Not Supported",
        description: "Camera requires a modern browser with HTTPS",
        variant: "destructive",
      });
    }

    // Cleanup on unmount
    return () => {
      mediaService.cleanup();
    };
  }, [toast]);

  const analysisMutation = useMutation({
    mutationFn: async (file: File) => {
      // Preprocess and compress image for optimal AI analysis
      let imageToUpload = file;
      try {
        imageToUpload = await preprocessAndCompress(
          file,
          {
            enhanceContrast: true,
            blurBackground: false,
            centerCrop: false,
            contrastAmount: 1.25
          },
          {
            maxWidth: 800,
            maxHeight: 800,
            quality: 0.8,
            maxSizeKB: 400
          }
        );
      } catch (processingError) {
        // Fallback to original if processing fails
      }
      
      const formData = new FormData();
      formData.append('image', imageToUpload);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      return result;
    },
    onMutate: () => {
      onAnalysisStart();
    },
    onSuccess: (data: FoodAnalysis) => {
      onAnalysisSuccess(data);
    },
    onError: (error: Error) => {
      console.error("Analysis error:", error);
      onAnalysisError(error.message, 'food');
    },
  });


  const barcodeMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await apiRequest('POST', '/api/barcode', { barcode });
      const result = await response.json();
      return result;
    },
    onMutate: () => {
      onAnalysisStart();
    },
    onSuccess: (data: FoodAnalysis) => {
      setShowBarcodeScanner(false);
      onAnalysisSuccess(data);
    },
    onError: (error: Error) => {
      console.error("Barcode lookup error:", error);
      
      // If product not found, fallback to manual entry
      if (error.message.includes("Product not found") || error.message.includes("not found")) {
        setShowBarcodeScanner(false);
        setBarcodeScanningMode(false);
        setShowManualEntry(true);
        toast({
          title: "Product Not Found",
          description: "This barcode wasn't found in our database. Please enter the product details manually.",
          variant: "default",
        });
      } else {
        // Other errors
        toast({
          title: "Barcode Scanner Error",
          description: error.message,
          variant: "destructive",
        });
        setShowBarcodeScanner(false);
        setBarcodeScanningMode(false);
        onAnalysisError(error.message, 'barcode');
      }
    },
  });

  const handleBarcodeScanned = (barcode: string) => {
    barcodeMutation.mutate(barcode);
  };


  // Listen for manual barcode entry events
  useEffect(() => {
    const handleManualBarcodeEvent = () => {
      setShowBarcodeScanner(false);
      setShowManualEntry(true);
    };

    window.addEventListener('open-manual-barcode', handleManualBarcodeEvent);
    return () => window.removeEventListener('open-manual-barcode', handleManualBarcodeEvent);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Don't auto-analyze - user needs to press capture button
      // This makes gallery selection work like camera capture
    }
  };


  const handleCameraCapture = async () => {
    // If user has already selected a file from gallery
    if (selectedFile) {
      if (barcodeScanningMode) {
        try {
          const result = await scanBarcodeFromImage(selectedFile);
          handleBarcodeScanned(result.barcode);
          return;
        } catch (error) {
          console.error("Barcode detection failed:", error);
          setBarcodeScanningMode(false);
          setShowManualEntry(true);
          toast({
            title: "No Barcode Found",
            description: "We couldn't detect a barcode in this image. Please enter the barcode manually.",
            variant: "default",
          });
          return;
        }
      } else {
        analysisMutation.mutate(selectedFile);
        return;
      }
    }
    
    // Use Capacitor Camera API if available (native app)
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
        });
        
        // Convert base64 to File object
        const response = await fetch(`data:image/jpeg;base64,${image.base64String}`);
        const blob = await response.blob();
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        
        if (barcodeScanningMode) {
          try {
            const result = await scanBarcodeFromImage(file);
            handleBarcodeScanned(result.barcode);
            return;
          } catch (error) {
            console.error("Barcode detection failed:", error);
            setBarcodeScanningMode(false);
            setShowManualEntry(true);
            toast({
              title: "No Barcode Found",
              description: "We couldn't detect a barcode in this photo. Please enter the barcode manually.",
              variant: "default",
            });
            return;
          }
        } else {
          // Auto-analyze the captured photo for food
          analysisMutation.mutate(file);
        }
      } catch (error: any) {
        console.error('Error taking photo:', error);
        
        // Handle user cancellation gracefully
        if (error?.message?.includes('User cancelled') || error?.message?.includes('cancel')) {
          return;
        }
        
        toast({
          title: "Camera Error",
          description: error?.message || "Failed to access camera. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // For web browsers, use camera input
      if (!cameraInputRef.current) {
        console.error("Camera input ref is null");
        toast({
          title: "Camera Error",
          description: "Camera input not available. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        cameraInputRef.current?.click();
      } catch (error) {
        console.error("Error triggering camera input:", error);
        toast({
          title: "Camera Error", 
          description: "Failed to open camera. Your browser may not support camera access.",
          variant: "destructive",
        });
      }
    }
  };

  // Toggle flash for camera
  const handleFlashToggle = () => {
    setFlashEnabled(!flashEnabled);
    toast({
      title: flashEnabled ? "Flash Disabled" : "Flash Enabled",
      description: `Camera flash is now ${flashEnabled ? 'off' : 'on'}`,
    });
  };

  const handleGallerySelect = () => {
    // Use file input for reliable gallery access across all platforms
    fileInputRef.current?.click();
  };

  return (
    <div className="relative p-1">
      {/* Camera View Container */}
      <div 
        className="relative aspect-square overflow-hidden rounded-3xl shadow-lg border border-white/20 cursor-pointer transition-all duration-200 hover:shadow-xl" 
        style={{background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)'}}
        onClick={handleCameraCapture}
        data-testid="camera-panel-clickable"
        role="button"
        aria-label={previewUrl ? "Analyze selected food image" : "Take or select a photo of your food"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCameraCapture();
          }
        }}
      >
        
        {/* Static Image Preview */}
        {previewUrl && (
          <img 
            src={previewUrl} 
            alt="Selected food image for analysis" 
            className="w-full h-full object-cover rounded-3xl"
            data-testid="img-preview"
          />
        )}
        
        
        {/* Plate detection circle - only show when has preview */}
        {previewUrl && (
          <div className="absolute inset-16 border border-white/30 rounded-full border-dashed" aria-hidden="true"></div>
        )}
        
      </div>
      


      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file"
        aria-label="Select food image from gallery"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-camera"
        aria-label="Take photo of food with camera"
      />

      {/* Camera Barcode Scanner Modal */}
      <ScannerModal
        isOpen={showBarcodeScanner}
        onScanSuccess={(barcode: string) => {
          setBarcodeScanningMode(false);
          handleBarcodeScanned(barcode);
        }}
        onClose={() => {
          setShowBarcodeScanner(false);
          setBarcodeScanningMode(false);
        }}
      />

      {/* Manual Barcode Entry */}
      <BarcodeScanner
        isOpen={showManualEntry}
        onScanSuccess={(barcode: string) => {
          setShowManualEntry(false);
          setBarcodeScanningMode(false);
          handleBarcodeScanned(barcode);
        }}
        onClose={() => {
          setShowManualEntry(false);
          setBarcodeScanningMode(false);
        }}
      />
    </div>
  );
}
