import { useState, useRef, useEffect } from "react";
import { Images, Zap, Camera, CloudUpload, Syringe, QrCode, Flame } from "lucide-react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { mediaService } from '@/lib/media-service';
import { useToast } from "@/hooks/use-toast";
import { ScannerModal } from "@/components/scanner-modal";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { scanBarcodeFromImage } from "@/services/scanner-service";
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
      console.log("📸 Starting image analysis:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const formData = new FormData();
      formData.append('image', file);
      
      console.log("🚀 Sending request to /api/analyze...");
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      console.log("📡 Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ API Error:", errorData);
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      console.log("✅ Analysis successful:", result);
      return result;
    },
    onMutate: () => {
      console.log("🔄 Analysis mutation starting...");
      onAnalysisStart();
    },
    onSuccess: (data: FoodAnalysis) => {
      console.log("🎉 Analysis success callback triggered:", data);
      onAnalysisSuccess(data);
    },
    onError: (error: Error) => {
      console.error("💥 Analysis error callback triggered:", error);
      onAnalysisError(error.message, 'food');
    },
  });


  const barcodeMutation = useMutation({
    mutationFn: async (barcode: string) => {
      console.log("🔍 Looking up barcode:", barcode);
      
      const response = await fetch('/api/barcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Barcode lookup failed');
      }

      const result = await response.json();
      console.log("✅ Barcode lookup successful:", result);
      return result;
    },
    onMutate: () => {
      console.log("🔄 Barcode lookup starting...");
      onAnalysisStart();
    },
    onSuccess: (data: FoodAnalysis) => {
      console.log("🎉 Barcode lookup success:", data);
      setShowBarcodeScanner(false);
      onAnalysisSuccess(data);
    },
    onError: (error: Error) => {
      console.error("💥 Barcode lookup error:", error);
      
      // If product not found, fallback to manual entry
      if (error.message.includes("Product not found") || error.message.includes("not found")) {
        console.log("🔄 Product not found, opening manual entry fallback");
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
    console.log("📷 Barcode scanned in camera interface:", {
      barcode,
      length: barcode.length,
      type: barcode.length === 12 ? 'UPC-A' : barcode.length === 13 ? 'EAN-13' : 'Other'
    });
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
    const inputType = event.target.getAttribute('capture') ? 'camera' : 'gallery';
    
    console.log("📁 File selected:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      inputType: inputType
    });
    
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      console.log(`✅ ${inputType} file processed successfully`);
      
      // Don't auto-analyze - user needs to press capture button
      // This makes gallery selection work like camera capture
    } else {
      console.warn(`⚠️ No file was selected from ${inputType}`);
    }
  };


  const handleCameraCapture = async () => {
    console.log("📷 Camera capture requested");
    console.log("🔍 Platform check:", {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      barcodeScanningMode
    });
    
    // If user has already selected a file from gallery
    if (selectedFile) {
      if (barcodeScanningMode) {
        console.log("🔍 Barcode scanning mode: Scanning image for barcode...");
        console.log("📁 Selected file details:", {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type
        });
        try {
          const result = await scanBarcodeFromImage(selectedFile);
          console.log("✅ Barcode found in image:", result.barcode);
          handleBarcodeScanned(result.barcode);
          return;
        } catch (error) {
          console.error("❌ Barcode detection failed:", error);
          console.log("❌ No barcode found in image, falling back to manual entry");
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
        console.log("🖼️ Gallery image selected, starting food analysis...");
        analysisMutation.mutate(selectedFile);
        return;
      }
    }
    
    // Use Capacitor Camera API if available (native app)
    if (Capacitor.isNativePlatform()) {
      try {
        console.log("📱 Using Capacitor camera...");
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
        });
        
        console.log("📸 Photo captured successfully:", {
          hasBase64: !!image.base64String,
          base64Length: image.base64String?.length || 0
        });
        
        // Convert base64 to File object
        const response = await fetch(`data:image/jpeg;base64,${image.base64String}`);
        const blob = await response.blob();
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        
        console.log("📄 File created:", {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
        
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        
        if (barcodeScanningMode) {
          console.log("🔍 Barcode scanning mode: Scanning captured photo for barcode...");
          console.log("📷 File details:", {
            name: file.name,
            size: file.size,
            type: file.type
          });
          try {
            const result = await scanBarcodeFromImage(file);
            console.log("✅ Barcode found in captured photo:", result.barcode);
            handleBarcodeScanned(result.barcode);
            return;
          } catch (error) {
            console.error("❌ Barcode detection failed:", error);
            console.log("❌ No barcode found in captured photo, falling back to manual entry");
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
          console.log("🎯 Starting food analysis...");
          // Auto-analyze the captured photo for food
          analysisMutation.mutate(file);
        }
      } catch (error) {
        console.error('❌ Error taking photo:', error);
        // Fall back to web camera input
        cameraInputRef.current?.click();
      }
    } else {
      // For web browsers, use camera input
      console.log("🌐 Using web camera input...");
      
      // Check if the camera input element exists
      if (!cameraInputRef.current) {
        console.error("❌ Camera input ref is null");
        toast({
          title: "Camera Error",
          description: "Camera input not available. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      
      console.log("📱 Camera input element found, triggering click...");
      
      try {
        // Add click event listener to detect if camera dialog opens
        const handleCameraDialogOpen = () => {
          console.log("📸 Camera dialog opened successfully");
        };
        
        cameraInputRef.current.addEventListener('click', handleCameraDialogOpen, { once: true });
        cameraInputRef.current?.click();
        
        console.log("✅ Camera input click triggered");
      } catch (error) {
        console.error("❌ Error triggering camera input:", error);
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
      >
        
        {/* Static Image Preview */}
        {previewUrl && (
          <img 
            src={previewUrl} 
            alt="Selected food image" 
            className="w-full h-full object-cover rounded-3xl"
            data-testid="img-preview"
          />
        )}
        
        
        {/* Plate detection circle - only show when has preview */}
        {previewUrl && (
          <div className="absolute inset-16 border border-white/30 rounded-full border-dashed"></div>
        )}
        
      </div>
      
      {/* Scale tip */}
      <div className="mt-4 text-center">
        <p className="text-sm text-white font-medium bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 inline-block" data-testid="text-scale-advice">
          💡 For more precise portion analysis, place a fork or your hand in the photo.
        </p>
      </div>


      {/* Hidden file inputs */}
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
