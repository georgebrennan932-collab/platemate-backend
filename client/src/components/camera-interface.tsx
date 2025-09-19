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
  onAnalysisStart: (requestId: string) => void;
  onAnalysisSuccess: (data: FoodAnalysis, requestId: string) => void;
  onAnalysisError: (error: string, requestId: string) => void;
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
  
  // Single-flight protection for Android WebView race conditions
  const isAnalyzingRef = useRef(false);

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
    mutationFn: async ({ file, requestId }: { file: File; requestId: string }) => {
      const isAndroid = navigator.userAgent.includes('Android');
      console.log(`📸 Starting image analysis [${requestId}] (${isAndroid ? 'Android' : 'Browser'}):`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        platform: isAndroid ? 'Android WebView' : 'Desktop Browser'
      });
      
      const formData = new FormData();
      formData.append('image', file);
      
      console.log("🚀 Sending request to /api/analyze...");
      
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });

        console.log("📡 Response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          platform: isAndroid ? 'Android' : 'Browser',
          headers: Array.from(response.headers.entries()),
          url: response.url
        });

        // Always parse the response body first
        let result;
        try {
          result = await response.json();
          console.log("📄 Raw response data:", {
            ...result,
            platform: isAndroid ? 'Android' : 'Browser'
          });
        } catch (parseError) {
          console.error("❌ Failed to parse JSON response:", parseError);
          throw new Error('Invalid response from server');
        }
        
        // Critical Android fix: Check for valid analysis data regardless of HTTP status
        const hasValidAnalysisData = result && 
                                   result.detectedFoods && 
                                   Array.isArray(result.detectedFoods) && 
                                   result.detectedFoods.length > 0;
        
        if (hasValidAnalysisData) {
          console.log("✅ Valid food analysis data found:", {
            confidence: result.confidence,
            needsConfirmation: result.needsConfirmation,
            foodCount: result.detectedFoods.length,
            isAIUnavailable: result.isAITemporarilyUnavailable,
            platform: isAndroid ? 'Android' : 'Browser',
            httpStatus: response.status
          });
          
          // Ensure needsConfirmation is set for low confidence
          if (typeof result.confidence === 'number' && result.confidence < 90) {
            result.needsConfirmation = true;
            if (!result.confirmationMessage) {
              result.confirmationMessage = `AI confidence is ${result.confidence}% - please review the detected foods`;
            }
            console.log(`⚠️ Low confidence (${result.confidence}%) detected - ensuring needsConfirmation is set`);
          }
          
          return result;
        }
        
        // If no valid analysis data and response is not ok, treat as error
        if (!response.ok) {
          console.error("❌ No valid analysis data and HTTP error:", {
            status: response.status,
            error: result?.error,
            platform: isAndroid ? 'Android' : 'Browser'
          });
          throw new Error(result?.error || 'Analysis failed');
        }

        console.log("✅ Analysis successful:", {
          confidence: result.confidence,
          needsConfirmation: result.needsConfirmation,
          foodCount: result.detectedFoods?.length,
          isAIUnavailable: result.isAITemporarilyUnavailable
        });
        return result;
        
      } catch (fetchError) {
        console.error("❌ Network/fetch error:", {
          error: fetchError,
          platform: isAndroid ? 'Android' : 'Browser'
        });
        throw fetchError;
      }
    },
    onMutate: ({ requestId }) => {
      console.log(`🔄 Analysis mutation starting... [${requestId}]`);
      isAnalyzingRef.current = true;
      onAnalysisStart(requestId);
    },
    onSuccess: (data: FoodAnalysis, variables) => {
      const { requestId } = variables;
      console.log(`🎉 Analysis success callback triggered [${requestId}]:`, {
        hasData: !!data,
        confidence: data?.confidence,
        needsConfirmation: data?.needsConfirmation,
        hasDetectedFoods: !!(data?.detectedFoods?.length),
        foodCount: data?.detectedFoods?.length,
        platform: navigator.userAgent.includes('Android') ? 'Android' : 'Browser'
      });
      onAnalysisSuccess(data, requestId);
    },
    onError: (error: Error, variables) => {
      const { requestId } = variables;
      console.error(`💥 Analysis error callback triggered [${requestId}]:`, {
        errorMessage: error.message,
        platform: navigator.userAgent.includes('Android') ? 'Android' : 'Browser',
        stack: error.stack
      });
      onAnalysisError(error.message, requestId);
    },
    onSettled: () => {
      console.log('🧹 Analysis settled, clearing single-flight guard');
      isAnalyzingRef.current = false;
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const isAndroid = navigator.userAgent.includes('Android');
      console.log(`📁 ANDROID=[${isAndroid}] File select triggered: files=${event.target.files?.length || 0}`);
      
      const file = event.target.files?.[0];
      if (!file) {
        console.log("❌ No file selected");
        return;
      }
      
      console.log(`📄 ANDROID=[${isAndroid}] File: ${file.name} ${file.size} bytes ${file.type}`);
      
      // Skip image type validation on Android - some devices report wrong MIME types
      if (!isAndroid && !file.type.startsWith('image/')) {
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
      
      // Single-flight protection
      if (isAnalyzingRef.current) {
        console.log('⏭️ Analysis already in progress');
        return;
      }
      
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🚀 ANDROID=[${isAndroid}] Starting analysis [${requestId}]`);
      
      // ANDROID DIRECT FIX: Start analysis immediately
      analysisMutation.mutate({ file, requestId });
      
      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error("💥 File select error:", error);
      toast({
        title: "Camera Error",
        description: "Please try taking the photo again.",
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
    const isAndroid = navigator.userAgent.includes('Android');
    console.log(`📷 ANDROID=[${isAndroid}] Camera capture requested`);
    
    // If there's already a selected file, analyze it
    if (selectedFile && !isAnalyzingRef.current) {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🖼️ ANDROID=[${isAndroid}] Analyzing existing file [${requestId}]`);
      analysisMutation.mutate({ file: selectedFile, requestId });
      return;
    }
    
    // Direct camera approach - especially important for Android
    console.log(`🌐 ANDROID=[${isAndroid}] Opening camera/file picker...`);
    
    // For Android, use the direct capture button which has worked better
    const directCameraInput = document.querySelector('[data-testid="input-direct-camera"]') as HTMLInputElement;
    if (directCameraInput) {
      console.log(`✅ ANDROID=[${isAndroid}] Using direct camera input`);
      directCameraInput.click();
      return;
    }
    
    // Fallback to regular camera input
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
      console.log(`🎯 ANDROID=[${isAndroid}] Camera input clicked`);
    } else {
      console.error(`❌ ANDROID=[${isAndroid}] No camera input available!`);
      toast({
        title: "Camera Error",
        description: "Camera not available. Please try the gallery button instead.",
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
            
            {/* Main Capture button - Direct file input trigger */}
            <label 
              className="w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center border-2 border-white/20 transition-all duration-200 cursor-pointer"
              data-testid="button-capture"
              title="Take Photo"
            >
              <Camera className="text-white h-8 w-8" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-direct-camera"
                key={Date.now()} // Force recreation to avoid cached issues
              />
            </label>
            
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

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file"
      />
    </div>
  );
}
