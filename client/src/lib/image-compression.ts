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

export interface PreprocessingOptions {
  enhanceContrast?: boolean;
  blurBackground?: boolean;
  centerCrop?: boolean;
  contrastAmount?: number;
  blurRadius?: number;
  cropRatio?: number;
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

/**
 * Preprocesses an image to enhance food recognition accuracy
 * Applies contrast enhancement, background blur, and center crop
 */
export async function preprocessImage(
  file: File,
  options: PreprocessingOptions = {}
): Promise<File> {
  const opts = {
    enhanceContrast: true,
    blurBackground: true,
    centerCrop: false,
    contrastAmount: 1.3,
    blurRadius: 10,
    cropRatio: 0.85,
    ...options
  };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const { width, height } = img;
          
          // Create canvas
          const canvas = document.createElement('canvas');
          let finalWidth = width;
          let finalHeight = height;
          
          // Apply center crop if enabled
          if (opts.centerCrop) {
            const minDimension = Math.min(width, height);
            finalWidth = finalHeight = Math.floor(minDimension * opts.cropRatio);
          }
          
          canvas.width = finalWidth;
          canvas.height = finalHeight;
          
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate crop offset for centering
          const offsetX = opts.centerCrop ? (width - finalWidth) / 2 : 0;
          const offsetY = opts.centerCrop ? (height - finalHeight) / 2 : 0;

          // Draw base image (cropped if needed)
          if (opts.centerCrop) {
            ctx.drawImage(
              img,
              offsetX, offsetY, finalWidth, finalHeight,
              0, 0, finalWidth, finalHeight
            );
          } else {
            ctx.drawImage(img, 0, 0, width, height);
          }

          // Apply background blur effect (center sharp, edges blurred)
          if (opts.blurBackground) {
            // Save original sharp image
            const sharpCanvas = document.createElement('canvas');
            sharpCanvas.width = finalWidth;
            sharpCanvas.height = finalHeight;
            const sharpCtx = sharpCanvas.getContext('2d');
            
            if (sharpCtx) {
              sharpCtx.drawImage(canvas, 0, 0);
              
              // Apply blur to main canvas
              ctx.filter = `blur(${opts.blurRadius}px)`;
              ctx.drawImage(canvas, 0, 0);
              ctx.filter = 'none';
              
              // Create radial gradient mask (center sharp at 1, edges blurred at 0)
              const centerX = finalWidth / 2;
              const centerY = finalHeight / 2;
              const radius = Math.min(finalWidth, finalHeight) * 0.45;
              
              const maskCanvas = document.createElement('canvas');
              maskCanvas.width = finalWidth;
              maskCanvas.height = finalHeight;
              const maskCtx = maskCanvas.getContext('2d');
              
              if (maskCtx) {
                const gradient = maskCtx.createRadialGradient(
                  centerX, centerY, radius * 0.4,
                  centerX, centerY, radius
                );
                gradient.addColorStop(0, 'rgba(0,0,0,1)');
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                
                maskCtx.fillStyle = gradient;
                maskCtx.fillRect(0, 0, finalWidth, finalHeight);
                
                // Composite sharp center over blurred background using mask
                sharpCtx.globalCompositeOperation = 'destination-in';
                sharpCtx.drawImage(maskCanvas, 0, 0);
                
                // Draw masked sharp image over blurred background
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(sharpCanvas, 0, 0);
              }
            }
          }

          // Apply contrast enhancement
          if (opts.enhanceContrast) {
            const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
            const data = imageData.data;
            const factor = (259 * (opts.contrastAmount * 100 + 255)) / (255 * (259 - opts.contrastAmount * 100));
            
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // R
              data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // G
              data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // B
            }
            
            ctx.putImageData(imageData, 0, 0);
          }

          // Convert to blob
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to preprocess image'));
                return;
              }

              const processedFile = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              });

              console.log('🎨 Image preprocessing:', {
                originalSize: `${(file.size / 1024).toFixed(1)}KB`,
                processedSize: `${(processedFile.size / 1024).toFixed(1)}KB`,
                dimensions: `${finalWidth}x${finalHeight}`,
                contrast: opts.enhanceContrast,
                blur: opts.blurBackground,
                crop: opts.centerCrop
              });

              resolve(processedFile);
            },
            outputType,
            0.92
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
 * Combined preprocessing and compression for optimal AI analysis
 */
export async function preprocessAndCompress(
  file: File,
  preprocessOpts?: PreprocessingOptions,
  compressOpts?: CompressionOptions
): Promise<File> {
  // First preprocess to enhance image quality
  const preprocessed = await preprocessImage(file, preprocessOpts);
  
  // Then compress for fast upload
  return compressImage(preprocessed, compressOpts);
}
