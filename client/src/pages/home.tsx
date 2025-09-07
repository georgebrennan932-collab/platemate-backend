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
        <div className="max-w-md mx-auto px-4 py-2 space-y-4">
          <Link href="/diary">
            <button 
              className="w-full modern-card hover:scale-[1.02] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/30 py-4 px-6 rounded-xl font-medium smooth-transition flex items-center justify-center space-x-3 group"
              data-testid="button-view-diary"
            >
              <Book className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 smooth-transition" />
              <span className="text-blue-700 dark:text-blue-300">View Food Diary</span>
            </button>
          </Link>
          <Link href="/advice">
            <button 
              className="w-full gradient-button hover:scale-[1.02] py-4 px-6 rounded-xl font-medium flex items-center justify-center space-x-3 group"
              data-testid="button-diet-advice"
            >
              <Lightbulb className="h-5 w-5 group-hover:scale-110 smooth-transition" />
              <span>Get Diet Advice</span>
            </button>
          </Link>
          <Link href="/goals">
            <button 
              className="w-full modern-card hover:scale-[1.02] bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200/50 dark:border-emerald-700/30 py-4 px-6 rounded-xl font-medium smooth-transition flex items-center justify-center space-x-3 group"
              data-testid="button-nutrition-goals"
            >
              <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 smooth-transition" />
              <span className="text-emerald-700 dark:text-emerald-300">Set Nutrition Goals</span>
            </button>
          </Link>
          <Link href="/help">
            <button 
              className="w-full modern-card hover:scale-[1.02] bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border-gray-200/50 dark:border-gray-700/30 py-4 px-6 rounded-xl font-medium smooth-transition flex items-center justify-center space-x-3 group"
              data-testid="button-help"
            >
              <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:scale-110 smooth-transition" />
              <span className="text-gray-700 dark:text-gray-300">Help & Support</span>
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
