import { useState, useRef } from "react";
import { Images, Zap, Camera, CloudUpload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      console.log("🌐 Using web camera input...");
      // Use web camera input for browsers
      cameraInputRef.current?.click();
    }
  };

  const handleGallerySelect = async () => {
    // Use Capacitor Camera API for gallery selection if available (native app)
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Photos,
        });
        
        // Convert base64 to File object
        const response = await fetch(`data:image/jpeg;base64,${image.base64String}`);
        const blob = await response.blob();
        const file = new File([blob], 'gallery-photo.jpg', { type: 'image/jpeg' });
        
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        
        // Auto-analyze the selected photo
        analysisMutation.mutate(file);
      } catch (error) {
        console.error('Error selecting photo:', error);
        // Fall back to file input
        fileInputRef.current?.click();
      }
    } else {
      // Use file input for browsers
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="relative p-1">
      {/* Camera View Container */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 aspect-square overflow-hidden rounded-[2.5rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8)] border border-slate-600/30 backdrop-blur-xl">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
        
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Selected food image" 
            className="w-full h-full object-cover rounded-[2.5rem]"
            data-testid="img-preview"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            {/* Simple center content */}
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-700/80 rounded-xl flex items-center justify-center border border-slate-600/50">
                <Camera className="text-white h-8 w-8" />
              </div>
            </div>
          </div>
        )}
        
        {/* Simple plate detection circle */}
        <div className="absolute inset-16 border border-white/30 rounded-full border-dashed"></div>
        
        {/* Simple Camera controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
          {/* Gallery button */}
          <button 
            className="w-12 h-12 bg-slate-700/80 rounded-xl flex items-center justify-center border border-slate-600/50 hover:bg-slate-600/80 transition-colors duration-200"
            onClick={handleGallerySelect}
            data-testid="button-gallery"
          >
            <Images className="text-white h-5 w-5" />
          </button>
          
          {/* Capture button */}
          <button 
            className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white/20 hover:bg-blue-500 transition-colors duration-200"
            onClick={handleCameraCapture}
            data-testid="button-capture"
          >
            <Camera className="text-white h-8 w-8" />
          </button>
          
          {/* Flash toggle */}
          <button 
            className="w-12 h-12 bg-slate-700/80 rounded-xl flex items-center justify-center border border-slate-600/50 hover:bg-slate-600/80 transition-colors duration-200"
            data-testid="button-flash"
          >
            <Zap className="text-white h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Enhanced Upload alternative */}

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
