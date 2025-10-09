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
  console.log('🔍 Browser capabilities check:', {
    hasBarcodeDetector: 'BarcodeDetector' in window,
    hasZXing: typeof BrowserMultiFormatReader !== 'undefined',
    userAgent: navigator.userAgent,
    isSecureContext: window.isSecureContext
  });
  
  let imageElement: HTMLImageElement;
  
  if (imageFile instanceof File) {
    console.log('📁 Processing File:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type
    });
    
    imageElement = new Image();
    const imageUrl = URL.createObjectURL(imageFile);
    
    await new Promise((resolve, reject) => {
      imageElement.onload = () => {
        console.log('🖼️ Image loaded successfully:', {
          width: imageElement.width,
          height: imageElement.height,
          naturalWidth: imageElement.naturalWidth,
          naturalHeight: imageElement.naturalHeight
        });
        resolve(imageElement);
      };
      imageElement.onerror = (error) => {
        console.error('❌ Image load error:', error);
        reject(error);
      };
      imageElement.src = imageUrl;
    });
  } else {
    imageElement = imageFile;
    console.log('🖼️ Using provided image element:', {
      width: imageElement.width,
      height: imageElement.height
    });
  }
  
  // Try BarcodeDetector API first (Chrome, Edge, Android Chrome)
  if ('BarcodeDetector' in window) {
    console.log('🔍 Using BarcodeDetector API for image scanning');
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['code_128', 'code_39', 'code_93', 'codabar', 'data_matrix', 'ean_13', 'ean_8', 'itf', 'pdf417', 'qr_code', 'upc_a', 'upc_e']
      });
      console.log('🔍 BarcodeDetector created successfully');
      
      const barcodes = await detector.detect(imageElement);
      console.log('🔍 BarcodeDetector scan results:', {
        barcodesFound: barcodes?.length || 0,
        barcodes: barcodes?.map((b: any) => ({
          rawValue: b.rawValue,
          format: b.format,
          boundingBox: b.boundingBox
        }))
      });
      
      if (barcodes && barcodes.length > 0) {
        const barcode = barcodes[0];
        console.log('✅ Barcode detected from image:', barcode.rawValue);
        const normalized = normalizeBarcodeValue(barcode.rawValue);
        if (normalized) {
          console.log('✅ Normalized barcode:', normalized);
          return {
            barcode: normalized,
            format: barcode.format || 'unknown'
          };
        } else {
          console.log('❌ Failed to normalize barcode:', barcode.rawValue);
        }
      } else {
        console.log('❌ No barcodes detected by BarcodeDetector API');
      }
    } catch (error) {
      console.error('❌ BarcodeDetector failed:', error);
    }
  }
  
  // Fallback to ZXing for image scanning
  console.log('📷 Using ZXing for image barcode detection');
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/library');
    console.log('📚 ZXing library imported successfully');
    
    const reader = new BrowserMultiFormatReader();
    console.log('📖 BrowserMultiFormatReader created');
    
    const result = await reader.decodeFromImageElement(imageElement);
    console.log('✅ ZXing detected barcode from image:', {
      text: result.getText(),
      format: result.getBarcodeFormat()?.toString()
    });
    
    const normalized = normalizeBarcodeValue(result.getText());
    console.log('🔄 Barcode normalization:', {
      original: result.getText(),
      normalized
    });
    
    if (normalized) {
      return {
        barcode: normalized,
        format: result.getBarcodeFormat()?.toString() || 'unknown'
      };
    }
    throw new Error(`Invalid barcode format detected: ${result.getText()}`);
  } catch (error) {
    console.error('❌ ZXing barcode detection failed:', error);
    throw new Error('No barcode detected in image. Make sure the barcode is clearly visible and well-lit.');
  } finally {
    // Clean up object URL if we created one
    if (imageFile instanceof File) {
      URL.revokeObjectURL(imageElement.src);
      console.log('🧹 Cleaned up object URL');
    }
  }
}

// Helper function to normalize barcode values
function normalizeBarcodeValue(barcode: string): string | null {
  console.log('🔄 Normalizing barcode:', barcode);
  
  // Remove any non-digit characters
  const digits = barcode.replace(/\D/g, '');
  console.log('🔢 Extracted digits:', digits);
  
  // Validate length (8-14 digits for most retail barcodes)
  if (digits.length < 8 || digits.length > 14) {
    console.log(`❌ Invalid barcode length: ${digits.length} (expected 8-14)`);
    return null;
  }

  // Handle UPC-A to EAN-13 conversion (add leading zero)
  if (digits.length === 12) {
    const converted = '0' + digits;
    console.log('🔄 UPC-A to EAN-13 conversion:', converted);
    return converted;
  }

  console.log('✅ Normalized barcode:', digits);
  return digits;
}

export interface ScannerService {
  startScanning(videoElement: HTMLVideoElement, stream?: MediaStream): Promise<void>;
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

  async startScanning(videoElement: HTMLVideoElement, stream?: MediaStream): Promise<void> {
    try {
      console.log('🎥 Starting camera scanner...');
      
      // If stream is provided, use it directly
      if (stream) {
        console.log('✅ Using pre-authorized camera stream');
        this.stream = stream;
        this.track = this.stream.getVideoTracks()[0];
        
        // Try BarcodeDetector API first (Chrome, Edge, Android Chrome)
        if ('BarcodeDetector' in window) {
          console.log('📱 Using BarcodeDetector API');
          await this.startBarcodeDetectorScanning(videoElement, stream);
          return;
        }

        // Fallback to ZXing
        console.log('📷 Using ZXing fallback');
        await this.startZXingScanning(videoElement, stream);
        return;
      }
      
      // Legacy path - should not be used anymore
      console.log('⚠️ WARNING: Camera stream not provided, requesting access...');
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

  private async startBarcodeDetectorScanning(videoElement: HTMLVideoElement, stream?: MediaStream): Promise<void> {
    try {
      // Use provided stream or request new one
      if (!stream) {
        console.log('📷 Requesting camera access with simple constraints...');
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.track = this.stream.getVideoTracks()[0];
      } else {
        // Stream already set in startScanning
        console.log('✅ Using provided camera stream');
      }
      
      console.log('✅ Camera access successful! Track details:', {
        label: this.track?.label,
        kind: this.track?.kind,
        readyState: this.track?.readyState,
        enabled: this.track?.enabled
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
      
    } catch (error) {
      console.log('❌ Camera access failed:', error);
      throw error;
    }
  }

  private async detectBarcodes(detector: any, videoElement: HTMLVideoElement): Promise<void> {
    if (!this.isActive) return;

    try {
      const barcodes = await detector.detect(videoElement);
      if (barcodes.length > 0) {
        const barcode = barcodes[0];
        console.log('🔍 RAW BARCODE DETECTED:', {
          rawValue: barcode.rawValue,
          format: barcode.format,
          length: barcode.rawValue?.length
        });
        
        const normalized = this.normalizeBarcode(barcode.rawValue);
        console.log('🔄 NORMALIZATION RESULT:', {
          original: barcode.rawValue,
          normalized: normalized,
          accepted: normalized !== null
        });
        
        if (normalized) {
          console.log('✅ BARCODE ACCEPTED:', normalized);
          this.onDetected?.({
            barcode: normalized,
            format: barcode.format
          });
          return; // Stop scanning on detection
        } else {
          console.log('❌ BARCODE REJECTED - continuing scan...');
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

  private async startZXingScanning(videoElement: HTMLVideoElement, stream?: MediaStream): Promise<void> {
    try {
      // Use provided stream or request new one
      if (!stream) {
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.track = this.stream.getVideoTracks()[0];
      }
      // else stream already set in startScanning
      
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