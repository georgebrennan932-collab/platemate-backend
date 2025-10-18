import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Activity, RefreshCw, Plus, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Health } from 'capacitor-health';
import { Link } from "wouter";

interface StepData {
  stepCount: number;
}

export function StepCounterWidget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualSteps, setManualSteps] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  const { data: todaySteps, isLoading } = useQuery<StepData>({
    queryKey: ['/api/steps/today'],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const updateStepsMutation = useMutation({
    mutationFn: async (stepCount: number) => {
      const response = await apiRequest('POST', '/api/steps', { stepCount });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update steps');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/steps/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/steps'] });
      toast({
        title: "Steps Updated",
        description: "Your step count has been saved!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchStepsFromDevice = async (silent: boolean = false) => {
    // Prevent duplicate syncs within 1 minute
    if (lastSyncAttempt) {
      const timeSinceLastSync = Date.now() - lastSyncAttempt.getTime();
      if (timeSinceLastSync < 60000) {
        return;
      }
    }

    setIsSyncing(true);
    setLastSyncAttempt(new Date());

    try {
      // Check if running in native app
      if (typeof window === 'undefined' || !(window as any).Capacitor) {
        if (!silent) {
          throw new Error('Step tracking requires the native mobile app');
        }
        return;
      }

      // Request authorization
      await (Health as any).requestAuthorization({
        read: ['STEPS'],
        write: []
      });

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();

      // Query step count
      const result = await (Health as any).query({
        sampleType: 'STEPS',
        startDate: today.toISOString(),
        endDate: now.toISOString()
      });

      // Sum all step counts for today
      const totalSteps = Array.isArray(result) 
        ? result.reduce((sum: number, item: any) => sum + (item.value || item.count || 0), 0)
        : 0;

      await updateStepsMutation.mutateAsync(totalSteps);
      
      if (!silent) {
        toast({
          title: "Steps Synced!",
          description: `${totalSteps.toLocaleString()} steps recorded`,
        });
      }
    } catch (error: any) {
      if (!silent) {
        toast({
          title: "Sync Failed",
          description: "Use manual entry to add your steps",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync on mount and every 5 minutes
  useEffect(() => {
    fetchStepsFromDevice(true);
    const interval = setInterval(() => {
      fetchStepsFromDevice(true);
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  const handleManualUpdate = () => {
    const steps = parseInt(manualSteps);
    if (isNaN(steps) || steps < 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }
    updateStepsMutation.mutate(steps);
    setIsManualDialogOpen(false);
    setManualSteps("");
  };

  const stepCount = todaySteps?.stepCount ?? 0;
  const earnedCalories = Math.round(stepCount * 0.04); // Reward calculation

  return (
    <>
      <Link href="/rewards">
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl p-4 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-300/50 cursor-pointer">
          <div className="flex items-center justify-between">
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
            <div className="flex flex-col items-end space-y-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fetchStepsFromDevice(false);
                }}
                disabled={isSyncing || updateStepsMutation.isPending}
                className="p-1.5 bg-white/20 hover:bg-white/30 disabled:bg-white/10 rounded-lg transition-all"
                data-testid="button-sync-steps"
                title="Sync from device"
              >
                <RefreshCw className={`h-4 w-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsManualDialogOpen(true);
                }}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                data-testid="button-manual-steps"
                title="Manual entry"
              >
                <Plus className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </Link>

      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle>Enter Steps Manually</DialogTitle>
            <DialogDescription>
              Enter your step count for today
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Enter step count"
              value={manualSteps}
              onChange={(e) => setManualSteps(e.target.value)}
              data-testid="input-manual-steps"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsManualDialogOpen(false)}
                data-testid="button-cancel-manual"
              >
                Cancel
              </Button>
              <Button
                onClick={handleManualUpdate}
                disabled={updateStepsMutation.isPending}
                data-testid="button-save-manual-steps"
              >
                Save Steps
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
