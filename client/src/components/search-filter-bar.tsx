import { useState } from "react";
import { Search, Filter, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  mealTypeFilter: string;
  onMealTypeChange: (type: string) => void;
  dateRange: { start?: Date; end?: Date };
  onDateRangeChange: (range: { start?: Date; end?: Date }) => void;
  calorieRange: { min?: number; max?: number };
  onCalorieRangeChange: (range: { min?: number; max?: number }) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  mealTypeFilter,
  onMealTypeChange,
  dateRange,
  onDateRangeChange,
  calorieRange,
  onCalorieRangeChange,
  onClearFilters,
  hasActiveFilters,
}: SearchFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="space-y-3 p-4 bg-card border rounded-lg">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your meals..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={hasActiveFilters ? "border-primary bg-primary/10" : ""}
              data-testid="button-filters"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Filters</h4>
              </div>
              
              {/* Meal Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Meal Type</label>
                <Select value={mealTypeFilter} onValueChange={onMealTypeChange}>
                  <SelectTrigger data-testid="select-meal-type-filter">
                    <SelectValue placeholder="All meals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All meals</SelectItem>
                    <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                    <SelectItem value="lunch">🌞 Lunch</SelectItem>
                    <SelectItem value="dinner">🌜 Dinner</SelectItem>
                    <SelectItem value="snack">🍎 Snack</SelectItem>
                    <SelectItem value="custom">✨ Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
                    onChange={(e) => onDateRangeChange({
                      ...dateRange,
                      start: e.target.value ? new Date(e.target.value) : undefined
                    })}
                    data-testid="input-date-start"
                  />
                  <Input
                    type="date"
                    value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
                    onChange={(e) => onDateRangeChange({
                      ...dateRange,
                      end: e.target.value ? new Date(e.target.value) : undefined
                    })}
                    data-testid="input-date-end"
                  />
                </div>
              </div>

              {/* Calorie Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Calorie Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={calorieRange.min || ''}
                    onChange={(e) => onCalorieRangeChange({
                      ...calorieRange,
                      min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    data-testid="input-calorie-min"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={calorieRange.max || ''}
                    onChange={(e) => onCalorieRangeChange({
                      ...calorieRange,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    data-testid="input-calorie-max"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilters}
                  disabled={!hasActiveFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setFilterOpen(false)}
                  data-testid="button-apply-filters"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground"
            data-testid="button-clear-all-filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}