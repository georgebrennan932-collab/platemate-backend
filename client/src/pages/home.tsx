import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { CameraInterface } from "@/components/camera-interface";
import { ProcessingState } from "@/components/processing-state";
import { ResultsDisplay } from "@/components/results-display";
import { ErrorState } from "@/components/error-state";
import { DrinksBar } from "@/components/drinks-bar";
import { Link } from "wouter";
import { Book, Utensils, Lightbulb, Target, HelpCircle } from "lucide-react";
import type { FoodAnalysis } from "@shared/schema";

type AppState = 'camera' | 'processing' | 'results' | 'error';

export default function Home() {
  const [currentState, setCurrentState] = useState<AppState>('camera');
  const [analysisData, setAnalysisData] = useState<FoodAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleAnalysisStart = () => {
    setCurrentState('processing');
  };

  const handleAnalysisSuccess = (data: FoodAnalysis) => {
    setAnalysisData(data);
    setCurrentState('results');
  };

  const handleAnalysisError = (error: string) => {
    setErrorMessage(error);
    setCurrentState('error');
  };

  const handleRetry = () => {
    setCurrentState('camera');
    setAnalysisData(null);
    setErrorMessage('');
  };

  const handleScanAnother = () => {
    setCurrentState('camera');
    setAnalysisData(null);
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <AppHeader />
      
      {/* Navigation */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto px-4 py-2 space-y-3">
          <Link href="/diary">
            <button 
              className="w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center space-x-2"
              data-testid="button-view-diary"
            >
              <Book className="h-4 w-4" />
              <span>View Food Diary</span>
            </button>
          </Link>
          <Link href="/advice">
            <button 
              className="w-full bg-primary/10 text-primary border border-primary/20 py-3 px-4 rounded-lg font-medium hover:bg-primary/20 transition-colors flex items-center justify-center space-x-2"
              data-testid="button-diet-advice"
            >
              <Lightbulb className="h-4 w-4" />
              <span>Get Diet Advice</span>
            </button>
          </Link>
          <Link href="/goals">
            <button 
              className="w-full bg-accent/10 text-accent-foreground border border-accent/20 py-3 px-4 rounded-lg font-medium hover:bg-accent/20 transition-colors flex items-center justify-center space-x-2"
              data-testid="button-nutrition-goals"
            >
              <Target className="h-4 w-4" />
              <span>Set Nutrition Goals</span>
            </button>
          </Link>
          <Link href="/help">
            <button 
              className="w-full bg-muted/50 text-muted-foreground border border-muted py-3 px-4 rounded-lg font-medium hover:bg-muted transition-colors flex items-center justify-center space-x-2"
              data-testid="button-help"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help & Support</span>
            </button>
          </Link>
        </div>
      )}

      <div className="max-w-md mx-auto">
        {currentState === 'camera' && (
          <CameraInterface
            onAnalysisStart={handleAnalysisStart}
            onAnalysisSuccess={handleAnalysisSuccess}
            onAnalysisError={handleAnalysisError}
          />
        )}
        
        {currentState === 'processing' && <ProcessingState />}
        
        {currentState === 'results' && analysisData && (
          <ResultsDisplay 
            data={analysisData} 
            onScanAnother={handleScanAnother}
          />
        )}
        
        {currentState === 'error' && (
          <ErrorState 
            message={errorMessage}
            onRetry={handleRetry}
          />
        )}
      </div>

      {/* Drinks Bar - Moved to bottom */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto">
          <DrinksBar />
        </div>
      )}
    </div>
  );
}
