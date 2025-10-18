import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useLocation } from "wouter";

interface StepData {
  stepCount: number;
}

export function StepCounterWidget() {
  const [, setLocation] = useLocation();

  const { data: todaySteps, isLoading } = useQuery<StepData>({
    queryKey: ['/api/steps/today'],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const stepCount = todaySteps?.stepCount ?? 0;
  const earnedCalories = Math.round(stepCount * 0.04); // Reward calculation

  return (
    <div 
      onClick={() => setLocation('/rewards')}
      className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl p-4 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-300/50 cursor-pointer"
      data-testid="card-steps-rewards"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full relative">
          <Zap className="h-6 w-6 text-white animate-pulse" />
          <div className="absolute inset-0 rounded-full animate-ping bg-yellow-300/30"></div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-0.5">Steps Rewards</h3>
          {isLoading ? (
            <p className="text-white/80 text-xs">Loading...</p>
          ) : (
            <p className="text-white/90 text-xs">{stepCount.toLocaleString()} steps = {earnedCalories} calories earned</p>
          )}
        </div>
      </div>
    </div>
  );
}
