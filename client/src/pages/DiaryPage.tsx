import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Utensils, Calendar, Clock, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { DiaryEntry } from "@shared/schema";

export function DiaryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: diaryEntries, isLoading } = useQuery<DiaryEntry[]>({
    queryKey: ['/api/diary'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await apiRequest('DELETE', `/api/diary/${entryId}`);
    },
    onSuccess: () => {
      toast({
        title: "Entry Deleted",
        description: "Meal has been removed from your diary.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting diary entry:", error);
    },
  });

  const groupedEntries = diaryEntries?.reduce((groups, entry) => {
    const date = new Date(entry.mealDate).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, DiaryEntry[]>) || {};

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="space-y-3">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-back-to-home"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <h1 className="text-xl font-bold">Food Diary</h1>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Utensils className="h-4 w-4" />
              <span className="text-sm">{diaryEntries?.length || 0} meals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No meals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start scanning food to build your nutrition diary
            </p>
            <Link href="/">
              <button 
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                data-testid="button-start-scanning"
              >
                Start Scanning
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(date), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="space-y-2">
                  {groupedEntries[date].map((entry) => (
                    <div key={entry.id} className="bg-card border rounded-lg p-4" data-testid={`diary-entry-${entry.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)}
                            </span>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(entry.mealDate), 'h:mm a')}
                            </div>
                          </div>
                          
                          {entry.analysis && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium">
                                {entry.analysis.totalCalories} calories
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                <div>Protein: {entry.analysis.totalProtein}g</div>
                                <div>Carbs: {entry.analysis.totalCarbs}g</div>
                                <div>Fat: {entry.analysis.totalFat}g</div>
                              </div>
                              {entry.analysis.detectedFoods && entry.analysis.detectedFoods.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {entry.analysis.detectedFoods.map((food, index) => (
                                    <span 
                                      key={index}
                                      className="inline-block px-2 py-1 bg-muted rounded text-xs"
                                    >
                                      {food.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                          data-testid={`button-delete-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}