import { Brain } from "lucide-react";

export function ProcessingState() {
  return (
    <div className="p-6 text-center">
      <div className="bg-card rounded-xl shadow-lg p-8">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Brain className="text-primary h-8 w-8 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold mb-2" data-testid="text-processing-title">
          Analyzing your meal...
        </h3>
        <p className="text-muted-foreground mb-4" data-testid="text-processing-description">
          Our AI is identifying food items and calculating nutrition
        </p>
        <div className="w-full bg-muted rounded-full h-2 mb-2">
          <div 
            className="bg-primary h-2 rounded-full animate-pulse transition-all duration-1000" 
            style={{width: '65%'}}
            data-testid="progress-analysis"
          ></div>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-processing-status">
          Processing image...
        </p>
      </div>
    </div>
  );
}
