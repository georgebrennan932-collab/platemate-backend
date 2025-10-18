import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity, ArrowLeft, RefreshCw, TrendingUp, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface StepEntry {
  id: string;
  userId: string;
  stepCount: number;
  loggedDate: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export function ActivityPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch today's steps from backend
  const { data: todaySteps, isLoading } = useQuery<StepEntry>({
    queryKey: ['/api/steps/today'],
  });

  // Fetch step history
  const { data: stepHistory = [] } = useQuery<StepEntry[]>({
    queryKey: ['/api/steps'],
  });

  // Mutation to update steps
  const updateStepsMutation = useMutation({
    mutationFn: async (stepCount: number) => {
      const res = await fetch('/api/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stepCount }),
      });
      if (!res.ok) throw new Error('Failed to update steps');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/steps/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/steps'] });
    },
  });

  // Fetch steps from device health data
  const fetchStepsFromDevice = async () => {
    try {
      setIsRefreshing(true);
      setErrorMessage(null);

      // Check if Capacitor and Health plugin are available
      if (typeof window === 'undefined' || !(window as any).Capacitor) {
        setErrorMessage('Step tracking requires the native mobile app. For now, steps will sync automatically when available.');
        setIsRefreshing(false);
        return;
      }

      // Try to import and use the health plugin dynamically
      try {
        const { Health } = await import('capacitor-health');
        
        // Request authorization
        await Health.requestAuthorization({
          read: ['STEPS'],
          write: []
        });

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const now = new Date();

        // Query step count
        const result = await Health.query({
          sampleType: 'STEPS',
          startDate: today.toISOString(),
          endDate: now.toISOString()
        });

        // Sum all step counts for today
        const totalSteps = Array.isArray(result) 
          ? result.reduce((sum: number, item: any) => sum + (item.value || item.count || 0), 0)
          : 0;

        // Update backend
        await updateStepsMutation.mutateAsync(totalSteps);
        setErrorMessage(null);
      } catch (pluginError: any) {
        console.error('Health plugin error:', pluginError);
        setErrorMessage('Health data access not available. Steps will sync automatically when the feature is enabled.');
      }
      
      setIsRefreshing(false);
    } catch (error: any) {
      console.error('Fetch steps error:', error);
      setErrorMessage('Step tracking will be available in the mobile app.');
      setIsRefreshing(false);
    }
  };

  // Auto-fetch steps on mount
  useEffect(() => {
    // Try to sync steps automatically
    fetchStepsFromDevice();
  }, []);

  // Format step count with commas
  const formatSteps = (steps: number): string => {
    return steps.toLocaleString();
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Calculate weekly average
  const weeklyAverage = stepHistory.length > 0 
    ? Math.round(stepHistory.slice(0, 7).reduce((sum, entry) => sum + entry.stepCount, 0) / Math.min(7, stepHistory.length))
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-purple-500 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  const currentSteps = todaySteps?.stepCount || 0;
  const dailyGoal = 10000;
  const progress = Math.min((currentSteps / dailyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-purple-500 dark:bg-gray-900 pb-24">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/diary">
              <button
                className="flex items-center space-x-2 text-white hover:text-purple-200 transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
            </Link>

            <Button
              onClick={fetchStepsFromDevice}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
              data-testid="button-refresh-steps"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <Activity className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">
              Daily Activity
            </h1>
          </div>
          <p className="text-white/90">
            Track your steps automatically from your device
          </p>
        </div>

        {/* Info Message */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-200 px-4 py-3 rounded-lg mb-4"
            data-testid="info-message"
          >
            <p className="text-sm">{errorMessage}</p>
          </motion.div>
        )}

        {/* Today's Steps Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="text-center mb-4">
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Today's Steps
            </h2>
            <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-2" data-testid="text-step-count">
              {formatSteps(currentSteps)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Goal: {formatSteps(dailyGoal)} steps
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-600 to-violet-600"
            />
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
            {progress.toFixed(0)}% of daily goal
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-purple-600 mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatSteps(weeklyAverage)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">7-day average</p>
            </div>
            <div className="text-center">
              <Calendar className="h-5 w-5 mx-auto text-violet-600 mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stepHistory.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Days tracked</p>
            </div>
          </div>
        </motion.div>

        {/* Step History */}
        {stepHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3" data-testid="step-history">
              {stepHistory.slice(0, 7).map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatSteps(entry.stepCount)} steps
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(entry.loggedDate)}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    entry.stepCount >= dailyGoal
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                  }`}>
                    {entry.stepCount >= dailyGoal ? '✓ Goal met' : `${Math.round((entry.stepCount / dailyGoal) * 100)}%`}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
