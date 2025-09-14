// Enhanced media service for camera and microphone functionality
export interface MediaPermissions {
  camera: boolean;
  microphone: boolean;
}

export interface CameraConstraints {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  aspectRatio?: number;
}

export interface AudioConstraints {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
}

export class MediaService {
  private static instance: MediaService;
  private cameraStream: MediaStream | null = null;
  private microphoneStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private isMediaRecorderSupported: boolean = false;
  private availableCameras: MediaDeviceInfo[] = [];
  private currentCameraIndex: number = 0;

  static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  constructor() {
    // Feature detection on initialization
    this.isMediaRecorderSupported = this.checkMediaRecorderSupport();
  }

  // Check if getUserMedia is supported
  isMediaSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // Check if we're in a secure context (HTTPS or localhost)
  isSecureContext(): boolean {
    return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
  }

  // Check MediaRecorder support with detailed feature detection
  checkMediaRecorderSupport(): boolean {
    if (typeof MediaRecorder === 'undefined') {
      console.warn('⚠️ MediaRecorder not available in this browser');
      return false;
    }

    // Test if any supported MIME types are available
    const testTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    const supportedType = testTypes.find(type => MediaRecorder.isTypeSupported(type));
    if (!supportedType) {
      console.warn('⚠️ No supported MediaRecorder MIME types found');
      return false;
    }

    console.log('✅ MediaRecorder supported with type:', supportedType);
    return true;
  }

  // Get available cameras
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    if (!this.isMediaSupported()) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(device => device.kind === 'videoinput');
      
      console.log('📹 Available cameras:', this.availableCameras.map(cam => ({ 
        label: cam.label || 'Camera', 
        deviceId: cam.deviceId.substring(0, 8) + '...' 
      })));
      
      return this.availableCameras;
    } catch (error) {
      console.error('❌ Failed to enumerate cameras:', error);
      return [];
    }
  }

  // Check current permissions
  async checkPermissions(): Promise<MediaPermissions> {
    const permissions: MediaPermissions = {
      camera: false,
      microphone: false
    };

    if (!this.isMediaSupported()) {
      return permissions;
    }

    try {
      // Check camera permission
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      permissions.camera = cameraPermission.state === 'granted';
    } catch (error) {
      console.warn('Could not check camera permission:', error);
    }

    try {
      // Check microphone permission
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permissions.microphone = microphonePermission.state === 'granted';
    } catch (error) {
      console.warn('Could not check microphone permission:', error);
    }

    return permissions;
  }

  // Start camera stream with live preview
  async startCamera(
    videoElement: HTMLVideoElement, 
    constraints: CameraConstraints = {}
  ): Promise<MediaStream> {
    if (!this.isMediaSupported()) {
      throw new Error('Camera not supported in this browser');
    }

    try {
      // Stop existing camera stream
      if (this.cameraStream) {
        this.stopCamera();
      }

      // Default constraints optimized for mobile
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: constraints.width || 1280, max: 1920 },
          height: { ideal: constraints.height || 720, max: 1080 },
          facingMode: constraints.facingMode || 'environment', // Back camera by default
          aspectRatio: constraints.aspectRatio || 16/9
        },
        audio: false // Camera stream doesn't need audio
      };

      console.log('🎥 Requesting camera with constraints:', defaultConstraints);
      
      this.cameraStream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
      
      console.log('📹 Camera stream started successfully:', {
        tracks: this.cameraStream.getTracks().length,
        videoTracks: this.cameraStream.getVideoTracks().length
      });

      // Set up video element
      videoElement.srcObject = this.cameraStream;
      videoElement.playsInline = true; // Important for iOS Safari
      videoElement.muted = true; // Prevent audio feedback
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
          console.log('📐 Video dimensions:', {
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight
          });
          resolve(void 0);
        };
        videoElement.onerror = reject;
        videoElement.play().catch(reject);
      });

      return this.cameraStream;
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      this.handleMediaError(error, 'camera');
      throw error;
    }
  }

  // Stop camera stream
  stopCamera(): void {
    if (this.cameraStream) {
      console.log('⏹️ Stopping camera stream');
      this.cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🔴 Stopped ${track.kind} track`);
      });
      this.cameraStream = null;
    }
  }

  // Capture photo from video stream (async)
  async capturePhotoFromStream(videoElement: HTMLVideoElement, quality: number = 0.9): Promise<Blob> {
    if (!this.cameraStream || !videoElement.videoWidth) {
      console.error('❌ No active camera stream or video not ready');
      throw new Error('No active camera stream or video not ready');
    }

    try {
      // Create canvas to capture the frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      console.log('📸 Photo captured from stream:', {
        width: canvas.width,
        height: canvas.height,
        quality
      });

      // Convert to blob (properly async)
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create photo blob'));
          }
        }, 'image/jpeg', quality);
      });
    } catch (error) {
      console.error('❌ Failed to capture photo:', error);
      throw error;
    }
  }

  // Switch camera using device enumeration (more reliable than facingMode)
  async switchCamera(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.cameraStream) {
      throw new Error('No active camera stream to switch');
    }

    try {
      // Get available cameras if not already loaded
      if (this.availableCameras.length === 0) {
        await this.getAvailableCameras();
      }

      if (this.availableCameras.length < 2) {
        throw new Error('Only one camera available, cannot switch');
      }

      // Switch to next camera
      this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
      const nextCamera = this.availableCameras[this.currentCameraIndex];
      
      console.log('🔄 Switching to camera:', {
        index: this.currentCameraIndex,
        label: nextCamera.label || 'Unknown Camera',
        deviceId: nextCamera.deviceId.substring(0, 8) + '...'
      });

      // Stop current stream and start new one with specific device
      this.stopCamera();
      await this.startCameraWithDeviceId(videoElement, nextCamera.deviceId);
      
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
      // Fallback to facingMode switching for older browsers
      await this.fallbackSwitchCamera(videoElement);
    }
  }

  // Fallback camera switching using facingMode
  private async fallbackSwitchCamera(videoElement: HTMLVideoElement): Promise<void> {
    const videoTrack = this.cameraStream?.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error('No video track found for fallback switch');
    }

    const currentConstraints = videoTrack.getConstraints();
    const currentFacingMode = currentConstraints.facingMode;
    
    // Toggle between front and back camera
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    console.log('🔄 Fallback camera switch from', currentFacingMode, 'to', newFacingMode);

    this.stopCamera();
    await this.startCamera(videoElement, { facingMode: newFacingMode });
  }

  // Start camera with specific device ID
  private async startCameraWithDeviceId(
    videoElement: HTMLVideoElement, 
    deviceId: string
  ): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      },
      audio: false
    };

    console.log('📹 Starting camera with device ID:', deviceId.substring(0, 8) + '...');
    
    this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    videoElement.srcObject = this.cameraStream;
    videoElement.playsInline = true;
    videoElement.muted = true;
    
    await new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = resolve;
      videoElement.onerror = reject;
      videoElement.play().catch(reject);
    });

    return this.cameraStream;
  }

  // Start microphone recording
  async startMicrophoneRecording(constraints: AudioConstraints = {}): Promise<MediaStream> {
    if (!this.isMediaSupported()) {
      throw new Error('Microphone not supported in this browser');
    }

    try {
      // Stop existing microphone stream
      if (this.microphoneStream) {
        this.stopMicrophone();
      }

      const defaultConstraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: constraints.echoCancellation ?? true,
          noiseSuppression: constraints.noiseSuppression ?? true,
          autoGainControl: constraints.autoGainControl ?? true,
          sampleRate: constraints.sampleRate || 44100
        },
        video: false
      };

      console.log('🎤 Requesting microphone with constraints:', defaultConstraints);
      
      this.microphoneStream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
      
      console.log('🎙️ Microphone stream started successfully:', {
        tracks: this.microphoneStream.getTracks().length,
        audioTracks: this.microphoneStream.getAudioTracks().length
      });

      return this.microphoneStream;
    } catch (error) {
      console.error('❌ Microphone access failed:', error);
      this.handleMediaError(error, 'microphone');
      throw error;
    }
  }

  // Start recording audio with MediaRecorder fallback for iOS Safari
  async startAudioRecording(): Promise<void> {
    if (!this.microphoneStream) {
      await this.startMicrophoneRecording();
    }

    if (!this.microphoneStream) {
      throw new Error('No microphone stream available');
    }

    try {
      // Clear previous recording
      this.recordingChunks = [];

      if (this.isMediaRecorderSupported) {
        // Use MediaRecorder for supported browsers
        await this.startMediaRecorderRecording();
      } else {
        // Use Web Audio API fallback for iOS Safari
        await this.startWebAudioRecording();
      }
    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
      throw error;
    }
  }

  // MediaRecorder-based recording
  private async startMediaRecorderRecording(): Promise<void> {
    if (!this.microphoneStream) {
      throw new Error('No microphone stream available');
    }

    this.mediaRecorder = new MediaRecorder(this.microphoneStream, {
      mimeType: this.getSupportedMimeType()
    });

    console.log('🎬 Starting audio recording with MediaRecorder');

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordingChunks.push(event.data);
        console.log('📊 Audio chunk received:', event.data.size, 'bytes');
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  // Web Audio API fallback for iOS Safari
  private async startWebAudioRecording(): Promise<void> {
    if (!this.microphoneStream) {
      throw new Error('No microphone stream available');
    }

    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      console.log('🎤 Starting Web Audio API recording (iOS Safari fallback)');

      // Create audio source from stream
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      
      // Use ScriptProcessor for older browsers, AudioWorklet for newer ones
      if (this.audioContext.audioWorklet) {
        await this.setupAudioWorkletRecording(source);
      } else {
        this.setupScriptProcessorRecording(source);
      }

    } catch (error) {
      console.error('❌ Failed to start Web Audio recording:', error);
      throw error;
    }
  }

  // Modern AudioWorklet recording
  private async setupAudioWorkletRecording(source: MediaStreamAudioSourceNode): Promise<void> {
    // For now, fallback to ScriptProcessor as AudioWorklet requires separate files
    // This would need a separate worklet file for production use
    this.setupScriptProcessorRecording(source);
  }

  // Legacy ScriptProcessor recording for iOS Safari
  private setupScriptProcessorRecording(source: MediaStreamAudioSourceNode): void {
    if (!this.audioContext) return;

    const bufferSize = 4096;
    const sampleRate = this.audioContext.sampleRate;
    
    // Store samples for later conversion to WAV
    const recordedSamples: number[] = [];

    const scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    scriptProcessor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      
      // Store samples
      for (let i = 0; i < inputData.length; i++) {
        recordedSamples.push(inputData[i]);
      }
    };

    // Connect the audio graph
    source.connect(scriptProcessor);
    scriptProcessor.connect(this.audioContext.destination);

    // Store reference for stopping
    (this as any).scriptProcessor = scriptProcessor;
    (this as any).recordedSamples = recordedSamples;
    (this as any).sampleRate = sampleRate;

    console.log('🎙️ ScriptProcessor recording setup complete');
  }

  // Stop recording audio and return blob
  async stopAudioRecording(): Promise<Blob> {
    if (this.isMediaRecorderSupported && this.mediaRecorder) {
      return this.stopMediaRecorderRecording();
    } else if (this.audioContext) {
      return this.stopWebAudioRecording();
    } else {
      throw new Error('No active recording to stop');
    }
  }

  // Stop MediaRecorder recording
  private stopMediaRecorderRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No MediaRecorder active'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        console.log('⏹️ MediaRecorder recording stopped, combining chunks...');
        const blob = new Blob(this.recordingChunks, { 
          type: this.getSupportedMimeType() 
        });
        
        console.log('🎵 Audio recording completed:', {
          size: blob.size,
          type: blob.type,
          chunks: this.recordingChunks.length
        });
        
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  // Stop Web Audio recording and convert to WAV
  private stopWebAudioRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const scriptProcessor = (this as any).scriptProcessor;
        const recordedSamples = (this as any).recordedSamples as number[];
        const sampleRate = (this as any).sampleRate as number;

        if (!scriptProcessor || !recordedSamples || !sampleRate) {
          reject(new Error('Web Audio recording data not found'));
          return;
        }

        console.log('⏹️ Web Audio recording stopped, converting to WAV...', {
          samples: recordedSamples.length,
          sampleRate
        });

        // Disconnect audio graph
        scriptProcessor.disconnect();

        // Convert samples to WAV blob
        const wavBlob = this.convertSamplesToWAV(recordedSamples, sampleRate);
        
        console.log('🎵 Web Audio recording converted to WAV:', {
          size: wavBlob.size,
          type: wavBlob.type
        });

        // Cleanup
        delete (this as any).scriptProcessor;
        delete (this as any).recordedSamples;
        delete (this as any).sampleRate;

        resolve(wavBlob);
      } catch (error) {
        console.error('❌ Failed to stop Web Audio recording:', error);
        reject(error);
      }
    });
  }

  // Convert PCM samples to WAV format
  private convertSamplesToWAV(samples: number[], sampleRate: number): Blob {
    const length = samples.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Stop microphone
  stopMicrophone(): void {
    if (this.microphoneStream) {
      console.log('⏹️ Stopping microphone stream');
      this.microphoneStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🔴 Stopped ${track.kind} track`);
      });
      this.microphoneStream = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  // Play audio blob
  playAudio(audioBlob: Blob): HTMLAudioElement {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.play().catch(error => {
      console.error('❌ Failed to play audio:', error);
    });

    // Clean up URL after playing
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
    });

    return audio;
  }

  // Get supported MIME type for recording
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('🎯 Using MIME type:', type);
        return type;
      }
    }

    console.warn('⚠️ No supported MIME type found, using default');
    return 'audio/webm';
  }

  // Handle media errors with user-friendly messages
  private handleMediaError(error: any, mediaType: 'camera' | 'microphone'): void {
    let message = `Unable to access ${mediaType}`;
    
    if (error.name === 'NotAllowedError') {
      message = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} access was denied. Please allow ${mediaType} permissions in your browser settings.`;
    } else if (error.name === 'NotFoundError') {
      message = `No ${mediaType} found on this device.`;
    } else if (error.name === 'NotSupportedError') {
      message = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} is not supported in this browser.`;
    } else if (error.name === 'NotReadableError') {
      message = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} is being used by another application.`;
    } else if (error.name === 'OverconstrainedError') {
      message = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} settings are not supported on this device.`;
    } else if (error.name === 'SecurityError') {
      message = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} access blocked for security reasons. Please use HTTPS.`;
    }

    console.error(`❌ ${mediaType} error:`, message, error);
  }

  // Clean up all media resources
  cleanup(): void {
    this.stopCamera();
    this.stopMicrophone();
    
    // Clean up MediaRecorder
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
    
    this.recordingChunks = [];
    console.log('🧹 Media service cleaned up');
  }
}

// Export singleton instance
export const mediaService = MediaService.getInstance();