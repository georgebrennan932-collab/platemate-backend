import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Link as LinkIcon, Unlink, AlertTriangle, Clock, Activity } from 'lucide-react';
import { googleFitService } from '@/lib/google-fit-service';
import { useToast } from '@/hooks/use-toast';

interface GoogleFitIntegrationProps {
  onStepsSync?: (steps: number) => void;
  className?: string;
}

export function GoogleFitIntegration({ onStepsSync, className }: GoogleFitIntegrationProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncedSteps, setSyncedSteps] = useState<number>(0);

  useEffect(() => {
    initializeGoogleFit();
  }, []);

  const initializeGoogleFit = async () => {
    const initialized = await googleFitService.initialize();
    setIsConnected(initialized);
    setLastSync(googleFitService.getLastSyncTime());
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await googleFitService.authenticate();
      if (success) {
        setIsConnected(true);
        toast({
          title: "Google Fit Connected",
          description: "Successfully connected to Google Fit. You can now sync your fitness data.",
        });
        
        // Immediately sync after connecting
        await handleSync();
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Google Fit. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Google Fit connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Google Fit.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    googleFitService.disconnect();
    setIsConnected(false);
    setLastSync(null);
    setSyncedSteps(0);
    
    toast({
      title: "Google Fit Disconnected",
      description: "Your Google Fit account has been disconnected.",
    });
  };

  const handleSync = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect to Google Fit first.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await googleFitService.syncWithLocalSteps();
      
      if (result.synced) {
        setSyncedSteps(result.steps);
        setLastSync(new Date());
        onStepsSync?.(result.steps);
        
        toast({
          title: "Sync Successful",
          description: `Synced ${result.steps.toLocaleString()} steps from Google Fit.`,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to sync data from Google Fit. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Google Fit sync error:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing with Google Fit.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary" />
          <span>Google Fit Integration</span>
          {isConnected ? (
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">Disconnected</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Sync your fitness data from Google Fit to get accurate step counts and activity tracking.
          {!isConnected && (
            <>
              <br />
              <span className="flex items-center space-x-1 mt-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Note: Google Fit APIs are being deprecated in 2026.</span>
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Google Fit account to automatically sync step counts, distance, and other fitness metrics.
            </p>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
              data-testid="button-connect-google-fit"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect Google Fit
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sync Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Last sync: {formatLastSync(lastSync)}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleSync}
                disabled={isSyncing}
                data-testid="button-sync-google-fit"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>

            {/* Synced Data */}
            {syncedSteps > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Today's Steps</span>
                  <span className="text-lg font-bold text-primary">{syncedSteps.toLocaleString()}</span>
                </div>
              </div>
            )}

            <Separator />

            {/* Disconnect Option */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Account Connected</p>
                <p className="text-xs text-muted-foreground">Google Fit data is being synced</p>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDisconnect}
                data-testid="button-disconnect-google-fit"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Available Data:</p>
          <ul className="text-xs text-muted-foreground space-y-1 pl-4">
            <li>• Daily step counts</li>
            <li>• Distance traveled</li>
            <li>• Calories burned</li>
            <li>• Active minutes</li>
            <li>• Heart rate (if available)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}