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

  // Try Web Share API first (works on mobile)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return true;
    } catch (error) {
      // User cancelled or share failed
      console.log('Share cancelled or failed:', error);
      return false;
    }
  }

  // Fallback: Download the image
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'achievement.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return true;
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
