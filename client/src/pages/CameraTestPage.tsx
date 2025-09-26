import { useState, useEffect, useRef } from "react";
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { mediaService } from '@/lib/media-service';
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app-header";
import { 
  Camera as CameraIcon, 
  Image, 
  RotateCcw, 
  Download, 
  Info, 
  CheckCircle, 
  XCircle, 
  Smartphone, 
  Monitor,
  RefreshCw,
  Play,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DeviceInfo {
  platform: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
}

interface PermissionStatus {
  camera: boolean;
  photos: boolean;
  checked: boolean;
}

export default function CameraTestPage() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    photos: false,
    checked: false
  });
  const [capturedPhoto, setCapturedPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [isNativePlatform, setIsNativePlatform] = useState(false);

  // Initialize component
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        // Get device info
        const info = await Device.getInfo();
        setDeviceInfo(info as DeviceInfo);
        setIsNativePlatform(Capacitor.isNativePlatform());

        // Check permissions
        await checkPermissions();

        // Get available cameras
        const cameras = await mediaService.getAvailableCameras();
        setAvailableCameras(cameras);

      } catch (error) {
        console.error('Failed to initialize camera:', error);
        toast({
          title: "Initialization Failed",
          description: "Could not initialize camera functionality",
          variant: "destructive",
        });
      }
    };

    initializeCamera();

    // Cleanup on unmount
    return () => {
      if (isCameraActive) {
        mediaService.stopCamera();
        setIsCameraActive(false);
      }
    };
  }, [toast, isCameraActive]);

  const checkPermissions = async () => {
    try {
      const mediaPermissions = await mediaService.checkPermissions();
      setPermissions({
        camera: mediaPermissions.camera,
        photos: mediaPermissions.camera, // For simplicity, using camera permission for photos
        checked: true
      });
    } catch (error) {
      console.error('Permission check failed:', error);
      setPermissions({ camera: false, photos: false, checked: true });
    }
  };

  const handleTakePhoto = async () => {
    setIsLoading(true);
    try {
      const photo = await mediaService.takePhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      setCapturedPhoto(photo);
      toast({
        title: "Photo Captured! 📸",
        description: `Successfully captured photo using ${isNativePlatform ? 'native' : 'web'} camera`,
      });
    } catch (error) {
      console.error('Failed to take photo:', error);
      toast({
        title: "Camera Error",
        description: `Failed to capture photo: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromGallery = async () => {
    setIsLoading(true);
    try {
      const photo = await mediaService.selectFromGallery({
        quality: 90,
        allowEditing: false,
      });

      setCapturedPhoto(photo);
      toast({
        title: "Photo Selected! 🖼️",
        description: `Successfully selected photo from ${isNativePlatform ? 'gallery' : 'files'}`,
      });
    } catch (error) {
      console.error('Failed to select photo:', error);
      toast({
        title: "Gallery Error",
        description: `Failed to select photo: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLivePreview = async () => {
    if (isCameraActive) {
      mediaService.stopCamera();
      setIsCameraActive(false);
      return;
    }

    if (!videoRef.current) {
      toast({
        title: "Video Error",
        description: "Video element not available",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await mediaService.startCamera(videoRef.current);
      setIsCameraActive(true);
      
      toast({
        title: "Live Preview Started! 📹",
        description: "Camera stream is now active",
      });
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast({
        title: "Camera Error",
        description: `Failed to start camera: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchCamera = async () => {
    if (!isCameraActive || !videoRef.current) {
      toast({
        title: "Camera Error",
        description: "Start live preview first to switch cameras",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await mediaService.switchCamera(videoRef.current);
      
      toast({
        title: "Camera Switched! 🔄",
        description: "Successfully switched to the next available camera",
      });
    } catch (error) {
      console.error('Failed to switch camera:', error);
      toast({
        title: "Switch Error",
        description: `Failed to switch camera: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureFromStream = async () => {
    if (!isCameraActive || !videoRef.current) {
      toast({
        title: "Camera Error",
        description: "Start live preview first to capture from stream",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const blob = await mediaService.capturePhotoFromStream(videoRef.current);
      
      // Convert blob to data URL for display
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCapturedPhoto({
          webPath: dataUrl,
          format: 'jpeg'
        } as Photo);
      };
      reader.readAsDataURL(blob);

      toast({
        title: "Stream Captured! 📸",
        description: "Successfully captured photo from live stream",
      });
    } catch (error) {
      console.error('Failed to capture from stream:', error);
      toast({
        title: "Capture Error",
        description: `Failed to capture from stream: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPhoto = () => {
    if (!capturedPhoto?.webPath) return;

    const link = document.createElement('a');
    link.href = capturedPhoto.webPath;
    link.download = `platemate-photo-${Date.now()}.jpg`;
    link.click();

    toast({
      title: "Photo Downloaded! 💾",
      description: "Photo has been saved to your downloads",
    });
  };

  return (
    <div className="min-h-screen text-foreground" style={{background: 'var(--bg-gradient)'}}>
      <AppHeader />
      
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            Camera Test
          </h1>
          <p className="text-lg text-muted-foreground">
            Test Capacitor Camera API functionality
          </p>
        </div>

        {/* Device Info Card */}
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Platform:</span>
                  <Badge variant={isNativePlatform ? "default" : "secondary"} className="flex items-center gap-1">
                    {isNativePlatform ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                    {deviceInfo?.platform || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Model:</span>
                  <span className="text-sm">{deviceInfo?.model || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">OS:</span>
                  <span className="text-sm">{deviceInfo?.operatingSystem} {deviceInfo?.osVersion}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Camera Permission:</span>
                  <Badge variant={permissions.camera ? "default" : "destructive"} className="flex items-center gap-1">
                    {permissions.camera ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {permissions.camera ? 'Granted' : 'Denied'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Available Cameras:</span>
                  <span className="text-sm">{availableCameras.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Secure Context:</span>
                  <Badge variant={mediaService.isSecureContext() ? "default" : "destructive"} className="flex items-center gap-1">
                    {mediaService.isSecureContext() ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {mediaService.isSecureContext() ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camera Controls */}
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CameraIcon className="h-5 w-5" />
              Camera Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleTakePhoto}
                disabled={isLoading}
                className="h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
                data-testid="button-take-photo"
              >
                <CameraIcon className="mr-2 h-4 w-4" />
                {isLoading ? 'Taking Photo...' : 'Take Photo'}
              </Button>

              <Button
                onClick={handleSelectFromGallery}
                disabled={isLoading}
                variant="outline"
                className="h-12 border-2 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                data-testid="button-select-gallery"
              >
                <Image className="mr-2 h-4 w-4" />
                {isLoading ? 'Selecting...' : 'Select from Gallery'}
              </Button>
            </div>

            {/* Live Preview Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={handleStartLivePreview}
                disabled={isLoading}
                variant={isCameraActive ? "destructive" : "default"}
                className="h-10"
                data-testid="button-live-preview"
              >
                {isCameraActive ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {isCameraActive ? 'Stop Preview' : 'Live Preview'}
              </Button>

              <Button
                onClick={handleSwitchCamera}
                disabled={isLoading || !isCameraActive}
                variant="outline"
                className="h-10"
                data-testid="button-switch-camera"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Switch Camera
              </Button>

              <Button
                onClick={handleCaptureFromStream}
                disabled={isLoading || !isCameraActive}
                variant="outline"
                className="h-10"
                data-testid="button-capture-stream"
              >
                <CameraIcon className="mr-2 h-4 w-4" />
                Capture Stream
              </Button>
            </div>

            {/* Refresh Permissions */}
            <Button
              onClick={checkPermissions}
              disabled={isLoading}
              variant="ghost"
              className="w-full h-10"
              data-testid="button-refresh-permissions"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Permissions
            </Button>
          </CardContent>
        </Card>

        {/* Live Preview */}
        {isCameraActive && (
          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                  data-testid="video-preview"
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Display */}
        {capturedPhoto && (
          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Captured Photo
                </div>
                <Button
                  onClick={downloadPhoto}
                  variant="outline"
                  size="sm"
                  data-testid="button-download-photo"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={capturedPhoto.webPath}
                  alt="Captured"
                  className="w-full h-auto max-h-96 object-contain"
                  data-testid="img-captured-photo"
                />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Format:</strong> {capturedPhoto.format}</p>
                <p><strong>Path:</strong> {capturedPhoto.webPath ? 'Available' : 'Not available'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}