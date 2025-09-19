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
    try {
      console.log("📁 File select triggered:", {
        filesCount: event.target.files?.length || 0,
        hasFiles: !!event.target.files?.length
      });
      
      const file = event.target.files?.[0];
      if (!file) {
        console.log("❌ No file selected - user may have canceled");
        return;
      }
      
      console.log("📄 File details:", {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error("❌ Invalid file type:", file.type);
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      console.log("✅ File processed successfully, starting analysis...");
      
      // Auto-analyze the selected image immediately
      console.log("🔄 Starting auto-analysis...");
      analysisMutation.mutate(file);
      
      // Reset input value after processing
      event.target.value = '';
    } catch (error) {
      console.error("💥 Error in handleFileSelect:", error);
      toast({
        title: "Photo Error",
        description: "Failed to process the selected photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add a simple polling check for file input
  const checkFileInput = () => {
    if (cameraInputRef.current && cameraInputRef.current.files && cameraInputRef.current.files.length > 0) {
      console.log("🔍 Polling detected file in input:", cameraInputRef.current.files.length);
      const mockEvent = {
        target: cameraInputRef.current
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(mockEvent);
    }
  };


  const handleCameraCapture = async () => {
    try {
      console.log("📷 Camera capture requested");
      
      // If user has already selected a file from gallery, analyze it
      if (selectedFile) {
        console.log("🖼️ Gallery image selected, starting analysis...");
        analysisMutation.mutate(selectedFile);
        return;
      }
      
      // Simple direct approach for web browsers
      console.log("🌐 Opening camera selection...");
      if (cameraInputRef.current) {
        console.log("✅ Camera input ref exists, resetting and clicking...");
        
        // Reset input
        cameraInputRef.current.value = '';
        
        // Add event listener for when files are detected
        const checkForFiles = () => {
          console.log("🔍 Checking for files...");
          if (cameraInputRef.current?.files?.length) {
            console.log("🎯 Files detected:", cameraInputRef.current.files.length);
            handleFileSelect({
              target: cameraInputRef.current
            } as React.ChangeEvent<HTMLInputElement>);
          }
        };
        
        // Listen for focus back to window (user returns from camera)
        const handleVisibilityChange = () => {
          if (!document.hidden) {
            console.log("📱 Window focus returned, checking for files...");
            setTimeout(checkForFiles, 100);
            setTimeout(checkForFiles, 500);
            setTimeout(checkForFiles, 1000);
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange, { once: true });
        
        // Cleanup listener after 10 seconds
        setTimeout(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          console.log("🧹 Cleaned up visibility listener");
        }, 10000);
        
        cameraInputRef.current.click();
        console.log("🎯 Camera input clicked, waiting for user to take photo...");
      } else {
        console.error("❌ Camera input ref is null!");
        toast({
          title: "Camera Error",
          description: "Camera not available. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 Error in handleCameraCapture:', error);
      toast({
        title: "Camera Error", 
        description: "Failed to open camera. Please try again.",
        variant: "destructive",
      });
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
        accept="image/*;capture=camera"
        onChange={handleFileSelect}
        onInput={handleFileSelect}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          left: '-9999px'
        }}
        data-testid="input-camera"
      />
    </div>
  );
}
