import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Activity, RefreshCw, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Health } from 'capacitor-health';

interface StepData {
  stepCount: number;
}

export function StepCounterWidget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualSteps, setManualSteps] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: todaySteps, isLoading } = useQuery<StepData>({
    queryKey: ['/api/steps/today'],
    refetchInterval: 60000,
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

  const fetchStepsFromDevice = async () => {
    setIsSyncing(true);
    try {
      // Check if running in native app
      if (typeof window === 'undefined' || !(window as any).Capacitor) {
        throw new Error('Step tracking requires the native mobile app');
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
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: "Use manual entry to add your steps",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
  const caloriesBurned = Math.round(stepCount * 0.04);

  return (
    <>
      <div className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 rounded-3xl p-6 shadow-2xl border-2 border-green-300/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <Activity className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Daily Steps</h3>
              <p className="text-white/90 text-sm">Track your activity</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
          <div className="text-center">
            {isLoading ? (
              <div className="text-white/80 text-sm">Loading...</div>
            ) : (
              <>
                <div className="text-5xl font-bold text-white mb-1" data-testid="text-step-count">
                  {stepCount.toLocaleString()}
                </div>
                <div className="text-white/80 text-sm mb-2">steps today</div>
                <div className="text-white/90 text-xs">
                  ~{caloriesBurned} calories burned
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={fetchStepsFromDevice}
            disabled={isSyncing || updateStepsMutation.isPending}
            className="flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white rounded-xl py-3 px-4 transition-all duration-200 font-medium text-sm"
            data-testid="button-sync-steps"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Device'}</span>
          </button>
          <button
            onClick={() => setIsManualDialogOpen(true)}
            className="flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 text-white rounded-xl py-3 px-4 transition-all duration-200 font-medium text-sm"
            data-testid="button-manual-steps"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Entry</span>
          </button>
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
