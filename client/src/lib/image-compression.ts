/**
 * Client-side image compression utility for fast AI analysis
 * Compresses images before upload to dramatically reduce latency
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.8,
  maxSizeKB: 500
};

/**
 * Compresses an image file for fast upload and AI analysis
 * @param file The original image file
 * @param options Compression options
 * @returns Compressed image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression if file is already small enough
  const fileSizeKB = file.size / 1024;
  if (fileSizeKB <= opts.maxSizeKB) {
    console.log('📦 Image already small enough, skipping compression:', {
      size: `${fileSizeKB.toFixed(1)}KB`,
      maxSize: `${opts.maxSizeKB}KB`
    });
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          
          if (width > opts.maxWidth || height > opts.maxHeight) {
            const aspectRatio = width / height;
            
            if (width > height) {
              width = opts.maxWidth;
              height = width / aspectRatio;
            } else {
              height = opts.maxHeight;
              width = height * aspectRatio;
            }
          }

          // Create canvas for compression
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw image with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Determine output format (preserve PNG for transparency/detail)
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          
          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              // Check if we need to compress more aggressively
              const sizeKB = blob.size / 1024;
              
              if (sizeKB > opts.maxSizeKB && opts.quality > 0.6) {
                // Recursively compress with lower quality (min 0.6 to preserve detail)
                const newFile = new File([blob], file.name, { type: outputType });
                compressImage(newFile, {
                  ...opts,
                  quality: opts.quality - 0.1
                }).then(resolve).catch(reject);
                return;
              }

              // Create compressed file
              const compressedFile = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              });

              console.log('📦 Image compression:', {
                originalSize: `${(file.size / 1024).toFixed(1)}KB`,
                compressedSize: `${(compressedFile.size / 1024).toFixed(1)}KB`,
                reduction: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`,
                dimensions: `${width}x${height}`,
                format: outputType
              });

              resolve(compressedFile);
            },
            outputType,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Quick compression for immediate analysis (prioritizes speed over size)
 */
export async function quickCompress(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 600,
    maxHeight: 600,
    quality: 0.75,
    maxSizeKB: 300
  });
}
