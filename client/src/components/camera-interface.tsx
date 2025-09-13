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
    <div className="relative">
      {/* Camera View */}
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/20 to-black aspect-square overflow-hidden rounded-3xl shadow-2xl border border-slate-700/50 modern-card">
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Selected food image" 
            className="w-full h-full object-cover rounded-2xl"
            data-testid="img-preview"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 via-gray-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-purple-500 rounded-full blur-2xl animate-pulse delay-1000"></div>
            </div>
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Camera className="text-white h-8 w-8" />
              </div>
              <p className="text-white text-center px-4 font-medium">
                Use camera or select image from gallery
              </p>
              <p className="text-gray-400 text-sm mt-2 px-4">
                Point at your food and capture
              </p>
            </div>
          </div>
        )}
        
        {/* Enhanced plate detection overlay */}
        <div className="absolute inset-8 border-3 border-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full border-dashed opacity-70 animate-pulse shadow-lg">
          <div className="absolute inset-2 border-2 border-white/20 rounded-full"></div>
        </div>
        
        {/* Enhanced top overlay with instructions */}
        <div className="absolute top-4 left-4 right-4 bg-gradient-to-r from-black/80 via-slate-900/80 to-black/80 text-white p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-xl">
          <p className="text-sm text-center font-medium" data-testid="text-instructions">
            Position your plate within the circle
          </p>
          <div className="flex items-center justify-center mt-2 space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            <span className="text-xs text-green-400 font-medium">Ready to scan</span>
          </div>
        </div>
        
        {/* Enhanced Camera controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
          {/* Gallery button */}
          <button 
            className="w-14 h-14 bg-gradient-to-br from-slate-700/90 to-slate-800/90 rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/20 hover:from-slate-600/90 hover:to-slate-700/90 transition-all duration-300 shadow-2xl hover:scale-110 hover:shadow-blue-500/25"
            onClick={handleGallerySelect}
            data-testid="button-gallery"
          >
            <Images className="text-white h-6 w-6" />
          </button>
          
          {/* Capture button */}
          <button 
            className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30 hover:scale-110 transition-all duration-300 hover:shadow-purple-500/50 relative overflow-hidden"
            onClick={handleCameraCapture}
            data-testid="button-capture"
          >
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 animate-ping opacity-30"></div>
            <Camera className="text-white h-8 w-8 relative z-10" />
          </button>
          
          {/* Flash toggle */}
          <button 
            className="w-14 h-14 bg-gradient-to-br from-slate-700/90 to-slate-800/90 rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/20 hover:from-yellow-600/90 hover:to-orange-700/90 transition-all duration-300 shadow-2xl hover:scale-110 hover:shadow-yellow-500/25"
            data-testid="button-flash"
          >
            <Zap className="text-white h-6 w-6" />
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
