import { useState, useRef, useEffect } from "react";
import { Images, Zap, Camera, CloudUpload, Syringe, QrCode } from "lucide-react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
  onAnalysisError: (error: string) => void;
}

export function CameraInterface({
  onAnalysisStart,
  onAnalysisSuccess,
  onAnalysisError,
}: CameraInterfaceProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
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
      onAnalysisError(error.message);
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
      toast({
        title: "Barcode Not Found",
        description: error.message,
        variant: "destructive",
      });
      setShowBarcodeScanner(false);
      onAnalysisError(error.message);
    },
  });

  const handleBarcodeScanned = (barcode: string) => {
    console.log("📷 Barcode scanned in camera interface:", barcode);
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
      platform: Capacitor.getPlatform()
    });
    
    // If user has already selected a file from gallery, analyze it
    if (selectedFile) {
      console.log("🖼️ Gallery image selected, starting analysis...");
      analysisMutation.mutate(selectedFile);
      return;
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
        
        console.log("🎯 Starting auto-analysis...");
        // Auto-analyze the captured photo
        analysisMutation.mutate(file);
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
        className="relative aspect-square overflow-hidden rounded-3xl shadow-2xl border border-slate-600/20 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-3xl" 
        style={{backgroundColor: '#1F2937'}}
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
        
        {/* Default Camera Icon */}
        {!previewUrl && (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <div className="relative z-10 text-center transition-all duration-200 hover:scale-110">
              <div className="w-20 h-20 mx-auto bg-slate-600/60 rounded-2xl flex items-center justify-center transition-all duration-200 hover:bg-slate-500/70">
                <Camera className="text-white h-10 w-10 transition-all duration-200 hover:scale-110" />
              </div>
              <p className="text-white/90 text-base mt-4 font-medium transition-all duration-200 hover:text-white">
                Tap to take photo
              </p>
            </div>
          </div>
        )}
        
        {/* Plate detection circle - only show when has preview */}
        {previewUrl && (
          <div className="absolute inset-16 border border-white/30 rounded-full border-dashed"></div>
        )}
        
        {/* Camera Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center justify-center space-x-3">
            {/* Gallery button */}
            <button 
              className="w-12 h-12 bg-slate-700/80 rounded-xl flex items-center justify-center border border-slate-600/50 hover:bg-slate-600/80 transition-colors duration-200"
              onClick={handleGallerySelect}
              data-testid="button-gallery"
              title="Select from Gallery"
            >
              <Images className="text-white h-5 w-5" />
            </button>
            
            {/* Barcode scanner button - SAFE manual entry only */}
            <button 
              className="w-12 h-12 bg-orange-600/90 rounded-xl flex items-center justify-center border-2 border-orange-400/50 hover:bg-orange-500/90 transition-colors duration-200 shadow-lg"
              onClick={() => {
                console.log("🔍 BARCODE BUTTON CLICKED - Opening manual entry dialog");
                setShowManualEntry(true);
              }}
              data-testid="button-barcode"
              title="📋 Enter Barcode Number"
            >
              <QrCode className="text-white h-6 w-6" />
            </button>
            
            {/* Main Capture button */}
            <button 
              className="w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center border-2 border-white/20 transition-all duration-200"
              onClick={() => {
                console.log("📷 MAIN CAMERA BUTTON CLICKED - Taking photo");
                handleCameraCapture();
              }}
              data-testid="button-capture"
              title="📷 Take Food Photo"
            >
              <Camera className="text-white h-8 w-8" />
            </button>
            
            {/* Flash toggle button */}
            <button 
              className={`w-12 h-12 rounded-xl flex items-center justify-center border border-slate-600/50 transition-all duration-200 ${
                flashEnabled
                  ? 'bg-yellow-600 hover:bg-yellow-500'
                  : 'bg-slate-700/80 hover:bg-slate-600/80'
              }`}
              onClick={handleFlashToggle}
              data-testid="button-flash"
              title={flashEnabled ? 'Flash On' : 'Flash Off'}
            >
              <Zap className="text-white h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Scale tip */}
      <div className="mt-4 text-center">
        <p className="text-sm text-white font-medium bg-slate-800/80 backdrop-blur-xl border border-slate-600/50 rounded-2xl px-4 py-3 inline-block" data-testid="text-scale-advice">
          💡 For more precise portion analysis, place a fork or your hand in the photo.
        </p>
      </div>

      {/* Injection Advice Quick Access */}
      <div className="mt-4 text-center">
        <Link href="/injection-advice">
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto border border-white/10 backdrop-blur-xl" data-testid="button-injection-advice-quick">
            <Syringe className="h-5 w-5" />
            <span>Weight Loss Injection Guide</span>
          </button>
        </Link>
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
        onScanSuccess={handleBarcodeScanned}
        onClose={() => setShowBarcodeScanner(false)}
      />

      {/* Manual Barcode Entry */}
      <BarcodeScanner
        isOpen={showManualEntry}
        onScanSuccess={(barcode: string) => {
          setShowManualEntry(false);
          handleBarcodeScanned(barcode);
        }}
        onClose={() => setShowManualEntry(false)}
      />
    </div>
  );
}
