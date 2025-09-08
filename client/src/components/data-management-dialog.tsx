import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Upload, Trash2, Archive, FileText, Database, Calendar, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import type { DiaryEntryWithAnalysis, DrinkEntry } from "@shared/schema";

export function DataManagementDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "pdf">("csv");
  const [exportRange, setExportRange] = useState<"week" | "month" | "year" | "all">("month");
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  const { data: diaryEntries = [] } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
  });

  const { data: drinkEntries = [] } = useQuery<DrinkEntry[]>({
    queryKey: ['/api/drinks'],
  });

  const exportMutation = useMutation({
    mutationFn: async ({ format, range }: { format: string; range: string }) => {
      // Mock export functionality - in real app this would call API
      const data = {
        diary: diaryEntries,
        drinks: drinkEntries,
        exportDate: new Date().toISOString(),
        range,
        format,
      };
      
      const fileName = `platemate-export-${format}-${Date.now()}`;
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const csvContent = convertToCSV(diaryEntries);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Your data has been downloaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (entryIds: string[]) => {
      // Mock bulk delete - in real app would call API for each entry
      return Promise.all(
        entryIds.map(id => 
          new Promise(resolve => setTimeout(() => resolve(true), 100))
        )
      );
    },
    onSuccess: () => {
      toast({
        title: "Entries Deleted",
        description: `${selectedEntries.length} entries have been removed.`,
      });
      setSelectedEntries([]);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete entries. Please try again.",
        variant: "destructive",
      });
    },
  });

  const convertToCSV = (data: DiaryEntryWithAnalysis[]) => {
    const headers = [
      'Date',
      'Meal Type',
      'Custom Name',
      'Calories',
      'Protein (g)',
      'Carbs (g)',
      'Fat (g)',
      'Detected Foods',
      'Notes',
      'Confidence'
    ];

    const rows = data.map(entry => [
      format(new Date(entry.mealDate), 'yyyy-MM-dd HH:mm'),
      entry.mealType,
      entry.customMealName || '',
      entry.analysis?.totalCalories || 0,
      entry.analysis?.totalProtein || 0,
      entry.analysis?.totalCarbs || 0,
      entry.analysis?.totalFat || 0,
      entry.analysis?.detectedFoods?.map(f => f.name).join('; ') || '',
      entry.notes || '',
      entry.analysis?.confidence || 0,
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  const getFilteredEntries = () => {
    const now = new Date();
    let startDate: Date;

    switch (exportRange) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      default:
        return diaryEntries;
    }

    return diaryEntries.filter(entry => new Date(entry.mealDate) >= startDate);
  };

  const handleExport = () => {
    exportMutation.mutate({ format: exportFormat, range: exportRange });
  };

  const handleBulkDelete = () => {
    if (selectedEntries.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedEntries.length} entries? This action cannot be undone.`
    );
    
    if (confirmed) {
      bulkDeleteMutation.mutate(selectedEntries);
    }
  };

  const handleEntrySelection = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, entryId]);
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  const filteredEntries = getFilteredEntries();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-purple-200 dark:border-purple-800"
          data-testid="button-data-management"
        >
          <Database className="h-4 w-4 mr-2" />
          Manage Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </DialogTitle>
          <DialogDescription>
            Export your data, manage entries, and clean up your diary
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5" />
                Export Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                    <SelectTrigger data-testid="select-export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">📊 CSV Spreadsheet</SelectItem>
                      <SelectItem value="json">💻 JSON Data</SelectItem>
                      <SelectItem value="pdf" disabled>📄 PDF Report (Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <Select value={exportRange} onValueChange={(value: any) => setExportRange(value)}>
                    <SelectTrigger data-testid="select-export-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">📅 Last Week</SelectItem>
                      <SelectItem value="month">📅 Last Month</SelectItem>
                      <SelectItem value="year">📅 Last Year</SelectItem>
                      <SelectItem value="all">📅 All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded text-sm">
                <p><strong>Export Preview:</strong></p>
                <p>• {filteredEntries.length} diary entries</p>
                <p>• {drinkEntries.length} drink entries</p>
                <p>• Format: {exportFormat.toUpperCase()}</p>
              </div>

              <Button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                data-testid="button-export-data"
              >
                <Download className="h-4 w-4 mr-2" />
                {exportMutation.isPending ? "Exporting..." : "Export Data"}
              </Button>
            </CardContent>
          </Card>

          {/* Bulk Operations Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Bulk Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-3">
                Select entries to perform bulk operations
              </div>

              {/* Entry Selection */}
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-2">
                {diaryEntries.slice(0, 20).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded"
                  >
                    <Checkbox
                      checked={selectedEntries.includes(entry.id)}
                      onCheckedChange={(checked) => 
                        handleEntrySelection(entry.id, checked as boolean)
                      }
                      data-testid={`checkbox-entry-${entry.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {entry.mealType === 'custom' && entry.customMealName 
                            ? entry.customMealName 
                            : entry.mealType
                          }
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.analysis?.totalCalories || 0} cal
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.mealDate), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allIds = diaryEntries.slice(0, 20).map(e => e.id);
                    setSelectedEntries(
                      selectedEntries.length === allIds.length ? [] : allIds
                    );
                  }}
                  data-testid="button-select-all"
                >
                  {selectedEntries.length === diaryEntries.slice(0, 20).length ? "Deselect All" : "Select All"}
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={selectedEntries.length === 0 || bulkDeleteMutation.isPending}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete {selectedEntries.length > 0 ? `(${selectedEntries.length})` : ''}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats & Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Data Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Meals:</span>
                    <span className="font-medium">{diaryEntries.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Drinks:</span>
                    <span className="font-medium">{drinkEntries.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>This Month:</span>
                    <span className="font-medium">
                      {diaryEntries.filter(e => 
                        new Date(e.mealDate) >= subDays(new Date(), 30)
                      ).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Week:</span>
                    <span className="font-medium">
                      {diaryEntries.filter(e => 
                        new Date(e.mealDate) >= subDays(new Date(), 7)
                      ).length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}