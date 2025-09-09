import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Link as LinkIcon, Unlink, AlertTriangle, Clock, Activity } from 'lucide-react';
import { healthConnectService } from '@/lib/health-connect-service';
import { useToast } from '@/hooks/use-toast';

interface HealthConnectIntegrationProps {
  onStepsSync?: (steps: number) => void;
  className?: string;
}

export function HealthConnectIntegration({ onStepsSync, className }: HealthConnectIntegrationProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncedSteps, setSyncedSteps] = useState<number>(0);

  useEffect(() => {
    initializeHealthConnect();
  }, []);

  const initializeHealthConnect = async () => {
    const initialized = await healthConnectService.initialize();
    setIsConnected(initialized);
    if (initialized) {
      setLastSync(new Date());
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await healthConnectService.authenticate();
      if (success) {
        setIsConnected(true);
        toast({
          title: "Health Connect Connected",
          description: "Successfully connected to Health Connect. You can now sync your fitness data.",
        });
        
        // Immediately sync after connecting
        await handleSync();
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Health Connect. Please install Health Connect app from Play Store.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Health Connect connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Health Connect. Please ensure the app is installed.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    healthConnectService.logout();
    setIsConnected(false);
    setLastSync(null);
    setSyncedSteps(0);
    
    toast({
      title: "Health Connect Disconnected",
      description: "Your Health Connect account has been disconnected.",
    });
  };

  const handleSync = async () => {
    if (!isConnected) return;
    
    setIsSyncing(true);
    try {
      const result = await healthConnectService.syncWithLocalSteps();
      if (result.synced) {
        setSyncedSteps(result.steps);
        setLastSync(new Date());
        onStepsSync?.(result.steps);
        
        toast({
          title: "Sync Complete",
          description: `Synced ${result.steps} steps from Health Connect.`,
        });
      } else {
        toast({
          title: "No New Data",
          description: "Your step count is already up to date.",
        });
      }
    } catch (error) {
      console.error('Health Connect sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Health Connect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg">Health Connect</CardTitle>
          </div>
          <Badge 
            variant={isConnected ? "default" : "secondary"}
            className={isConnected ? "bg-emerald-500 hover:bg-emerald-600" : ""}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        <CardDescription>
          Sync your fitness data from Android Health Connect to track daily activity and nutrition goals.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Health Connect integration provides more accurate step tracking</span>
            </div>
            
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect Health Connect
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{syncedSteps.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Steps Today</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground">Last Sync</div>
                <div className="text-sm">
                  {lastSync ? (
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ) : (
                    "Never"
                  )}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1"
                variant="outline"
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
              
              <Button 
                onClick={handleDisconnect}
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              Health Connect provides comprehensive health data management with enhanced privacy controls.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}