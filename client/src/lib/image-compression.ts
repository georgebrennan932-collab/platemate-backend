// Client-side image compression utility for performance optimization
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp';
}

export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.7,
    format = 'image/jpeg'
  } = options;

  console.log("🗜️ Starting client-side image compression:", {
    originalSize: file.size,
    originalType: file.type,
    targetFormat: format,
    maxDimensions: `${maxWidth}x${maxHeight}`,
    quality
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error("❌ Canvas 2D context not available");
      resolve(file); // Return original file if compression fails
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error("❌ Failed to compress image");
            resolve(file); // Return original file if compression fails
            return;
          }

          const compressedSize = blob.size;
          const compressionRatio = ((file.size - compressedSize) / file.size * 100).toFixed(1);
          
          console.log("✅ Image compression completed:", {
            originalSize: `${(file.size / 1024).toFixed(1)}KB`,
            compressedSize: `${(compressedSize / 1024).toFixed(1)}KB`,
            compressionRatio: `${compressionRatio}%`,
            dimensions: `${width}x${height}`
          });

          // Create new file with compressed data
          const compressedFile = new File(
            [blob], 
            file.name.replace(/\.[^/.]+$/, `.${format.split('/')[1]}`),
            { 
              type: format,
              lastModified: Date.now()
            }
          );

          resolve(compressedFile);
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      console.error("❌ Failed to load image for compression");
      resolve(file); // Return original file if loading fails
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

// Utility to check if compression is beneficial
export function shouldCompressImage(file: File): boolean {
  const maxSizeForCompression = 500 * 1024; // 500KB
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  return file.size > maxSizeForCompression && supportedTypes.includes(file.type);
}