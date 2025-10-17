import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Heart, Brain, Lightbulb, RefreshCw, Star, Trophy, Zap, Calendar, Bell, BookOpen, Clock, Check, TestTube2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { notificationService } from "@/lib/notification-service";
import { soundService } from "@/lib/sound-service";
import { DropdownNavigation } from "@/components/dropdown-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SoundSettings } from "@/components/sound-settings";

interface DailyCoaching {
  motivation: string;
  nutritionTip: string;
  medicationTip?: string;
  encouragement: string;
  todaysFocus: string;
  streak: number;
  achievement?: string;
}

interface EducationalTip {
  id: string;
  title: string;
  content: string;
  category: 'nutrition' | 'medication' | 'motivation';
  importance: 'high' | 'medium' | 'low';
}

export function CoachingPage() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'nutrition' | 'medication' | 'motivation'>('all');
  const [showReminderSetup, setShowReminderSetup] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  // Load reminder settings from localStorage on component mount
  useEffect(() => {
    const savedTime = localStorage.getItem('platemate-reminder-time');
    const savedEnabled = localStorage.getItem('platemate-reminder-enabled');
    
    if (savedTime) {
      setReminderTime(savedTime);
    }
    if (savedEnabled === 'true') {
      setReminderEnabled(true);
    }

    // Initialize notification service and resume web notifications
    notificationService.initialize().then((hasPermission) => {
      if (hasPermission) {
        notificationService.resumeWebNotifications();
      }
    });
  }, []);

  // Save reminder settings to localStorage whenever they change
  const saveReminderTime = (time: string) => {
    setReminderTime(time);
    localStorage.setItem('platemate-reminder-time', time);
  };

  const saveReminderEnabled = async (enabled: boolean) => {
    setReminderEnabled(enabled);
    localStorage.setItem('platemate-reminder-enabled', enabled.toString());

    // Schedule or cancel notifications
    try {
      await notificationService.scheduleDaily({
        title: 'PlateMate Daily Coaching',
        body: '🌟 Your daily motivation and nutrition tips are ready!',
        time: reminderTime,
        enabled
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      toast({
        title: "Notification Error",
        description: "Failed to set up notifications. Please check your browser permissions.",
        variant: "destructive",
      });
    }
  };

  const { data: coaching, isLoading: coachingLoading, error: coachingError, refetch: refetchCoaching } = useQuery<DailyCoaching>({
    queryKey: ['/api/coaching/daily'],
    retry: 3,
    retryDelay: 1000,
  });

  const { data: tips, isLoading: tipsLoading } = useQuery<EducationalTip[]>({
    queryKey: [`/api/coaching/tips?category=${selectedCategory}`],
  });

  const generateCoachingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/coaching/generate');
      return await response.json();
    },
    onSuccess: () => {
      soundService.playSuccess();
      toast({
        title: "New Coaching Generated!",
        description: "Your daily motivation and tips have been updated.",
      });
      refetchCoaching();
    },
    onError: (error: Error) => {
      soundService.playError();
      toast({
        title: "Error",
        description: "Failed to generate new coaching content. Please try again.",
        variant: "destructive",
      });
      console.error("Error generating coaching:", error);
    },
  });

  const setupReminders = async () => {
    if (showReminderSetup) {
      try {
        // Save reminder settings and schedule notifications
        await saveReminderEnabled(true);
        setShowReminderSetup(false);
        await soundService.playSuccess();
        toast({
          title: "Reminders Set!",
          description: `Daily coaching reminders will be sent at ${reminderTime}`,
        });
      } catch (error) {
        console.error('Failed to setup reminders:', error);
        await soundService.playError();
        toast({
          title: "Setup Failed",
          description: "Could not set up reminders. Please check notification permissions.",
          variant: "destructive",
        });
      }
    } else {
      setShowReminderSetup(true);
    }
  };

  const toggleReminders = async (enabled: boolean) => {
    try {
      await saveReminderEnabled(enabled);
      if (enabled) {
        toast({
          title: "Reminders Enabled",
          description: "You'll receive daily coaching notifications",
        });
      } else {
        toast({
          title: "Reminders Disabled",
          description: "Daily coaching notifications turned off",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reminder settings",
        variant: "destructive",
      });
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.showTestNotification();
      await soundService.playSuccess();
      toast({
        title: "Test Notification Sent!",
        description: "Check if you received the notification",
      });
    } catch (error) {
      await soundService.playError();
      toast({
        title: "Test Failed",
        description: "Could not send test notification. Check permissions.",
        variant: "destructive",
      });
    }
  };

  const categories = [
    { id: 'all', label: 'All Tips', icon: BookOpen },
    { id: 'nutrition', label: 'Nutrition', icon: Heart },
    { id: 'medication', label: 'Medication', icon: Zap },
    { id: 'motivation', label: 'Motivation', icon: Trophy }
  ];

  return (
    <div className="min-h-screen text-foreground pb-20" style={{background: 'var(--bg-gradient)'}}>
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/scan">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-back-to-home"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <h1 className="text-xl font-bold">AI Coaching</h1>
            </div>
            <Trophy className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Daily Coaching Card */}
        <Card className="health-card border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Today's Coaching
              </div>
              <Button
                onClick={() => generateCoachingMutation.mutate()}
                disabled={generateCoachingMutation.isPending || coachingLoading}
                variant="outline"
                size="sm"
                data-testid="button-generate-coaching"
              >
                {generateCoachingMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coachingLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              </div>
            ) : coaching ? (
              <>
                {/* Streak Counter */}
                {coaching.streak > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                      {coaching.streak} day streak! Keep it up!
                    </span>
                  </div>
                )}

                {/* Achievement */}
                {coaching.achievement && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Star className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Achievement: {coaching.achievement}
                    </span>
                  </div>
                )}

                {/* Daily Motivation */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-sm">Daily Motivation</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {coaching.motivation}
                  </p>
                </div>

                {/* Today's Focus */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Today's Focus</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {coaching.todaysFocus}
                  </p>
                </div>

                {/* Nutrition Tip */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-sm">Nutrition Tip</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {coaching.nutritionTip}
                  </p>
                </div>

                {/* Medication Tip */}
                {coaching.medicationTip && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">Medication Insight</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {coaching.medicationTip}
                    </p>
                  </div>
                )}

                {/* Encouragement */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium text-sm">Encouragement</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {coaching.encouragement}
                  </p>
                </div>
              </>
            ) : coachingError ? (
              <div className="text-center space-y-4 py-8">
                <div className="text-6xl">🤖</div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">AI Coach Unavailable</h3>
                  <p className="text-sm text-muted-foreground">
                    Having trouble connecting to your AI coach. Try generating new content!
                  </p>
                </div>
                <Button 
                  onClick={() => generateCoachingMutation.mutate()}
                  disabled={generateCoachingMutation.isPending}
                  className="w-full"
                >
                  {generateCoachingMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Daily Coaching
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4 py-8">
                <div className="text-6xl">✨</div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Welcome to AI Coaching!</h3>
                  <p className="text-sm text-muted-foreground">
                    Get personalized daily motivation, nutrition tips, and encouragement.
                  </p>
                </div>
                <Button 
                  onClick={() => generateCoachingMutation.mutate()}
                  disabled={generateCoachingMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {generateCoachingMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Your Coaching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start Your Daily Coaching
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sound Settings */}
        <SoundSettings />

        {/* Educational Tips Section */}
        <Card className="health-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Educational Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id as any)}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                    data-testid={`filter-${category.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </Button>
                );
              })}
            </div>

            {/* Tips List */}
            {tipsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                ))}
              </div>
            ) : tips && tips.length > 0 ? (
              <div className="space-y-3">
                {tips.map((tip) => (
                  <div key={tip.id} className="p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm">{tip.title}</h3>
                      <div className="flex gap-1">
                        <Badge 
                          variant={tip.category === 'nutrition' ? 'default' : tip.category === 'medication' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {tip.category}
                        </Badge>
                        {tip.importance === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            Important
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tip.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tips available for the selected category.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card className="health-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                🌟 Daily Motivation
              </div>
              {reminderEnabled && (
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Active</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showReminderSetup ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Get daily motivation and inspiring quotes delivered at your preferred time.
                  </p>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Bell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Notification Info:</strong> For browser notifications, click "Test" and allow notifications when prompted. Don't worry - you'll still get in-app motivation even without browser permission!
                      </div>
                    </div>
                  </div>
                </div>
                {reminderEnabled ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Daily motivation at {reminderTime}
                        </span>
                      </div>
                      <Switch
                        checked={reminderEnabled}
                        onCheckedChange={toggleReminders}
                        data-testid="switch-reminders"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowReminderSetup(true)}
                        className="flex-1"
                        data-testid="button-change-time"
                      >
                        Change Time
                      </Button>
                      <Button 
                        onClick={testNotification}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-test-notification-active"
                        title="Test notification (will request permission if needed)"
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => saveReminderTime(e.target.value)}
                      className="flex-1"
                      data-testid="input-quick-time"
                    />
                    <Button 
                      onClick={setupReminders}
                      className="px-6"
                      data-testid="button-set-reminders"
                    >
                      Set
                    </Button>
                    <Button 
                      onClick={testNotification}
                      variant="outline"
                      size="sm"
                      className="px-3"
                      data-testid="button-test-notification"
                      title="Test notification (will request permission if needed)"
                    >
                      <TestTube2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder-time">Motivation Time</Label>
                  <Input
                    id="motivation-time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => saveReminderTime(e.target.value)}
                    data-testid="input-motivation-time"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-reminders"
                    checked={true}
                    data-testid="switch-enable-reminders"
                  />
                  <Label htmlFor="enable-reminders" className="text-sm">
                    Enable daily motivation
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={setupReminders}
                    className="flex-1"
                    data-testid="button-save-reminders"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowReminderSetup(false)}
                    className="flex-1"
                    data-testid="button-cancel-reminders"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DropdownNavigation />
      
      {/* Bottom Help Section */}
      <BottomHelpSection />
    </div>
  );
}

export default CoachingPage;