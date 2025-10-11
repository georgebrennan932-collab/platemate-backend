import { Button } from "@/components/ui/button";
import { Facebook } from "lucide-react";

interface ShareToFacebookProps {
  url?: string;
  title: string;
  description?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ShareToFacebook({ 
  url, 
  title, 
  description,
  onClick,
  variant = "default",
  size = "default",
  className = ""
}: ShareToFacebookProps) {
  
  const handleShare = () => {
    // Get the current page URL if not provided
    const shareUrl = url || window.location.href;
    
    // Encode the URL for Facebook
    const encodedUrl = encodeURIComponent(shareUrl);
    
    // Build Facebook sharer URL
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    
    // Open Facebook share dialog in a popup window
    const popupWidth = 600;
    const popupHeight = 400;
    const left = (screen.width / 2) - (popupWidth / 2);
    const top = (screen.height / 2) - (popupHeight / 2);
    
    window.open(
      facebookShareUrl,
      'facebook-share-dialog',
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=no`
    );
    
    // Call the optional onClick callback
    onClick?.();
  };

  return (
    <Button 
      onClick={handleShare}
      variant={variant}
      size={size}
      className={className}
      data-testid="button-share-facebook"
    >
      <Facebook className="w-4 h-4 mr-2" />
      Share to Facebook
    </Button>
  );
}
