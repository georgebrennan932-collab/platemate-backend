import { useState, useRef } from "react";
import { Images, Zap, Camera, CloudUpload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
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
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      return response.json();
    },
    onMutate: () => {
      onAnalysisStart();
    },
    onSuccess: (data: FoodAnalysis) => {
      onAnalysisSuccess(data);
    },
    onError: (error: Error) => {
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

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
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
      <div className="p-6 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
        <div className="border-2 border-dashed border-gradient-to-r from-blue-300 to-purple-400 dark:from-blue-600 dark:to-purple-500 rounded-2xl p-8 text-center bg-gradient-to-br from-white/80 to-blue-50/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <CloudUpload className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-700 dark:text-slate-300 mb-4 font-medium" data-testid="text-upload-prompt">
            Or upload a photo from your gallery
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Drag & drop or choose a file to analyze your food
          </p>
          <button 
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            onClick={handleGallerySelect}
            data-testid="button-upload"
          >
            Choose File
          </button>
        </div>
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
