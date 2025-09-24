import { useState, useRef, useEffect } from "react";
import { QrCode, X, Scan, AlertCircle, CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScanSuccess: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScanSuccess, onClose, isOpen }: BarcodeScannerProps) {
  const { toast } = useToast();
  const [scanError, setScanError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const handleManualBarcodeSubmit = () => {
    if (manualBarcode.trim()) {
      console.log('📝 Manual barcode entered:', manualBarcode.trim());
      toast({
        title: "Barcode Entered!",
        description: `Looking up: ${manualBarcode.trim()}`,
      });
      onScanSuccess(manualBarcode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-2xl border border-border/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <QrCode className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-bold">Enter Product Barcode</h3>
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

        {/* Manual Barcode Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Product Barcode Number</label>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Enter barcode number (e.g., 1234567890123)"
            className="w-full p-3 border rounded-lg text-center font-mono text-lg"
            data-testid="input-manual-barcode"
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Find the barcode number below the bars on the product packaging
          </p>
        </div>

        {/* Error display */}
        {scanError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{scanError}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <QrCode className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium mb-1">How to find the barcode:</p>
            <p>Look for the vertical black and white lines on the product packaging</p>
            <p>The numbers below the lines are the barcode number to enter above</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-scan"
          >
            Cancel
          </Button>
          <Button
            onClick={handleManualBarcodeSubmit}
            disabled={!manualBarcode.trim()}
            className="flex-1"
            data-testid="button-submit-barcode"
          >
            Look Up Product
          </Button>
        </div>
      </div>
    </div>
  );
}