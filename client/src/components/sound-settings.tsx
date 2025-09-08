import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Volume2, VolumeX, TestTube2 } from "lucide-react";
import { soundService } from "@/lib/sound-service";

export function SoundSettings() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(soundService.isEnabled());
  }, []);

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    soundService.setEnabled(enabled);
    
    if (enabled) {
      // Play a welcome sound when enabling
      soundService.playSuccess();
    }
  };

  const testSounds = async () => {
    await soundService.playClick();
    setTimeout(() => soundService.playSuccess(), 300);
    setTimeout(() => soundService.playNotification(), 600);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {soundEnabled ? (
            <Volume2 className="h-5 w-5 text-blue-600" />
          ) : (
            <VolumeX className="h-5 w-5 text-gray-400" />
          )}
          <span>Sound Effects</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="sound-toggle">Enable sound effects</Label>
            <p className="text-sm text-muted-foreground">
              Play sounds for notifications, button clicks, and feedback
            </p>
          </div>
          <Switch
            id="sound-toggle"
            checked={soundEnabled}
            onCheckedChange={handleToggleSound}
            data-testid="switch-sound-enabled"
          />
        </div>

        {soundEnabled && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={testSounds}
              className="flex items-center space-x-2"
              data-testid="button-test-sounds"
            >
              <TestTube2 className="h-4 w-4" />
              <span>Test Sounds</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}