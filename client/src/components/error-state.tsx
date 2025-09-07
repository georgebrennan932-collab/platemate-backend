import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="p-6">
      <div className="bg-card rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="text-red-500 h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold mb-2" data-testid="text-error-title">
          Unable to Analyze Image
        </h3>
        <p className="text-muted-foreground mb-4" data-testid="text-error-message">
          {message || "We couldn't identify any food items in this image. Please try:"}
        </p>
        <ul className="text-sm text-muted-foreground text-left mb-6 space-y-1">
          <li>• Ensure good lighting</li>
          <li>• Position the plate clearly in frame</li>
          <li>• Remove any obstructions</li>
          <li>• Take photo from above the plate</li>
        </ul>
        <button 
          className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          onClick={onRetry}
          data-testid="button-retry"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
