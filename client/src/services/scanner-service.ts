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

// Add image-based barcode scanning
export async function scanBarcodeFromImage(imageFile: File | HTMLImageElement): Promise<ScannerResult> {
  console.log('📷 Starting barcode detection from image...');
  
  let imageElement: HTMLImageElement;
  
  if (imageFile instanceof File) {
    imageElement = new Image();
    const imageUrl = URL.createObjectURL(imageFile);
    
    await new Promise((resolve, reject) => {
      imageElement.onload = resolve;
      imageElement.onerror = reject;
      imageElement.src = imageUrl;
    });
  } else {
    imageElement = imageFile;
  }
  
  // Try BarcodeDetector API first (Chrome, Edge, Android Chrome)
  if ('BarcodeDetector' in window) {
    console.log('🔍 Using BarcodeDetector API for image scanning');
    try {
      const detector = new (window as any).BarcodeDetector();
      const barcodes = await detector.detect(imageElement);
      
      if (barcodes && barcodes.length > 0) {
        const barcode = barcodes[0];
        console.log('✅ Barcode detected from image:', barcode.rawValue);
        const normalized = normalizeBarcodeValue(barcode.rawValue);
        if (normalized) {
          return {
            barcode: normalized,
            format: barcode.format || 'unknown'
          };
        }
      }
    } catch (error) {
      console.log('📷 BarcodeDetector failed, trying ZXing...', error);
    }
  }
  
  // Fallback to ZXing for image scanning
  console.log('📷 Using ZXing for image barcode detection');
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/library');
    const reader = new BrowserMultiFormatReader();
    
    const result = await reader.decodeFromImageElement(imageElement);
    console.log('✅ ZXing detected barcode from image:', result.getText());
    
    const normalized = normalizeBarcodeValue(result.getText());
    if (normalized) {
      return {
        barcode: normalized,
        format: result.getBarcodeFormat()?.toString() || 'unknown'
      };
    }
    throw new Error('Invalid barcode format detected');
  } catch (error) {
    console.error('❌ Failed to detect barcode from image:', error);
    throw new Error('No barcode detected in image. Make sure the barcode is clearly visible and well-lit.');
  } finally {
    // Clean up object URL if we created one
    if (imageFile instanceof File) {
      URL.revokeObjectURL(imageElement.src);
    }
  }
}

// Helper function to normalize barcode values
function normalizeBarcodeValue(barcode: string): string | null {
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

      // More aggressive permission handling
      console.log('📷 Requesting camera access directly...');
      
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
    // Try multiple constraint strategies for better browser compatibility
    const constraintStrategies = [
      {
        video: {
          facingMode: { exact: 'environment' }, // Try exact back camera first
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      {
        video: {
          facingMode: 'environment', // Fallback to preferred back camera
          width: { min: 640 },
          height: { min: 480 }
        }
      },
      {
        video: true // Final fallback - any camera
      }
    ];

    let lastError;
    
    for (let i = 0; i < constraintStrategies.length; i++) {
      const constraints = constraintStrategies[i];
      console.log(`📷 Trying camera constraints ${i + 1}/${constraintStrategies.length}:`, constraints);
      
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.track = this.stream.getVideoTracks()[0];
        
        console.log('✅ Camera access successful! Track details:', {
          label: this.track.label,
          kind: this.track.kind,
          readyState: this.track.readyState,
          enabled: this.track.enabled
        });
        
        videoElement.srcObject = this.stream;
        videoElement.playsInline = true;
        videoElement.muted = true;
        videoElement.autoplay = true;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          videoElement.addEventListener('loadedmetadata', resolve, { once: true });
          videoElement.addEventListener('error', reject, { once: true });
          setTimeout(reject, 5000); // 5 second timeout
        });
        
        await videoElement.play();
        this.isActive = true;

        // Create BarcodeDetector with supported formats
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
        });

        console.log('🔍 Starting barcode detection...');
        // Start detection loop
        this.detectBarcodes(barcodeDetector, videoElement);
        return; // Success!
        
      } catch (error) {
        console.log(`❌ Camera constraints ${i + 1} failed:`, error);
        lastError = error;
        
        // Clean up failed attempt
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
          this.track = null;
        }
        
        // Continue to next strategy
      }
    }
    
    // All strategies failed
    throw lastError || new Error('All camera access strategies failed');
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