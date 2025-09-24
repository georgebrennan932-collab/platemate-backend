import { AlertTriangle, ArrowLeft, QrCode } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  type?: 'food' | 'barcode';
}

export function ErrorState({ message, onRetry, type = 'food' }: ErrorStateProps) {
  const isBarcode = type === 'barcode';
  
  return (
    <div className="p-6">
      <div className="bg-card rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {isBarcode ? (
            <QrCode className="text-red-500 h-8 w-8" />
          ) : (
            <AlertTriangle className="text-red-500 h-8 w-8" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2" data-testid="text-error-title">
          {isBarcode ? "Unable to Scan Barcode" : "Unable to Analyze Image"}
        </h3>
        <p className="text-muted-foreground mb-4" data-testid="text-error-message">
          {message || (isBarcode ? 
            "We couldn't detect a barcode in this image. Please try:" : 
            "We couldn't identify any food items in this image. Please try:"
          )}
        </p>
        <ul className="text-sm text-muted-foreground text-left mb-6 space-y-1">
          {isBarcode ? (
            <>
              <li>• Position barcode clearly in frame</li>
              <li>• Ensure good lighting on the barcode</li>
              <li>• Make sure barcode is not damaged</li>
              <li>• Try manual entry if scanning fails</li>
            </>
          ) : (
            <>
              <li>• Ensure good lighting</li>
              <li>• Position the plate clearly in frame</li>
              <li>• Remove any obstructions</li>
              <li>• Take photo from above the plate</li>
            </>
          )}
        </ul>
        <div className="flex gap-3 justify-center">
          <button 
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={onRetry}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button 
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            onClick={onRetry}
            data-testid="button-retry"
          >
            {isBarcode ? "Try Again" : "Try Again"}
          </button>
        </div>
      </div>
    </div>
  );
}
