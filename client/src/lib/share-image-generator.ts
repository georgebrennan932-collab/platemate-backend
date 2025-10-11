import html2canvas from 'html2canvas';

export interface ShareImageOptions {
  element: HTMLElement;
  filename?: string;
  backgroundColor?: string;
}

/**
 * Generate a shareable image from a DOM element
 */
export async function generateShareImage(options: ShareImageOptions): Promise<Blob> {
  const { element, backgroundColor = '#ffffff' } = options;

  // Generate canvas from the element
  const canvas = await html2canvas(element, {
    backgroundColor,
    scale: 2, // Higher quality
    logging: false,
    useCORS: true,
  });

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate image'));
      }
    }, 'image/png');
  });
}

/**
 * Share image using Web Share API or download as fallback
 */
export async function shareImage(blob: Blob, title: string, text?: string): Promise<boolean> {
  const file = new File([blob], 'achievement.png', { type: 'image/png' });

  console.log('🔍 Share Debug - navigator.share exists:', !!navigator.share);
  console.log('🔍 Share Debug - navigator.canShare exists:', !!navigator.canShare);
  
  // Try Web Share API first (works on mobile)
  if (navigator.share) {
    // Check if sharing files is supported
    const canShareFiles = navigator.canShare ? navigator.canShare({ files: [file] }) : false;
    console.log('🔍 Share Debug - canShare files:', canShareFiles);
    
    // Only try to share if files are supported
    if (canShareFiles) {
      try {
        console.log('📤 Attempting to share with image file');
        await navigator.share({
          title,
          text,
          files: [file],
        });
        console.log('✅ Share with file successful');
        return true;
      } catch (error: any) {
        // User cancelled or share failed
        console.log('❌ Share failed or cancelled:', error.name, error.message);
        if (error.name === 'AbortError') {
          // User explicitly cancelled
          return false;
        }
        // Fall through to download
      }
    } else {
      console.log('⚠️ File sharing not supported on this browser, falling back to download');
    }
  }

  // Fallback: Download the image
  console.log('💾 Falling back to download');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'achievement.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  // Return false to indicate we downloaded instead of shared
  return false;
}

/**
 * Generate and share an achievement card
 */
export async function generateAndShareCard(
  element: HTMLElement,
  title: string,
  description?: string
): Promise<boolean> {
  try {
    const blob = await generateShareImage({ element });
    return await shareImage(blob, title, description);
  } catch (error) {
    console.error('Error generating share image:', error);
    throw error;
  }
}
