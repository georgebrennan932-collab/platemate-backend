import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Loader2, Sparkles, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";

interface ShiftSchedule {
  id: string;
  userId: string;
  shiftDate: string;
  shiftType: string;
  customShiftStart: string | null;
  customShiftEnd: string | null;
  breakWindows: string[] | null;
  mealPlanGenerated: number | null;
  mealPlanData: any;
}

const SHIFT_TYPES = [
  { value: "none", label: "Day Off", icon: "☀️" },
  { value: "day_shift", label: "Day Shift (9am-5pm)", icon: "🌅" },
  { value: "night_shift", label: "Night Shift (10pm-6am)", icon: "🌙" },
  { value: "long_shift", label: "Long Shift (12+ hours)", icon: "⏰" },
  { value: "early_shift", label: "Early Shift (6am start)", icon: "🌄" },
  { value: "late_shift", label: "Late Shift (2pm-10pm)", icon: "🌆" },
  { value: "custom", label: "Custom Shift", icon: "⚙️" }
];

export default function ShiftPlannerPage() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday
  const [selectedShifts, setSelectedShifts] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Calculate date range for the week
  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // Fetch existing shift schedules
  const { data: schedules, isLoading } = useQuery<ShiftSchedule[]>({
    queryKey: ["/api/shift-schedules", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/shift-schedules?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error("Failed to fetch schedules");
      return response.json();
    }
  });

  // Initialize selectedShifts from fetched schedules
  useEffect(() => {
    if (schedules) {
      const shiftsMap: Record<string, string> = {};
      schedules.forEach(schedule => {
        shiftsMap[schedule.shiftDate] = schedule.shiftType;
      });
      setSelectedShifts(shiftsMap);
      setHasChanges(false);
    }
  }, [schedules]);

  // Save shift schedule mutation
  const saveShiftMutation = useMutation({
    mutationFn: async (data: { shiftDate: string; shiftType: string }) => {
      return apiRequest("/api/shift-schedules", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-schedules"] });
    }
  });

  // Delete shift schedule mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (date: string) => {
      return apiRequest(`/api/shift-schedules/${date}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-schedules"] });
    }
  });

  // Generate meal plan mutation
  const generateMealPlanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/shift-schedules/generate-meal-plan", "POST", {
        startDate,
        endDate
      });
    },
    onSuccess: () => {
      toast({
        title: "Meal Plan Generated! 🎉",
        description: "Your personalized weekly meal plan is ready based on your shift schedule.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-schedules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate Meal Plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleShiftChange = (date: string, shiftType: string) => {
    setSelectedShifts(prev => ({
      ...prev,
      [date]: shiftType
    }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      // Save all shifts
      const promises = Object.entries(selectedShifts).map(([date, shiftType]) => {
        if (shiftType === "none") {
          // Delete the shift if it's marked as "none"
          return deleteShiftMutation.mutateAsync(date);
        }
        return saveShiftMutation.mutateAsync({ shiftDate: date, shiftType });
      });

      await Promise.all(promises);
      
      toast({
        title: "Shifts Saved!",
        description: "Your shift schedule has been updated.",
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Failed to Save",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleGenerateMealPlan = () => {
    const scheduledShifts = Object.entries(selectedShifts).filter(
      ([_, shiftType]) => shiftType !== "none"
    );

    if (scheduledShifts.length === 0) {
      toast({
        title: "No Shifts Scheduled",
        description: "Please schedule at least one shift before generating a meal plan.",
        variant: "destructive",
      });
      return;
    }

    if (hasChanges) {
      toast({
        title: "Unsaved Changes",
        description: "Please save your shifts before generating a meal plan.",
        variant: "destructive",
      });
      return;
    }

    generateMealPlanMutation.mutate();
  };

  const nextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const previousWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const thisWeek = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Generate days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    return {
      date,
      dateStr,
      dayName: format(date, "EEE"),
      dayNumber: format(date, "d"),
      shiftType: selectedShifts[dateStr] || "none",
      hasMealPlan: schedules?.find(s => s.shiftDate === dateStr && s.mealPlanGenerated === 1)
    };
  });

  const scheduledShiftsCount = Object.values(selectedShifts).filter(
    type => type !== "none"
  ).length;

  const getShiftTypeInfo = (type: string) => {
    return SHIFT_TYPES.find(st => st.value === type) || SHIFT_TYPES[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Weekly Shift Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Plan your shifts and get AI-powered meal recommendations
          </p>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={previousWeek}
                data-testid="button-previous-week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <div className="font-semibold text-lg">
                  {format(weekStart, "MMM d")} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={thisWeek}
                  className="text-sm text-purple-600"
                  data-testid="button-this-week"
                >
                  Jump to This Week
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={nextWeek}
                data-testid="button-next-week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shift Schedule Grid */}
        <div className="grid gap-4">
          {weekDays.map((day) => {
            const shiftInfo = getShiftTypeInfo(day.shiftType);
            const isToday = isSameDay(day.date, new Date());

            return (
              <Card key={day.dateStr} className={isToday ? "border-purple-500 border-2" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-center ${isToday ? "text-purple-600 font-bold" : ""}`}>
                        <div className="text-sm font-medium">{day.dayName}</div>
                        <div className="text-2xl">{day.dayNumber}</div>
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {format(day.date, "MMMM d, yyyy")}
                        </CardTitle>
                        {isToday && (
                          <CardDescription className="text-purple-600 font-medium">
                            Today
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {day.hasMealPlan && (
                      <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
                        <Sparkles className="h-4 w-4" />
                        Meal Plan Ready
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Select
                    value={day.shiftType}
                    onValueChange={(value) => handleShiftChange(day.dateStr, value)}
                  >
                    <SelectTrigger className="w-full" data-testid={`select-shift-${day.dateStr}`}>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{shiftInfo.icon}</span>
                          <span>{shiftInfo.label}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SHIFT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{type.icon}</span>
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-purple-900">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                {scheduledShiftsCount} shift{scheduledShiftsCount !== 1 ? "s" : ""} scheduled this week
              </span>
              {hasChanges && (
                <span className="text-orange-600 font-medium">Unsaved changes</span>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveAll}
                disabled={!hasChanges || saveShiftMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                data-testid="button-save-shifts"
              >
                {saveShiftMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Save Shifts
                  </>
                )}
              </Button>

              <Button
                onClick={handleGenerateMealPlan}
                disabled={
                  hasChanges ||
                  scheduledShiftsCount === 0 ||
                  generateMealPlanMutation.isPending
                }
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="button-generate-meal-plan"
              >
                {generateMealPlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Meal Plan
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Save your shifts first, then generate a personalized meal plan optimized for your work schedule
            </p>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-purple-600">1.</span>
              <p>Select your shift type for each day of the week</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-purple-600">2.</span>
              <p>Save your shift schedule</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-purple-600">3.</span>
              <p>Generate an AI-powered meal plan tailored to your shifts</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-purple-600">4.</span>
              <p>Get optimized meal timing, portable food suggestions, and energy management tips</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
