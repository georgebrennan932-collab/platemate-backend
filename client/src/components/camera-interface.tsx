import { useState, useRef } from "react";
import { Images, Zap, Camera, CloudUpload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import type { FoodAnalysis } from "@shared/schema";
import plateMateLogoUrl from "@/assets/platemate-logo.png";

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
      <div className="relative bg-black aspect-square overflow-hidden">
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Selected food image" 
            className="w-full h-full object-cover"
            data-testid="img-preview"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <p className="text-white text-center px-4">
              Use camera or select image from gallery
            </p>
          </div>
        )}
        
        {/* Camera overlay guides */}
        <div className="absolute inset-0 camera-viewfinder pointer-events-none"></div>
        
        {/* Plate detection overlay */}
        <div className="absolute inset-8 border-2 border-primary rounded-full border-dashed opacity-60 pulse-green"></div>
        
        {/* Top overlay with instructions */}
        <div className="absolute top-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
          <p className="text-sm text-center" data-testid="text-instructions">
            Position your plate within the circle
          </p>
        </div>
        
        {/* Camera controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-6">
          {/* Gallery button */}
          <button 
            className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-colors"
            onClick={handleGallerySelect}
            data-testid="button-gallery"
          >
            <Images className="text-white h-5 w-5" />
          </button>
          
          {/* Capture button */}
          <button 
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-xl border-4 border-white hover:scale-105 transition-transform"
            onClick={handleCameraCapture}
            data-testid="button-capture"
          >
            <Camera className="text-primary-foreground h-6 w-6" />
          </button>
          
          {/* Flash toggle */}
          <button 
            className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-colors"
            data-testid="button-flash"
          >
            <Zap className="text-white h-5 w-5" />
          </button>
        </div>
        
        {/* PlateMate Logo */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <img 
            src={plateMateLogoUrl} 
            alt="PlateMate Logo" 
            className="w-40 h-40 opacity-80"
            data-testid="platemate-logo"
          />
        </div>
      </div>
      
      {/* Upload alternative */}
      <div className="p-4 bg-secondary/50">
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <CloudUpload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2" data-testid="text-upload-prompt">
            Or upload a photo from your gallery
          </p>
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
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
