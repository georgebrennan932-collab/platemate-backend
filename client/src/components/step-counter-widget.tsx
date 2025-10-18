import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Activity, RefreshCw, Plus, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Health } from 'capacitor-health';
import { useLocation } from "wouter";

interface StepData {
  stepCount: number;
}

export function StepCounterWidget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
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
    console.log('[StepCounter] fetchStepsFromDevice called, silent:', silent);
    
    // Show immediate feedback that button was pressed
    if (!silent) {
      alert('Sync button clicked! Starting sync...');
      toast({
        title: "Syncing Steps...",
        description: "Connecting to Health Connect",
      });
    }
    
    // Prevent duplicate syncs within 10 seconds (reduced for testing)
    if (lastSyncAttempt) {
      const timeSinceLastSync = Date.now() - lastSyncAttempt.getTime();
      if (timeSinceLastSync < 10000) {
        console.log('[StepCounter] Skipping sync - last attempt was', timeSinceLastSync, 'ms ago');
        toast({
          title: "Please Wait",
          description: `Wait ${Math.ceil((10000 - timeSinceLastSync) / 1000)} seconds before syncing again`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSyncing(true);
    setLastSyncAttempt(new Date());

    try {
      // Check if running in native app
      if (typeof window === 'undefined' || !(window as any).Capacitor) {
        throw new Error('Step tracking requires the native mobile app');
      }
      alert('Step 1: Capacitor detected');

      // Check if Health Connect is available
      const { available } = await Health.isHealthAvailable();
      alert(`Step 2: Health available = ${available}`);
      
      if (!available) {
        throw new Error('Health Connect is not installed. Please install it from the Play Store');
      }

      // Request authorization with correct permission format
      alert('Step 3: Requesting permissions...');
      const permissionResult = await Health.requestHealthPermissions({
        permissions: ['READ_STEPS']
      });
      alert(`Step 4: Permissions granted = ${JSON.stringify(permissionResult)}`);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();

      console.log('[StepCounter] Querying steps from', today.toISOString(), 'to', now.toISOString());
      
      // Query step count using correct method and parameters
      const result = await Health.queryAggregated({
        dataType: 'steps',
        startDate: today.toISOString(),
        endDate: now.toISOString(),
        bucket: 'day'
      });
      
      console.log('[StepCounter] Query result:', result);

      // Sum all step counts for today
      const totalSteps = result.aggregatedData && result.aggregatedData.length > 0
        ? result.aggregatedData.reduce((sum, sample) => sum + sample.value, 0)
        : 0;

      console.log('[StepCounter] Total steps:', totalSteps);
      await updateStepsMutation.mutateAsync(totalSteps);
      
      if (!silent) {
        toast({
          title: "Steps Synced!",
          description: `${totalSteps.toLocaleString()} steps recorded`,
        });
      }
    } catch (error: any) {
      alert(`ERROR: ${error.message || error.toString()}`);
      toast({
        title: "Sync Failed",
        description: error.message || "Use manual entry to add your steps",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync disabled temporarily for testing - will re-enable after confirming manual sync works
  // useEffect(() => {
  //   fetchStepsFromDevice(true);
  //   const interval = setInterval(() => {
  //     fetchStepsFromDevice(true);
  //   }, 300000); // 5 minutes
  //   
  //   return () => clearInterval(interval);
  // }, []);

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
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl p-4 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-300/50">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => setLocation('/rewards')}
            className="flex items-center space-x-3 flex-1 cursor-pointer"
          >
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
          <div className="flex flex-col items-end space-y-1 ml-2">
            <button
              onClick={() => {
                console.log('[StepCounter] Sync button clicked!');
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
              onClick={() => {
                console.log('[StepCounter] Manual entry button clicked!');
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
