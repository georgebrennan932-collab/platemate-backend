import { useState, useEffect } from 'react';
import { gestureService } from '@/lib/gesture-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, 
  ArrowLeftRight, 
  Smartphone, 
  MousePointer2, 
  RotateCcw, 
  Settings, 
  TestTube2,
  CheckCircle,
  AlertTriangle,
  Mic
} from 'lucide-react';
import { SpeechSettings } from '@/components/speech-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function GestureSettings() {
  const [settings, setSettings] = useState(gestureService.getSettings());
  const [isGestureServiceActive, setIsGestureServiceActive] = useState(gestureService.isGestureEnabled());
  const [testingGesture, setTestingGesture] = useState<string | null>(null);

  useEffect(() => {
    // Update gesture service when settings change
    gestureService.updateSettings(settings);
  }, [settings]);

  const handleToggleGestures = async (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    setSettings(newSettings);
    gestureService.updateSettings(newSettings);

    if (enabled && !isGestureServiceActive) {
      const success = await gestureService.initialize();
      setIsGestureServiceActive(success);
    } else if (!enabled && isGestureServiceActive) {
      await gestureService.disable();
      setIsGestureServiceActive(false);
    }
  };

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  const testGesture = (gestureType: string) => {
    setTestingGesture(gestureType);
    
    // Show test gesture overlay
    if ((window as any).showGestureOverlay) {
      (window as any).showGestureOverlay(gestureType, 1);
    }

    // Reset after animation
    setTimeout(() => {
      setTestingGesture(null);
    }, 1500);
  };

  const resetToDefaults = () => {
    const defaultSettings = {
      enabled: true,
      swipeNavigation: true,
      shakeActions: true,
      tiltMenus: true,
      doubleTapActions: true
    };
    setSettings(defaultSettings);
    gestureService.updateSettings(defaultSettings);
  };

  return (
    <Tabs defaultValue="gestures" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="gestures" className="flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span>Gestures</span>
        </TabsTrigger>
        <TabsTrigger value="speech" className="flex items-center space-x-2">
          <Mic className="h-4 w-4" />
          <span>Speech</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="gestures" className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Gesture Navigation</span>
            {isGestureServiceActive && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                Active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Navigate through PlateMate using intuitive hand gestures and device movements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Enable Gesture Controls</div>
                <div className="text-sm text-muted-foreground">
                  Turn on gesture-based navigation throughout the app
                </div>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={handleToggleGestures}
            />
          </div>

          {!isGestureServiceActive && settings.enabled && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Gesture service could not be initialized. Motion sensors may not be available on this device.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {settings.enabled && (
        <>
          {/* Gesture Types */}
          <Card>
            <CardHeader>
              <CardTitle>Gesture Types</CardTitle>
              <CardDescription>
                Customize which types of gestures you want to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Swipe Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium">Swipe Navigation</div>
                    <div className="text-sm text-muted-foreground">
                      Swipe left/right to navigate between pages
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testGesture('swipe-left')}
                    disabled={testingGesture === 'swipe-left'}
                  >
                    <TestTube2 className="h-3 w-3 mr-1" />
                    Test
                  </Button>
                  <Switch
                    checked={settings.swipeNavigation}
                    onCheckedChange={(value) => handleSettingChange('swipeNavigation', value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Shake Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="font-medium">Shake Actions</div>
                    <div className="text-sm text-muted-foreground">
                      Shake device to open help or quick actions
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testGesture('shake')}
                    disabled={testingGesture === 'shake'}
                  >
                    <TestTube2 className="h-3 w-3 mr-1" />
                    Test
                  </Button>
                  <Switch
                    checked={settings.shakeActions}
                    onCheckedChange={(value) => handleSettingChange('shakeActions', value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Tilt Menus */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <RotateCcw className="h-4 w-4 text-purple-500" />
                  <div>
                    <div className="font-medium">Tilt Controls</div>
                    <div className="text-sm text-muted-foreground">
                      Tilt device to navigate back or open menus
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testGesture('tilt-left')}
                    disabled={testingGesture === 'tilt-left'}
                  >
                    <TestTube2 className="h-3 w-3 mr-1" />
                    Test
                  </Button>
                  <Switch
                    checked={settings.tiltMenus}
                    onCheckedChange={(value) => handleSettingChange('tiltMenus', value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Double Tap Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MousePointer2 className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="font-medium">Double-Tap Shortcuts</div>
                    <div className="text-sm text-muted-foreground">
                      Double-tap screen for quick access to AI advice
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testGesture('double-tap')}
                    disabled={testingGesture === 'double-tap'}
                  >
                    <TestTube2 className="h-3 w-3 mr-1" />
                    Test
                  </Button>
                  <Switch
                    checked={settings.doubleTapActions}
                    onCheckedChange={(value) => handleSettingChange('doubleTapActions', value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gesture Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Gesture Guide</CardTitle>
              <CardDescription>
                Learn how to use gesture navigation effectively
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-700 dark:text-blue-300">Swipe Navigation</span>
                  </div>
                  <ul className="text-sm space-y-1 text-blue-600 dark:text-blue-400">
                    <li>← Swipe right: Previous page</li>
                    <li>→ Swipe left: Next page</li>
                    <li>↑ Swipe up: Scroll to top</li>
                    <li>↓ Swipe down: Refresh page</li>
                  </ul>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Smartphone className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-300">Shake Actions</span>
                  </div>
                  <ul className="text-sm space-y-1 text-red-600 dark:text-red-400">
                    <li>🤳 Quick shake: Open help page</li>
                    <li>📱 Rapid shake: Emergency actions</li>
                  </ul>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <RotateCcw className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-purple-700 dark:text-purple-300">Tilt Controls</span>
                  </div>
                  <ul className="text-sm space-y-1 text-purple-600 dark:text-purple-400">
                    <li>📱← Tilt left: Go back</li>
                    <li>📱→ Tilt right: Open profile</li>
                  </ul>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <MousePointer2 className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-orange-700 dark:text-orange-300">Touch Gestures</span>
                  </div>
                  <ul className="text-sm space-y-1 text-orange-600 dark:text-orange-400">
                    <li>👆👆 Double-tap: AI advice</li>
                    <li>👆 Long press: Context menu</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reset Options */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Reset to Defaults</div>
                  <div className="text-sm text-muted-foreground">
                    Restore all gesture settings to their default values
                  </div>
                </div>
                <Button variant="outline" onClick={resetToDefaults}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </TabsContent>
      
      <TabsContent value="speech" className="space-y-6">
        <SpeechSettings />
      </TabsContent>
    </Tabs>
  );
}