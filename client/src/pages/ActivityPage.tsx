import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity, ArrowLeft, RefreshCw, TrendingUp, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { buildApiUrl } from "@/lib/api-config";
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

  // Fetch today's steps
  const { data: todaySteps, isLoading } = useQuery<StepEntry>({
    queryKey: ["/api/steps/today"],
  });

  // Fetch step history
  const { data: stepHistory = [] } = useQuery<StepEntry[]>({
    queryKey: ["/api/steps"],
  });

  // Update step count on backend
  const updateStepsMutation = useMutation({
    mutationFn: async (stepCount: number) => {
      const res = await fetch(buildApiUrl("/api/steps"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stepCount }),
      });
      if (!res.ok) throw new Error("Failed to update steps");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/steps/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/steps"] });
    },
  });

  // Fetch steps from device or mock data
  const fetchStepsFromDevice = async () => {
    try {
      setIsRefreshing(true);
      setErrorMessage(null);

      // If not running in native mobile environment
      if (typeof window === "undefined" || !(window as any).Capacitor) {
        setErrorMessage(
          "Step tracking requires the native mobile app. Using mock data until Google Fit integration is enabled."
        );
      }

      // Mock random step data (for now)
      const result = [{ value: Math.floor(Math.random() * 8000) + 2000 }];

      // Sum step count
      const totalSteps = Array.isArray(result)
        ? result.reduce((sum: number, item: any) => sum + (item.value || 0), 0)
        : 0;

      // Update backend
      await updateStepsMutation.mutateAsync(totalSteps);
    } catch (error: any) {
      console.error("Step fetch error:", error);
      setErrorMessage("Step tracking unavailable. Using mock data.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchStepsFromDevice();
  }, []);

  const formatSteps = (steps: number): string => steps.toLocaleString();

  const formatDate = (dateStr: string): string => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const weeklyAverage =
    stepHistory.length > 0
      ? Math.round(
          stepHistory
            .slice(0, 7)
            .reduce((sum, entry) => sum + entry.stepCount, 0) /
            Math.min(7, stepHistory.length)
        )
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
              <button className="flex items-center space-x-2 text-white hover:text-purple-200 transition-colors">
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
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              Sync
            </Button>
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <Activity className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Daily Activity</h1>
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
          >
            <p className="text-sm">{errorMessage}</p>
          </motion.div>
        )}

        {/* Today's Steps */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="text-center mb-4">
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Today's Steps
            </h2>
            <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-2">
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

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-purple-600 mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatSteps(weeklyAverage)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                7-day average
              </p>
            </div>
            <div className="text-center">
              <Calendar className="h-5 w-5 mx-auto text-violet-600 mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stepHistory.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Days tracked
              </p>
            </div>
          </div>
        </motion.div>

        {/* Step History */}
        {stepHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
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
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      entry.stepCount >= dailyGoal
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {entry.stepCount >= dailyGoal
                      ? "✓ Goal met"
                      : `${Math.round((entry.stepCount / dailyGoal) * 100)}%`}
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
