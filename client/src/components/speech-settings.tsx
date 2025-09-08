import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mic, MicOff, Volume2, Brain, Settings, Zap } from 'lucide-react';
import { speechService, type VoiceCommand } from '@/lib/speech-service';

export function SpeechSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    continuous: false,
    wakeWord: 'hey platemate',
    voiceConfirmation: true
  });
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Check if speech recognition is supported
    setIsSupported(speechService.isSupported());

    // Load current settings
    const currentSettings = speechService.getSettings();
    setSettings(currentSettings);

    // Get available commands
    setCommands(speechService.getAvailableCommands());

    // Update listening state
    const updateListeningState = () => {
      setIsListening(speechService.isCurrentlyListening());
    };

    // Set up interval to check listening state
    const interval = setInterval(updateListeningState, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    speechService.updateSettings({ [key]: value });
  };

  const startListening = async () => {
    const started = await speechService.startListening(settings.continuous);
    if (started) {
      setIsListening(true);
    }
  };

  const stopListening = () => {
    speechService.stopListening();
    setIsListening(false);
  };

  const testVoiceCommand = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3 text-yellow-800 dark:text-yellow-200">
            <MicOff className="h-5 w-5" />
            <div>
              <p className="font-medium">Speech Recognition Not Available</p>
              <p className="text-sm opacity-80">
                Your browser doesn't support speech recognition or you're not using HTTPS.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Speech Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Speech Navigation Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="speech-enabled">Enable Speech Navigation</Label>
              <p className="text-sm text-muted-foreground">
                Allow voice commands to navigate the app
              </p>
            </div>
            <Switch
              id="speech-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
              data-testid="switch-speech-enabled"
            />
          </div>

          <Separator />

          {/* Continuous Listening */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="continuous-listening">Continuous Listening</Label>
              <p className="text-sm text-muted-foreground">
                Keep listening for commands after each recognition
              </p>
            </div>
            <Switch
              id="continuous-listening"
              checked={settings.continuous}
              onCheckedChange={(checked) => handleSettingChange('continuous', checked)}
              disabled={!settings.enabled}
              data-testid="switch-continuous-listening"
            />
          </div>

          <Separator />

          {/* Voice Confirmation */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="voice-confirmation">Voice Confirmations</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications when commands are recognized
              </p>
            </div>
            <Switch
              id="voice-confirmation"
              checked={settings.voiceConfirmation}
              onCheckedChange={(checked) => handleSettingChange('voiceConfirmation', checked)}
              disabled={!settings.enabled}
              data-testid="switch-voice-confirmation"
            />
          </div>

          <Separator />

          {/* Wake Word */}
          <div className="space-y-3">
            <Label htmlFor="wake-word">Wake Word (Future Feature)</Label>
            <Input
              id="wake-word"
              value={settings.wakeWord}
              onChange={(e) => handleSettingChange('wakeWord', e.target.value)}
              placeholder="hey platemate"
              disabled={!settings.enabled}
              data-testid="input-wake-word"
            />
            <p className="text-xs text-muted-foreground">
              Wake word functionality coming soon - currently all phrases are active
            </p>
          </div>

          <Separator />

          {/* Test Controls */}
          <div className="space-y-3">
            <Label>Test Speech Recognition</Label>
            <div className="flex items-center space-x-3">
              <Button
                onClick={testVoiceCommand}
                variant={isListening ? "destructive" : "default"}
                disabled={!settings.enabled}
                data-testid="button-test-speech"
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Listening
                  </>
                )}
              </Button>
              
              {isListening && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Listening...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Available Voice Commands</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Navigation Commands */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Navigation</span>
              </h4>
              <div className="grid gap-2">
                {commands
                  .filter(cmd => cmd.category === 'navigation')
                  .map((cmd, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{cmd.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cmd.phrases.slice(0, 3).map((phrase, phraseIndex) => (
                              <Badge key={phraseIndex} variant="secondary" className="text-xs">
                                "{phrase}"
                              </Badge>
                            ))}
                            {cmd.phrases.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{cmd.phrases.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Action Commands */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                <Volume2 className="h-4 w-4" />
                <span>Actions</span>
              </h4>
              <div className="grid gap-2">
                {commands
                  .filter(cmd => cmd.category === 'action')
                  .map((cmd, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{cmd.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cmd.phrases.slice(0, 3).map((phrase, phraseIndex) => (
                              <Badge key={phraseIndex} variant="secondary" className="text-xs">
                                "{phrase}"
                              </Badge>
                            ))}
                            {cmd.phrases.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{cmd.phrases.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Control Commands */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Control</span>
              </h4>
              <div className="grid gap-2">
                {commands
                  .filter(cmd => cmd.category === 'control')
                  .map((cmd, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{cmd.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cmd.phrases.slice(0, 3).map((phrase, phraseIndex) => (
                              <Badge key={phraseIndex} variant="secondary" className="text-xs">
                                "{phrase}"
                              </Badge>
                            ))}
                            {cmd.phrases.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{cmd.phrases.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Speech Recognition Tips</span>
            </h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Speak clearly and at a normal pace</li>
              <li>• Use any of the listed phrases for each command</li>
              <li>• Allow microphone access when prompted</li>
              <li>• Speech works best in quiet environments</li>
              <li>• Commands are case-insensitive</li>
              <li>• Some browsers may require HTTPS for speech recognition</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}