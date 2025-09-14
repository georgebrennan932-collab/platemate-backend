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
            {/* Refined background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-1/3 left-1/3 w-40 h-40 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/3 right-1/3 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-2xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-indigo-400 to-blue-400 rounded-full blur-xl animate-pulse delay-500 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            
            {/* Center content */}
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25 border border-white/10">
                <Camera className="text-white h-10 w-10" />
              </div>
            </div>
          </div>
        )}
        
        {/* Sleeker plate detection overlay */}
        <div className="absolute inset-12 border-2 border-gradient-to-r from-blue-400/60 via-purple-400/60 to-pink-400/60 rounded-full border-dashed opacity-80 animate-pulse shadow-2xl">
          <div className="absolute inset-3 border border-white/15 rounded-full"></div>
          <div className="absolute inset-6 border border-white/10 rounded-full"></div>
        </div>
        
        {/* Modern top overlay with instructions */}
        <div className="absolute top-6 left-6 right-6 z-20 bg-gradient-to-r from-black/70 via-slate-900/80 to-black/70 text-white px-6 py-4 rounded-2xl backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40">
          <p className="text-sm text-center font-semibold mb-1" data-testid="text-instructions">
            Position your plate within the circle
          </p>
          <p className="text-xs text-center text-gray-200 mt-2 leading-relaxed opacity-90" data-testid="text-scale-tip">
            💡 <strong>Pro tip:</strong> Include a fork, hand, or coin in the photo to help AI determine scale for more accurate portion sizes
          </p>
          <div className="flex items-center justify-center mt-3 space-x-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping shadow-lg shadow-emerald-400/50"></div>
            <span className="text-xs text-emerald-400 font-medium">Ready to scan</span>
          </div>
        </div>
        
        {/* Sleeker Camera controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-6">
          {/* Gallery button */}
          <button 
            className="w-16 h-16 bg-gradient-to-br from-slate-700/80 to-slate-800/80 rounded-2xl flex items-center justify-center backdrop-blur-2xl border border-white/15 hover:from-slate-600/80 hover:to-slate-700/80 transition-all duration-500 shadow-2xl hover:scale-110 hover:shadow-blue-400/30 hover:border-blue-400/30"
            onClick={handleGallerySelect}
            data-testid="button-gallery"
          >
            <Images className="text-white h-6 w-6" />
          </button>
          
          {/* Capture button */}
          <button 
            className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/40 border-2 border-white/20 hover:scale-110 transition-all duration-500 hover:shadow-purple-400/60 relative overflow-hidden"
            onClick={handleCameraCapture}
            data-testid="button-capture"
          >
            {/* Animated rings */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/30 to-purple-400/30 animate-ping"></div>
            <div className="absolute inset-2 rounded-3xl bg-gradient-to-br from-blue-300/20 to-purple-300/20 animate-pulse delay-500"></div>
            <Camera className="text-white h-10 w-10 relative z-10 drop-shadow-lg" />
          </button>
          
          {/* Flash toggle */}
          <button 
            className="w-16 h-16 bg-gradient-to-br from-slate-700/80 to-slate-800/80 rounded-2xl flex items-center justify-center backdrop-blur-2xl border border-white/15 hover:from-yellow-500/80 hover:to-orange-500/80 transition-all duration-500 shadow-2xl hover:scale-110 hover:shadow-yellow-400/30 hover:border-yellow-400/30"
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
