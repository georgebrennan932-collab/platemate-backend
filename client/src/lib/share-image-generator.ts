import domtoimage from 'dom-to-image-more';

export interface ShareImageOptions {
  element: HTMLElement;
  filename?: string;
  backgroundColor?: string;
}

/**
 * Generate a shareable image from a DOM element using dom-to-image-more
 * 
 * Note: Ensure all images in the element have crossOrigin="anonymous" to avoid CORS issues.
 * Avoid capturing iframes or videos as they may cause the generation to fail.
 */
export async function generateShareImage(options: ShareImageOptions): Promise<Blob> {
  const { element, backgroundColor = 'transparent' } = options;

  // Generate blob directly for better Safari compatibility
  const blob = await domtoimage.toBlob(element, {
    bgcolor: backgroundColor,
    quality: 1.0,
    style: {
      transform: 'scale(1)',
      transformOrigin: 'top left'
    }
  });

  return blob;
}

/**
 * Share image using Web Share API or download as fallback
 */
export async function shareImage(
  blob: Blob, 
  title: string, 
  text?: string,
  textFallback?: string,
  filename: string = 'platemate-share.png'
): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });
  
  // Try Web Share API first (works on mobile)
  if (navigator.share) {
    // Check if sharing files is supported
    const canShareFiles = navigator.canShare ? navigator.canShare({ files: [file] }) : false;
    
    // Only try to share if files are supported
    if (canShareFiles) {
      try {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return true;
      } catch (error: any) {
        // User cancelled or share failed
        if (error.name === 'AbortError') {
          // User explicitly cancelled
          return false;
        }
        // Fall through to text fallback if available
        if (textFallback && navigator.share) {
          try {
            await navigator.share({
              title,
              text: textFallback,
            });
            return true;
          } catch (textError: any) {
            if (textError.name === 'AbortError') {
              return false;
            }
          }
        }
      }
    } else {
      // Try text-only share if files aren't supported
      if (textFallback && navigator.share) {
        try {
          await navigator.share({
            title,
            text: textFallback,
          });
          return true;
        } catch (textError: any) {
          if (textError.name === 'AbortError') {
            return false;
          }
        }
      }
    }
  }

  // Fallback: Download the image
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  // Return false to indicate we downloaded instead of shared
  return false;
}

/**
 * Generate and share an achievement card with text fallback
 */
export async function generateAndShareCard(
  element: HTMLElement,
  title: string,
  description?: string,
  textFallback?: string,
  filename?: string
): Promise<boolean> {
  try {
    const blob = await generateShareImage({ element });
    return await shareImage(blob, title, description, textFallback, filename);
  } catch (error) {
    console.error('Error generating share image:', error);
    
    // If image generation fails and we have a text fallback, try that
    if (textFallback && navigator.share) {
      try {
        await navigator.share({
          title,
          text: textFallback,
        });
        return true;
      } catch (shareError: any) {
        if (shareError.name === 'AbortError') {
          return false;
        }
      }
    }
    
    throw error;
  }
}
