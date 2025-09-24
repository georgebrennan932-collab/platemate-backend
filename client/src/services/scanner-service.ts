import { BrowserMultiFormatReader } from '@zxing/browser';
import { Capacitor } from '@capacitor/core';

export interface ScannerResult {
  barcode: string;
  format: string;
}

export interface ScannerError {
  type: 'permission' | 'not_supported' | 'not_found' | 'unknown';
  message: string;
}

export interface ScannerService {
  startScanning(videoElement: HTMLVideoElement): Promise<void>;
  stopScanning(): void;
  isScanning(): boolean;
  toggleTorch(): Promise<boolean>;
  isTorchSupported(): Promise<boolean>;
}

class WebBarcodeScanner implements ScannerService {
  private reader: BrowserMultiFormatReader | null = null;
  private stream: MediaStream | null = null;
  private isActive = false;
  private torchEnabled = false;
  private track: MediaStreamTrack | null = null;
  private onDetected?: (result: ScannerResult) => void;
  private onError?: (error: ScannerError) => void;

  constructor(
    onDetected: (result: ScannerResult) => void,
    onError: (error: ScannerError) => void
  ) {
    this.onDetected = onDetected;
    this.onError = onError;
  }

  async startScanning(videoElement: HTMLVideoElement): Promise<void> {
    try {
      console.log('🎥 Starting camera scanner...');
      console.log('🔐 Security context:', {
        isSecureContext: window.isSecureContext,
        location: window.location.href,
        protocol: window.location.protocol
      });

      // Check if we're in a secure context
      if (!window.isSecureContext) {
        throw new Error('Camera access requires HTTPS');
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser');
      }

      // Check permissions first
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('🔍 Camera permission state:', permission.state);
          
          if (permission.state === 'denied') {
            throw new Error('Camera permission has been denied. Please enable camera access in your browser settings.');
          }
        } catch (permError) {
          console.log('⚠️ Could not check camera permission:', permError);
        }
      }

      // Try BarcodeDetector API first (Chrome, Edge, Android Chrome)
      if ('BarcodeDetector' in window) {
        console.log('📱 Using BarcodeDetector API');
        await this.startBarcodeDetectorScanning(videoElement);
        return;
      }

      // Fallback to ZXing
      console.log('📷 Using ZXing fallback');
      await this.startZXingScanning(videoElement);
    } catch (error) {
      this.handleError(error);
    }
  }

  private async startBarcodeDetectorScanning(videoElement: HTMLVideoElement): Promise<void> {
    const constraints = {
      video: {
        facingMode: 'environment', // Use back camera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.track = this.stream.getVideoTracks()[0];
      videoElement.srcObject = this.stream;
      videoElement.playsInline = true;
      videoElement.muted = true;
      await videoElement.play();

      this.isActive = true;

      // Create BarcodeDetector with supported formats
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
      });

      // Start detection loop
      this.detectBarcodes(barcodeDetector, videoElement);
    } catch (error) {
      throw error;
    }
  }

  private async detectBarcodes(detector: any, videoElement: HTMLVideoElement): Promise<void> {
    if (!this.isActive) return;

    try {
      const barcodes = await detector.detect(videoElement);
      if (barcodes.length > 0) {
        const barcode = barcodes[0];
        const normalized = this.normalizeBarcode(barcode.rawValue);
        if (normalized) {
          this.onDetected?.({
            barcode: normalized,
            format: barcode.format
          });
          return; // Stop scanning on detection
        }
      }
    } catch (error) {
      console.log('Barcode detection error:', error);
    }

    // Continue scanning
    if (this.isActive) {
      requestAnimationFrame(() => this.detectBarcodes(detector, videoElement));
    }
  }

  private async startZXingScanning(videoElement: HTMLVideoElement): Promise<void> {
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.track = this.stream.getVideoTracks()[0];
      videoElement.srcObject = this.stream;
      videoElement.playsInline = true;
      videoElement.muted = true;
      await videoElement.play();
      
      this.reader = new BrowserMultiFormatReader();
      this.isActive = true;

      // Start decoding from video element
      const scanLoop = async () => {
        if (!this.isActive) return;
        
        try {
          const result = await this.reader!.decodeOnceFromVideoElement(videoElement);
          if (result) {
            const normalized = this.normalizeBarcode(result.getText());
            if (normalized) {
              this.onDetected?.({
                barcode: normalized,
                format: result.getBarcodeFormat().toString()
              });
              return; // Stop scanning on success
            }
          }
        } catch (error) {
          // Continue scanning on error (no barcode detected)
        }
        
        // Continue scanning
        if (this.isActive) {
          setTimeout(scanLoop, 100);
        }
      };
      
      scanLoop();
    } catch (error) {
      throw error;
    }
  }

  private normalizeBarcode(barcode: string): string | null {
    // Remove any non-digit characters
    const digits = barcode.replace(/\D/g, '');
    
    // Validate length (8-14 digits for most retail barcodes)
    if (digits.length < 8 || digits.length > 14) {
      return null;
    }

    // Handle UPC-A to EAN-13 conversion (add leading zero)
    if (digits.length === 12) {
      return '0' + digits;
    }

    return digits;
  }

  private handleError(error: any): void {
    console.log('🔍 Scanner error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      stack: error.stack?.split('\n')[0]
    });

    let scannerError: ScannerError;

    if (error.name === 'NotAllowedError') {
      scannerError = {
        type: 'permission',
        message: 'Camera access was blocked. Please check your browser settings and allow camera access for this site.'
      };
    } else if (error.name === 'NotFoundError') {
      scannerError = {
        type: 'not_found',
        message: 'No camera found. Please make sure your device has a camera.'
      };
    } else if (error.name === 'NotSupportedError') {
      scannerError = {
        type: 'not_supported',
        message: 'Camera not supported. This feature requires a modern browser with camera support.'
      };
    } else if (!window.isSecureContext) {
      scannerError = {
        type: 'not_supported',
        message: 'Camera requires a secure connection (HTTPS). Please check your connection.'
      };
    } else {
      scannerError = {
        type: 'unknown',
        message: `Camera error: ${error.message || 'Unknown error occurred'}`
      };
    }

    this.onError?.(scannerError);
  }

  stopScanning(): void {
    this.isActive = false;

    // Stop ZXing reader
    if (this.reader) {
      this.reader = null;
    }

    // Stop video stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.track = null;
    }
  }

  isScanning(): boolean {
    return this.isActive;
  }

  async toggleTorch(): Promise<boolean> {
    if (!this.track) return false;

    try {
      const capabilities = this.track.getCapabilities() as any;
      if (!capabilities.torch) return false;

      this.torchEnabled = !this.torchEnabled;
      await this.track.applyConstraints({
        advanced: [{ torch: this.torchEnabled } as any]
      });

      return this.torchEnabled;
    } catch (error) {
      console.log('Torch toggle failed:', error);
      return false;
    }
  }

  async isTorchSupported(): Promise<boolean> {
    if (!this.track) return false;
    
    try {
      const capabilities = this.track.getCapabilities() as any;
      return 'torch' in capabilities;
    } catch {
      return false;
    }
  }
}

// Export factory function
export function createBarcodeScanner(
  onDetected: (result: ScannerResult) => void,
  onError: (error: ScannerError) => void
): ScannerService {
  // For now, always use web scanner
  // TODO: Add native Capacitor scanner when compatible version is available
  return new WebBarcodeScanner(onDetected, onError);
}