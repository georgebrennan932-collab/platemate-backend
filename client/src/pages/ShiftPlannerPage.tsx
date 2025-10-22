import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Calendar, Clock, Loader2, Sparkles, ChevronLeft, ChevronRight, Trash2, Utensils, ShoppingCart, Truck, Home, Package, LogIn, Plus } from "lucide-react";
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
  { value: "day_off", label: "Day Off", icon: "☀️" },
  { value: "regular", label: "Day Shift (9am-5pm)", icon: "🌅" },
  { value: "night_shift", label: "Night Shift (10pm-6am)", icon: "🌙" },
  { value: "long_shift", label: "Long Shift (12+ hours)", icon: "⏰" },
  { value: "early_shift", label: "Early Shift (6am start)", icon: "🌄" },
  { value: "late_shift", label: "Late Shift (2pm-10pm)", icon: "🌆" },
  { value: "custom", label: "Custom Shift", icon: "⚙️" }
];

export default function ShiftPlannerPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday
  const [selectedShifts, setSelectedShifts] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Calculate date range for the week
  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // Fetch existing shift schedules (skip if not authenticated)
  const { data: schedules, isLoading } = useQuery<ShiftSchedule[]>({
    queryKey: ["/api/shift-schedules", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/shift-schedules?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch schedules");
      return response.json();
    },
    enabled: isAuthenticated
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
      return apiRequest("POST", "/api/shift-schedules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-schedules"] });
    }
  });

  // Delete shift schedule mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (date: string) => {
      return apiRequest("DELETE", `/api/shift-schedules/${date}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-schedules"] });
    }
  });

  // Generate meal plan mutation
  const generateMealPlanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/shift-schedules/generate-meal-plan", {
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

  // Add to shopping list mutation
  const addToShoppingListMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/shift-schedules/add-to-shopping-list", {
        startDate,
        endDate
      });
    },
    onSuccess: (response: any) => {
      toast({
        title: "Added to Shopping List! 🛒",
        description: `${response.addedCount} new items added, ${response.updatedCount} items updated`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add to Shopping List",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleShiftChange = (date: string, shiftType: string) => {
    console.log("🔄 Shift changed:", date, shiftType);
    setSelectedShifts(prev => ({
      ...prev,
      [date]: shiftType
    }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    console.log("💾 Save All clicked! Selected shifts:", selectedShifts);
    try {
      // Save all shifts (including day_off)
      const promises = Object.entries(selectedShifts).map(([date, shiftType]) => {
        console.log(`📅 Processing shift for ${date}: ${shiftType}`);
        console.log(`✅ Saving shift for ${date}`);
        return saveShiftMutation.mutateAsync({ shiftDate: date, shiftType });
      });

      console.log(`📤 Sending ${promises.length} requests...`);
      await Promise.all(promises);
      
      toast({
        title: "Shifts Saved!",
        description: "Your shift schedule has been updated.",
      });
      setHasChanges(false);
    } catch (error) {
      console.error("❌ Save error:", error);
      toast({
        title: "Failed to Save",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleGenerateMealPlan = () => {
    const scheduledShifts = Object.entries(selectedShifts).filter(
      ([_, shiftType]) => shiftType !== "day_off"
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
    type => type !== "day_off"
  ).length;

  const getShiftTypeInfo = (type: string) => {
    return SHIFT_TYPES.find(st => st.value === type) || SHIFT_TYPES[0];
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'var(--bg-gradient)'}}>
        <div className="text-white text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'var(--bg-gradient)'}}>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">Login Required</CardTitle>
            <CardDescription className="text-base">
              The Weekly Shift Planner helps you schedule your shifts and get personalized meal plans. Please log in to access this feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">What you can do:</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Schedule your shifts for the week ahead</span>
                </li>
                <li className="flex items-start gap-2">
                  <Utensils className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Get AI-generated meal plans optimized for your work schedule</span>
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Receive portable meal suggestions for on-the-go shifts</span>
                </li>
              </ul>
            </div>
            <Link href="/">
              <Button className="w-full" size="lg" data-testid="button-go-to-login">
                <LogIn className="mr-2 h-5 w-5" />
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="space-y-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2" data-testid="button-back-home">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Weekly Shift Planner
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Plan your shifts and get AI-powered meal recommendations
            </p>
          </div>
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
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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

        {/* Weekly Shopping List Section */}
        {schedules && schedules.some(s => s.mealPlanGenerated === 1 && s.mealPlanData && (s.mealPlanData as any).shoppingList) && (
          <Card className="border-2 border-green-500">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-green-600" />
                Weekly Shopping List
              </CardTitle>
              <CardDescription>
                Ingredients for your entire week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // Find first schedule with shopping list
                const scheduleWithList = schedules.find(
                  s => s.mealPlanData && (s.mealPlanData as any).shoppingList
                );
                const shoppingList = scheduleWithList ? (scheduleWithList.mealPlanData as any).shoppingList : [];
                
                // Group by category
                const groupedItems = shoppingList.reduce((acc: any, item: any) => {
                  const category = item.category || 'Other';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(item);
                  return acc;
                }, {});

                return (
                  <div className="space-y-4">
                    {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-semibold text-sm text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {items.map((item: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                              data-testid={`shopping-item-${category}-${index}`}
                            >
                              <span className="text-sm" data-testid={`text-ingredient-${category}-${index}`}>
                                {item.ingredient}
                              </span>
                              <span 
                                className="text-xs text-gray-600 dark:text-gray-400 font-medium"
                                data-testid={`text-quantity-${category}-${index}`}
                              >
                                {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={() => addToShoppingListMutation.mutate()}
                        disabled={addToShoppingListMutation.isPending}
                        className="flex-1 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        data-testid="button-add-to-shopping-list"
                      >
                        {addToShoppingListMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add to My Shopping List
                          </>
                        )}
                      </Button>
                      <Link href="/recipes?view=shopping-list">
                        <Button 
                          className="flex-1 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg" 
                          data-testid="button-view-shopping-list"
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          View Shopping List
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Meal Plans Section */}
        {schedules && schedules.some(s => s.mealPlanGenerated === 1) && (
          <Card className="border-2 border-green-500">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-green-600" />
                Your AI-Generated Meal Plans
              </CardTitle>
              <CardDescription>
                Personalized meals optimized for your shift schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {schedules
                  .filter(schedule => schedule.mealPlanGenerated === 1 && schedule.mealPlanData)
                  .map((schedule) => {
                    const mealPlan = schedule.mealPlanData as any;
                    const shiftInfo = getShiftTypeInfo(schedule.shiftType);
                    
                    return (
                      <AccordionItem 
                        key={schedule.id} 
                        value={schedule.shiftDate}
                        className="border rounded-lg px-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-green-900"
                      >
                        <AccordionTrigger 
                          className="hover:no-underline"
                          data-testid={`accordion-meal-plan-${schedule.shiftDate}`}
                        >
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{shiftInfo.icon}</span>
                              <div className="text-left">
                                <div className="font-semibold" data-testid={`text-meal-plan-date-${schedule.shiftDate}`}>
                                  {format(parseISO(schedule.shiftDate), "EEEE, MMMM d")}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  {shiftInfo.label}
                                </div>
                              </div>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className="bg-green-600 text-white"
                              data-testid={`badge-meal-count-${schedule.shiftDate}`}
                            >
                              {mealPlan.meals?.length || 0} Meals
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-4">
                            {/* Daily Summary */}
                            {mealPlan.dailySummary && (
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg" data-testid={`text-daily-summary-${schedule.shiftDate}`}>
                                <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  Daily Strategy
                                </h4>
                                <p className="text-sm">{mealPlan.dailySummary}</p>
                              </div>
                            )}

                            {/* Calorie Distribution */}
                            {mealPlan.calorieDistribution && (
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg" data-testid={`calorie-distribution-${schedule.shiftDate}`}>
                                <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-300 mb-3">
                                  Energy Distribution
                                </h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                  <div>
                                    <div className="text-2xl font-bold text-blue-600" data-testid={`text-preshift-calories-${schedule.shiftDate}`}>
                                      {mealPlan.calorieDistribution.preShift}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300">Pre-Shift</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-purple-600" data-testid={`text-duringshift-calories-${schedule.shiftDate}`}>
                                      {mealPlan.calorieDistribution.duringShift}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300">During Shift</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-pink-600" data-testid={`text-postshift-calories-${schedule.shiftDate}`}>
                                      {mealPlan.calorieDistribution.postShift}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300">Post-Shift</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Meals */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-300">
                                Meal Plan
                              </h4>
                              {mealPlan.meals?.map((meal: any, index: number) => (
                                <div 
                                  key={index}
                                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                                  data-testid={`meal-card-${schedule.shiftDate}-${index}`}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs"
                                          data-testid={`badge-meal-type-${schedule.shiftDate}-${index}`}
                                        >
                                          {meal.mealType}
                                        </Badge>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${
                                            meal.portability === 'portable' 
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                              : meal.portability === 'meal-prep-friendly'
                                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                          }`}
                                          data-testid={`badge-portability-${schedule.shiftDate}-${index}`}
                                        >
                                          {meal.portability === 'portable' && <Truck className="h-3 w-3 mr-1" />}
                                          {meal.portability === 'meal-prep-friendly' && <Package className="h-3 w-3 mr-1" />}
                                          {meal.portability === 'home-only' && <Home className="h-3 w-3 mr-1" />}
                                          {meal.portability}
                                        </Badge>
                                      </div>
                                      <h5 className="font-bold text-lg" data-testid={`text-meal-name-${schedule.shiftDate}-${index}`}>{meal.name}</h5>
                                      <p 
                                        className="text-sm text-gray-600 dark:text-gray-300 mt-1"
                                        data-testid={`text-meal-description-${schedule.shiftDate}-${index}`}
                                      >
                                        {meal.description}
                                      </p>
                                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span 
                                          className="flex items-center gap-1"
                                          data-testid={`text-meal-timing-${schedule.shiftDate}-${index}`}
                                        >
                                          <Clock className="h-3 w-3" />
                                          {meal.timing}
                                        </span>
                                        <span 
                                          className="flex items-center gap-1"
                                          data-testid={`text-meal-preptime-${schedule.shiftDate}-${index}`}
                                        >
                                          <Utensils className="h-3 w-3" />
                                          {meal.prepTime}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Nutrition Info */}
                                  <div className="grid grid-cols-4 gap-2 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded" data-testid={`nutrition-info-${schedule.shiftDate}-${index}`}>
                                    <div className="text-center">
                                      <div className="text-sm font-bold" data-testid={`text-calories-${schedule.shiftDate}-${index}`}>{meal.calories}</div>
                                      <div className="text-xs text-gray-600 dark:text-gray-300">cal</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-sm font-bold text-red-600" data-testid={`text-protein-${schedule.shiftDate}-${index}`}>{meal.protein}g</div>
                                      <div className="text-xs text-gray-600 dark:text-gray-300">protein</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-sm font-bold text-blue-600" data-testid={`text-carbs-${schedule.shiftDate}-${index}`}>{meal.carbs}g</div>
                                      <div className="text-xs text-gray-600 dark:text-gray-300">carbs</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-sm font-bold text-yellow-600" data-testid={`text-fat-${schedule.shiftDate}-${index}`}>{meal.fat}g</div>
                                      <div className="text-xs text-gray-600 dark:text-gray-300">fat</div>
                                    </div>
                                  </div>

                                  {/* Benefits */}
                                  {meal.benefits && (
                                    <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                                      <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                                        Why This Meal?
                                      </div>
                                      <p 
                                        className="text-xs text-gray-700 dark:text-gray-300"
                                        data-testid={`text-meal-benefits-${schedule.shiftDate}-${index}`}
                                      >
                                        {meal.benefits}
                                      </p>
                                    </div>
                                  )}

                                  {/* Ingredients */}
                                  {meal.ingredients && meal.ingredients.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                        Ingredients:
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {meal.ingredients.map((ingredient: string, i: number) => (
                                          <Badge 
                                            key={i} 
                                            variant="secondary" 
                                            className="text-xs"
                                            data-testid={`badge-ingredient-${schedule.shiftDate}-${index}-${i}`}
                                          >
                                            {ingredient}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Tips */}
                                  {meal.tips && meal.tips.length > 0 && (
                                    <div className="border-t pt-3 mt-3">
                                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                        Shift-Specific Tips:
                                      </div>
                                      <ul className="space-y-1">
                                        {meal.tips.map((tip: string, i: number) => (
                                          <li 
                                            key={i} 
                                            className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2"
                                            data-testid={`text-meal-tip-${schedule.shiftDate}-${index}-${i}`}
                                          >
                                            <Sparkles className="h-3 w-3 text-purple-600 mt-0.5 flex-shrink-0" />
                                            <span>{tip}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
              </Accordion>
            </CardContent>
          </Card>
        )}

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
