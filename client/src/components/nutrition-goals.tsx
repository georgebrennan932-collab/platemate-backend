import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Target, Flame, Beef, Wheat, Droplets, Save, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { insertNutritionGoalsSchema } from "@shared/schema";
import type { NutritionGoals } from "@shared/schema";
import { z } from "zod";

const formSchema = insertNutritionGoalsSchema.omit({ userId: true });

export function NutritionGoals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: goals, isLoading } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dailyCalories: goals?.dailyCalories || 2000,
      dailyProtein: goals?.dailyProtein || 150,
      dailyCarbs: goals?.dailyCarbs || 250,
      dailyFat: goals?.dailyFat || 65,
      dailyWater: goals?.dailyWater || 2000,
    },
  });

  // Update form when goals data loads
  React.useEffect(() => {
    if (goals) {
      form.reset({
        dailyCalories: goals.dailyCalories || 2000,
        dailyProtein: goals.dailyProtein || 150,
        dailyCarbs: goals.dailyCarbs || 250,
        dailyFat: goals.dailyFat || 65,
        dailyWater: goals.dailyWater || 2000,
      });
    }
  }, [goals, form]);

  const updateGoalsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest('POST', '/api/nutrition-goals', data);
    },
    onSuccess: () => {
      toast({
        title: "Goals Updated",
        description: "Your nutrition goals have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition-goals'] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update goals. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating goals:", error);
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateGoalsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Daily Nutrition Goals</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            data-testid="button-edit-goals"
          >
            <Edit className="h-4 w-4 mr-1" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
        <CardDescription>
          Set your daily nutrition targets to track your progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dailyCalories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <Flame className="h-4 w-4" />
                        <span>Calories</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-daily-calories"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dailyProtein"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <Beef className="h-4 w-4" />
                        <span>Protein (g)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-daily-protein"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dailyCarbs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <Wheat className="h-4 w-4" />
                        <span>Carbs (g)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-daily-carbs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dailyFat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fat (g)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-daily-fat"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dailyWater"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="flex items-center space-x-1">
                        <Droplets className="h-4 w-4" />
                        <span>Water (ml)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-daily-water"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                disabled={updateGoalsMutation.isPending}
                className="w-full"
                data-testid="button-save-goals"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateGoalsMutation.isPending ? 'Saving...' : 'Save Goals'}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Flame className="h-4 w-4" />
                <span>Calories</span>
              </div>
              <div className="text-2xl font-bold" data-testid="display-daily-calories">
                {goals?.dailyCalories || 2000}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Beef className="h-4 w-4" />
                <span>Protein</span>
              </div>
              <div className="text-2xl font-bold" data-testid="display-daily-protein">
                {goals?.dailyProtein || 150}g
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Wheat className="h-4 w-4" />
                <span>Carbs</span>
              </div>
              <div className="text-2xl font-bold" data-testid="display-daily-carbs">
                {goals?.dailyCarbs || 250}g
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Fat</div>
              <div className="text-2xl font-bold" data-testid="display-daily-fat">
                {goals?.dailyFat || 65}g
              </div>
            </div>

            <div className="space-y-1 col-span-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Droplets className="h-4 w-4" />
                <span>Water</span>
              </div>
              <div className="text-2xl font-bold" data-testid="display-daily-water">
                {goals?.dailyWater || 2000}ml
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}