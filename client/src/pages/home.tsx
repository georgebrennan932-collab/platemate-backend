import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { CameraInterface } from "@/components/camera-interface";
import { ProcessingState } from "@/components/processing-state";
import { ResultsDisplay } from "@/components/results-display";
import { ErrorState } from "@/components/error-state";
import { DrinksBar } from "@/components/drinks-bar";
import { Link } from "wouter";
import { Book, Utensils, Lightbulb, Target, HelpCircle, Calculator, Syringe, Zap, TrendingUp } from "lucide-react";
import type { FoodAnalysis } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";

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
      
      {/* Quick Actions - Only show when camera is ready */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto px-4 py-2 space-y-4">
          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link href="/advice">
              <button 
                className="w-full gradient-button hover:scale-[1.02] py-4 px-4 rounded-xl font-medium flex flex-col items-center justify-center space-y-2 group min-h-[80px]"
                data-testid="button-diet-advice"
              >
                <Lightbulb className="h-6 w-6 group-hover:scale-110 smooth-transition" />
                <span className="text-sm">AI Advice</span>
              </button>
            </Link>
            <Link href="/help">
              <button 
                className="w-full modern-card hover:scale-[1.02] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200/50 dark:border-indigo-700/30 py-4 px-4 rounded-xl font-medium smooth-transition flex flex-col items-center justify-center space-y-2 group min-h-[80px]"
                data-testid="button-help"
              >
                <HelpCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 smooth-transition" />
                <span className="text-sm text-indigo-700 dark:text-indigo-300">Help</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Persistent Quick Actions Bar */}
      {(currentState === 'processing' || currentState === 'results' || currentState === 'error') && (
        <div className="max-w-md mx-auto px-4 py-2 mb-4">
          <div className="flex justify-center space-x-4">
            <Link href="/diary">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" data-testid="quick-diary">
                <Book className="h-4 w-4" />
                <span className="text-sm font-medium">Diary</span>
              </button>
            </Link>
            <Link href="/advice">
              <button className="flex items-center space-x-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors" data-testid="quick-advice">
                <Lightbulb className="h-4 w-4" />
                <span className="text-sm font-medium">Advice</span>
              </button>
            </Link>
          </div>
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
      
      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Bottom padding to prevent content from being hidden behind bottom nav */}
      <div className="h-20"></div>
    </div>
  );
}
