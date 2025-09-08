import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Star, Plus, Copy, Trash2, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DiaryEntryWithAnalysis } from "@shared/schema";

interface MealTemplate {
  id: string;
  name: string;
  description?: string;
  analysisId: string;
  analysis: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    detectedFoods: any[];
  };
  usageCount: number;
  isFavorite: boolean;
  createdAt: string;
}

interface MealTemplatesDialogProps {
  onSelectTemplate: (template: MealTemplate) => void;
}

export function MealTemplatesDialog({ onSelectTemplate }: MealTemplatesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntryWithAnalysis | null>(null);

  // Mock data - in real implementation this would come from API
  const { data: templates = [] } = useQuery<MealTemplate[]>({
    queryKey: ['/api/meal-templates'],
    queryFn: () => {
      // Mock templates for now
      return Promise.resolve([]);
    },
    enabled: false, // Disable for now since we don't have the backend yet
  });

  const { data: recentEntries } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      // Mock API call - would be: await apiRequest("POST", "/api/meal-templates", templateData);
      return Promise.resolve({ id: Date.now().toString(), ...templateData });
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Your meal template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-templates'] });
      setIsCreating(false);
      setTemplateName("");
      setTemplateDescription("");
      setSelectedEntry(null);
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create meal template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Mock API call - would be: await apiRequest("DELETE", `/api/meal-templates/${templateId}`);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Meal template has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-templates'] });
    },
  });

  const handleCreateTemplate = () => {
    if (!selectedEntry || !templateName.trim()) return;

    createTemplateMutation.mutate({
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      analysisId: selectedEntry.analysisId,
      analysis: selectedEntry.analysis,
      usageCount: 0,
      isFavorite: false,
    });
  };

  const handleUseTemplate = (template: MealTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
    toast({
      title: "Template Applied",
      description: `"${template.name}" has been added to your diary.`,
    });
  };

  const topTemplates = templates
    .sort((a, b) => (b.usageCount + (b.isFavorite ? 10 : 0)) - (a.usageCount + (a.isFavorite ? 10 : 0)))
    .slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-green-500/10 to-blue-500/10 hover:from-green-500/20 hover:to-blue-500/20 border-green-200 dark:border-green-800"
          data-testid="button-meal-templates"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Meal Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Meal Templates & Favorites
          </DialogTitle>
          <DialogDescription>
            Save your favorite meals as templates for quick logging
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreating(true)}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-purple-600"
              data-testid="button-create-template"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </div>

          {/* Create Template Form */}
          {isCreating && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Create New Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Recent Meal</Label>
                  <div className="grid gap-2 max-h-32 overflow-y-auto">
                    {recentEntries?.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          selectedEntry?.id === entry.id
                            ? 'border-primary bg-primary/10'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedEntry(entry)}
                        data-testid={`select-entry-${entry.id}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">
                              {entry.mealType === 'custom' && entry.customMealName 
                                ? entry.customMealName 
                                : entry.mealType
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.analysis?.totalCalories || 0} calories
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.mealDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g., Protein Smoothie Bowl"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    data-testid="input-template-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Add notes about this meal template..."
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    rows={2}
                    data-testid="input-template-description"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={!selectedEntry || !templateName.trim() || createTemplateMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-template"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {createTemplateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setTemplateName("");
                      setTemplateDescription("");
                      setSelectedEntry(null);
                    }}
                    data-testid="button-cancel-template"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Templates Grid */}
          <div className="space-y-4">
            <h3 className="font-medium">Your Templates</h3>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates yet</p>
                <p className="text-sm">Create templates from your favorite meals for quick logging</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {topTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.isFavorite && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{template.analysis.totalCalories} cal</span>
                            <span>{template.analysis.totalProtein}g protein</span>
                            <span>Used {template.usageCount} times</span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUseTemplate(template)}
                            data-testid={`button-use-template-${template.id}`}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            className="text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}