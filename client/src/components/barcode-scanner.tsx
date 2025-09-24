import { useState, useRef } from "react";
import { QrCode, X, Scan, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScanSuccess: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScanSuccess, onClose, isOpen }: BarcodeScannerProps) {
  console.log("🔍 Manual Barcode Entry component loaded - no camera permissions needed!");
  const { toast } = useToast();
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) {
      setScanError('Please enter a barcode number');
      return;
    }
    
    const barcodeValue = manualBarcode.trim();
    console.log('📝 Manual barcode entered:', barcodeValue);
    
    // Basic barcode validation (typically 12-14 digits)
    if (!/^\d{8,14}$/.test(barcodeValue)) {
      setScanError('Please enter a valid barcode (8-14 digits)');
      return;
    }
    
    setIsSubmitting(true);
    setScanError(null);
    
    try {
      toast({
        title: "Looking up product...",
        description: `Searching for barcode: ${barcodeValue}`,
      });
      
      onScanSuccess(barcodeValue);
    } catch (error: any) {
      console.error('Error submitting barcode:', error);
      setScanError('Failed to look up product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <QrCode className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold">Enter Barcode</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-scanner"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Manual Entry */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            Product Barcode Number
          </label>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => {
              setManualBarcode(e.target.value.replace(/\D/g, '')); // Only allow digits
              setScanError(null);
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter 12-14 digit barcode (e.g., 123456789012)"
            className="w-full p-4 border rounded-lg text-center font-mono text-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="input-manual-barcode"
            disabled={isSubmitting}
            maxLength={14}
            autoFocus
          />
        </div>

        {/* Error display */}
        {scanError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{scanError}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <QrCode className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium mb-2">How to find the barcode:</p>
            <div className="text-left space-y-1">
              <p>• Look for black and white lines on the package</p>
              <p>• The numbers are printed below the lines</p>
              <p>• Usually 12-13 digits long</p>
              <p>• Found on the back or bottom of products</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-scan"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleManualSubmit}
            disabled={!manualBarcode.trim() || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            data-testid="button-submit-barcode"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <Scan className="h-4 w-4 animate-pulse" />
                <span>Looking up...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Look Up Product</span>
              </div>
            )}
          </Button>
        </div>

        {/* Sample barcodes for testing */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Test with sample barcodes:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['7622210951015', '3017624010701', '4902505109508'].map((sample) => (
              <button
                key={sample}
                onClick={() => setManualBarcode(sample)}
                className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-mono"
                data-testid={`button-sample-${sample}`}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}