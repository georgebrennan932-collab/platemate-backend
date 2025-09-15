import { useState, useRef, useEffect } from "react";
import { Images, Zap, Camera, CloudUpload, Syringe } from "lucide-react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { mediaService } from '@/lib/media-service';
import { useToast } from "@/hooks/use-toast";
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Auto-analyze the selected file
      analysisMutation.mutate(file);
    }
  };


  const handleCameraCapture = async () => {
    console.log("📷 Camera capture requested");
    console.log("🔍 Platform check:", {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform()
    });
    
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
      cameraInputRef.current?.click();
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
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 aspect-square overflow-hidden rounded-[2.5rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8)] border border-slate-600/30 backdrop-blur-xl">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
        
        {/* Static Image Preview */}
        {previewUrl && (
          <img 
            src={previewUrl} 
            alt="Selected food image" 
            className="w-full h-full object-cover rounded-[2.5rem]"
            data-testid="img-preview"
          />
        )}
        
        {/* Default Camera Icon */}
        {!previewUrl && (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-700/80 rounded-xl flex items-center justify-center border border-slate-600/50">
                <Camera className="text-white h-8 w-8" />
              </div>
              <p className="text-white/70 text-sm mt-2">
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
          <div className="flex items-center justify-center space-x-4">
            {/* Gallery button */}
            <button 
              className="w-12 h-12 bg-slate-700/80 rounded-xl flex items-center justify-center border border-slate-600/50 hover:bg-slate-600/80 transition-colors duration-200"
              onClick={handleGallerySelect}
              data-testid="button-gallery"
              title="Select from Gallery"
            >
              <Images className="text-white h-5 w-5" />
            </button>
            
            {/* Main Capture button */}
            <button 
              className="w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center border-2 border-white/20 transition-all duration-200"
              onClick={handleCameraCapture}
              data-testid="button-capture"
              title="Take Photo"
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
    </div>
  );
}
