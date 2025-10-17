import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Edit2, Trash2, Calendar, Target, StickyNote, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { WeightEntry } from "@shared/schema";

interface WeightListProps {
  onEdit?: (entry: WeightEntry) => void;
  displayUnit?: "kg" | "lb";
  compact?: boolean;
}

export function WeightList({ onEdit, displayUnit = "kg", compact = false }: WeightListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewPhotoEntry, setViewPhotoEntry] = useState<WeightEntry | null>(null);

  // Fetch weight entries
  const { data: weightEntries = [], isLoading, error } = useQuery<WeightEntry[]>({
    queryKey: ['/api/weights'],
    select: (data) => data || [],
  });

  // Delete weight entry mutation
  const deleteWeightMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/weights/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Entry Deleted",
        description: "Weight entry has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/weights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/streak'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete weight entry",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    deleteWeightMutation.mutate(id);
  };

  const formatWeight = (weightGrams: number): string => {
    if (displayUnit === "kg") {
      return `${(weightGrams / 1000).toFixed(1)} kg`;
    } else {
      return `${(weightGrams / 453.592).toFixed(1)} lb`;
    }
  };

  const formatDate = (dateInput: string | Date): string => {
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateInput.toString();
    }
  };

  const formatFullDate = (dateInput: string | Date): string => {
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch {
      return dateInput.toString();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Recent Weigh-ins</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Recent Weigh-ins</h3>
        <div className="text-center text-muted-foreground py-8">
          <p>Unable to load weight entries</p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (weightEntries.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Recent Weigh-ins</h3>
        <div className="text-center text-muted-foreground py-8">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No weight entries yet</p>
          <p className="text-sm">Log your first weigh-in above to track your progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Recent Weigh-ins</h3>
        <div className="text-sm text-muted-foreground">
          {weightEntries.length} {weightEntries.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      <div className="space-y-3" data-testid="weight-entries-list">
        {weightEntries.map((entry, index) => (
          <Card key={entry.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span 
                        className="font-medium"
                        data-testid={`weight-entry-date-${entry.id}`}
                        title={formatFullDate(entry.loggedAt)}
                      >
                        {formatDate(entry.loggedAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      <span 
                        className="text-lg font-bold text-purple-600"
                        data-testid={`weight-entry-weight-${entry.id}`}
                      >
                        {formatWeight(entry.weightGrams)}
                      </span>
                    </div>
                  </div>
                  
                  {entry.imageUrl && (
                    <div className="mb-2">
                      <button
                        onClick={() => setViewPhotoEntry(entry)}
                        className="relative group rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                        data-testid={`button-view-photo-${entry.id}`}
                        title="Click to view full-size photo"
                      >
                        <img 
                          src={entry.imageUrl} 
                          alt="Progress photo"
                          className="w-24 h-24 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    </div>
                  )}
                  
                  {entry.notes && (
                    <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                      <StickyNote className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span 
                        data-testid={`weight-entry-notes-${entry.id}`}
                        className="line-clamp-2"
                      >
                        {entry.notes}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(entry)}
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                    data-testid={`button-edit-weight-${entry.id}`}
                    title="Edit entry"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog open={deleteId === entry.id} onOpenChange={(open) => setDeleteId(open ? entry.id : null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        data-testid={`button-delete-weight-${entry.id}`}
                        title="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-testid="dialog-delete-weight">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Weight Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this weight entry from {formatFullDate(entry.loggedAt)}? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteWeightMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                          data-testid="button-confirm-delete"
                        >
                          {deleteWeightMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full-screen photo viewer dialog */}
      <Dialog open={!!viewPhotoEntry} onOpenChange={(open) => !open && setViewPhotoEntry(null)}>
        <DialogContent className="max-w-4xl p-6" data-testid="dialog-view-photo">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Progress Photo - {viewPhotoEntry && formatFullDate(viewPhotoEntry.loggedAt)}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {viewPhotoEntry?.imageUrl && (
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img 
                  src={viewPhotoEntry.imageUrl} 
                  alt="Progress photo full size"
                  className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                  data-testid="img-progress-photo"
                />
              </div>
            )}
            {viewPhotoEntry && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-lg font-bold text-purple-600">
                    {formatWeight(viewPhotoEntry.weightGrams)}
                  </span>
                </div>
                {viewPhotoEntry.notes && (
                  <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                    <StickyNote className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <p>{viewPhotoEntry.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}