import { useState, useRef, useEffect } from "react";
import { Images, Zap, Camera, CloudUpload, Syringe, Mic, MicOff, RotateCcw, Play, Square } from "lucide-react";
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
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState({ camera: false, microphone: false });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize permissions check and cleanup
  useEffect(() => {
    const initializeMedia = async () => {
      if (!mediaService.isMediaSupported()) {
        toast({
          title: "Media Not Supported",
          description: "Camera and microphone features require a modern browser with HTTPS",
          variant: "destructive",
        });
        return;
      }

      // Check current permissions
      const permissions = await mediaService.checkPermissions();
      setPermissionsGranted(permissions);
      
      console.log('📱 Media permissions status:', permissions);
    };

    initializeMedia();

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

  // Start live camera stream
  const handleStartLiveCamera = async () => {
    if (!videoRef.current) return;

    try {
      console.log("📹 Starting live camera stream...");
      await mediaService.startCamera(videoRef.current, { facingMode: 'environment' });
      setIsLiveCameraActive(true);
      setPreviewUrl(''); // Clear any static preview

      toast({
        title: "Camera Started",
        description: "Live camera preview is now active",
      });
    } catch (error: any) {
      console.error('❌ Failed to start camera:', error);
      toast({
        title: "Camera Error",
        description: error.message || "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop live camera stream
  const handleStopLiveCamera = () => {
    mediaService.stopCamera();
    setIsLiveCameraActive(false);
    console.log("⏹️ Live camera stream stopped");
  };

  // Capture photo from live stream
  const handleCaptureFromStream = async () => {
    if (!videoRef.current || !isLiveCameraActive) {
      console.warn("⚠️ No active camera stream to capture from");
      return;
    }

    try {
      console.log("📸 Capturing photo from live stream...");
      
      // Use canvas to capture current video frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx || !videoRef.current.videoWidth) {
        throw new Error('Video not ready for capture');
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create photo blob'));
        }, 'image/jpeg', 0.9);
      });

      // Create file from blob
      const file = new File([blob], 'live-camera-photo.jpg', { type: 'image/jpeg' });
      
      console.log("📄 Photo captured from stream:", {
        fileName: file.name,
        fileSize: file.size,
        width: canvas.width,
        height: canvas.height
      });

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Stop live stream and analyze
      handleStopLiveCamera();
      analysisMutation.mutate(file);

    } catch (error) {
      console.error('❌ Failed to capture from stream:', error);
      toast({
        title: "Capture Failed",
        description: "Could not capture photo from camera stream",
        variant: "destructive",
      });
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
        // Fall back to live camera if supported, otherwise file input
        if (mediaService.isMediaSupported()) {
          await handleStartLiveCamera();
        } else {
          cameraInputRef.current?.click();
        }
      }
    } else {
      // For web browsers, try live camera first, then fall back to file input
      if (mediaService.isMediaSupported() && !isLiveCameraActive) {
        await handleStartLiveCamera();
      } else if (isLiveCameraActive) {
        await handleCaptureFromStream();
      } else {
        console.log("🌐 Using web camera input...");
        cameraInputRef.current?.click();
      }
    }
  };

  // Switch camera (front/back)
  const handleSwitchCamera = async () => {
    if (!isLiveCameraActive || !videoRef.current) return;

    try {
      console.log("🔄 Switching camera...");
      await mediaService.switchCamera(videoRef.current);
      
      toast({
        title: "Camera Switched",
        description: "Camera switched successfully",
      });
    } catch (error: any) {
      console.error('❌ Failed to switch camera:', error);
      toast({
        title: "Switch Failed",
        description: error.message || "Could not switch camera",
        variant: "destructive",
      });
    }
  };

  // Start microphone recording
  const handleStartMicrophoneRecording = async () => {
    try {
      console.log("🎤 Starting microphone recording...");
      await mediaService.startMicrophoneRecording();
      await mediaService.startAudioRecording();
      
      setIsMicrophoneActive(true);
      setIsRecording(true);
      setAudioBlob(null);

      toast({
        title: "Recording Started",
        description: "Microphone recording is now active",
      });
    } catch (error: any) {
      console.error('❌ Failed to start microphone:', error);
      toast({
        title: "Microphone Error",
        description: error.message || "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop microphone recording
  const handleStopMicrophoneRecording = async () => {
    if (!isRecording) return;

    try {
      console.log("⏹️ Stopping microphone recording...");
      const blob = await mediaService.stopAudioRecording();
      mediaService.stopMicrophone();
      
      setIsRecording(false);
      setIsMicrophoneActive(false);
      setAudioBlob(blob);

      console.log("🎵 Audio recorded:", {
        size: blob.size,
        type: blob.type
      });

      toast({
        title: "Recording Stopped",
        description: `Recorded ${Math.round(blob.size / 1024)}KB of audio`,
      });
    } catch (error: any) {
      console.error('❌ Failed to stop recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to save recording",
        variant: "destructive",
      });
    }
  };

  // Play recorded audio
  const handlePlayRecordedAudio = () => {
    if (!audioBlob) return;

    try {
      console.log("▶️ Playing recorded audio...");
      mediaService.playAudio(audioBlob);
      
      toast({
        title: "Playing Audio",
        description: "Playing your recorded audio",
      });
    } catch (error) {
      console.error('❌ Failed to play audio:', error);
      toast({
        title: "Playback Error",
        description: "Could not play recorded audio",
        variant: "destructive",
      });
    }
  };

  const handleGallerySelect = async () => {
    // Always use file input for reliable gallery access across all platforms
    // This bypasses Capacitor Camera API issues on some Android devices
    fileInputRef.current?.click();
  };

  return (
    <div className="relative p-1">
      {/* Camera View Container */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 aspect-square overflow-hidden rounded-[2.5rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8)] border border-slate-600/30 backdrop-blur-xl">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
        
        {/* Live Camera Video */}
        {isLiveCameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-[2.5rem]"
            data-testid="video-live-camera"
          />
        )}
        
        {/* Static Image Preview */}
        {previewUrl && !isLiveCameraActive && (
          <img 
            src={previewUrl} 
            alt="Selected food image" 
            className="w-full h-full object-cover rounded-[2.5rem]"
            data-testid="img-preview"
          />
        )}
        
        {/* Default Camera Icon */}
        {!previewUrl && !isLiveCameraActive && (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-700/80 rounded-xl flex items-center justify-center border border-slate-600/50">
                <Camera className="text-white h-8 w-8" />
              </div>
              <p className="text-white/70 text-sm mt-2">
                {mediaService.isMediaSupported() ? 'Tap to start live camera' : 'Tap to take photo'}
              </p>
            </div>
          </div>
        )}
        
        {/* Live Camera Status */}
        {isLiveCameraActive && (
          <div className="absolute top-4 left-4 bg-red-600 text-white text-xs px-3 py-1 rounded-full flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>LIVE</span>
          </div>
        )}
        
        {/* Recording Status */}
        {isRecording && (
          <div className="absolute top-4 right-4 bg-red-600 text-white text-xs px-3 py-1 rounded-full flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>REC</span>
          </div>
        )}
        
        {/* Plate detection circle - only show when live or has preview */}
        {(isLiveCameraActive || previewUrl) && (
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
            >
              <Images className="text-white h-5 w-5" />
            </button>
            
            {/* Switch Camera - only show during live camera */}
            {isLiveCameraActive && (
              <button 
                className="w-12 h-12 bg-slate-700/80 rounded-xl flex items-center justify-center border border-slate-600/50 hover:bg-slate-600/80 transition-colors duration-200"
                onClick={handleSwitchCamera}
                data-testid="button-switch-camera"
                title="Switch Camera"
              >
                <RotateCcw className="text-white h-5 w-5" />
              </button>
            )}
            
            {/* Main Capture button */}
            <button 
              className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-white/20 transition-all duration-200 ${
                isLiveCameraActive 
                  ? 'bg-red-600 hover:bg-red-500 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
              onClick={handleCameraCapture}
              data-testid="button-capture"
            >
              <Camera className="text-white h-8 w-8" />
            </button>
            
            {/* Microphone Record/Stop button */}
            <button 
              className={`w-12 h-12 rounded-xl flex items-center justify-center border border-slate-600/50 transition-all duration-200 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 animate-pulse'
                  : isMicrophoneActive
                  ? 'bg-orange-600 hover:bg-orange-500'
                  : 'bg-slate-700/80 hover:bg-slate-600/80'
              }`}
              onClick={isRecording ? handleStopMicrophoneRecording : handleStartMicrophoneRecording}
              data-testid="button-microphone"
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? (
                <Square className="text-white h-5 w-5" />
              ) : (
                <Mic className="text-white h-5 w-5" />
              )}
            </button>

            {/* Stop Live Camera button - only show during live camera */}
            {isLiveCameraActive && (
              <button 
                className="w-12 h-12 bg-gray-700/80 rounded-xl flex items-center justify-center border border-slate-600/50 hover:bg-gray-600/80 transition-colors duration-200"
                onClick={handleStopLiveCamera}
                data-testid="button-stop-camera"
                title="Stop Camera"
              >
                <Square className="text-white h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Audio Playback - show when audio recorded */}
          {audioBlob && !isLiveCameraActive && (
            <div className="mt-3 flex justify-center">
              <button 
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                onClick={handlePlayRecordedAudio}
                data-testid="button-play-audio"
              >
                <Play className="h-4 w-4" />
                <span className="text-sm">Play Recording</span>
              </button>
            </div>
          )}
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
