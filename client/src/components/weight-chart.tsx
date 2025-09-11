import { useQuery } from "@tanstack/react-query";
import { format, subWeeks, startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeightEntry } from "@shared/schema";

interface WeightChartProps {
  className?: string;
}

interface ChartDataPoint {
  week: string;
  weight: number;
  weightKg: number;
  weightLb: number;
  date: string;
  entryCount: number;
}

export function WeightChart({ className }: WeightChartProps) {
  // Fetch weight entries for the last 12 weeks
  const { data: weightEntries, isLoading, error } = useQuery<WeightEntry[]>({
    queryKey: ['/api/weights'],
    select: (data) => {
      const twelveWeeksAgo = subWeeks(new Date(), 12);
      return data.filter((entry) => {
        const entryDate = new Date(entry.loggedAt);
        return entryDate >= twelveWeeksAgo;
      });
    },
  });

  // Process data for chart
  const chartData: ChartDataPoint[] = [];
  
  if (weightEntries) {
    // Group entries by week
    const weeklyData: { [key: string]: WeightEntry[] } = {};
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i));
      const weekEnd = endOfWeek(weekStart);
      const weekKey = format(weekStart, "MMM d");
      
      weeklyData[weekKey] = weightEntries.filter((entry) => {
        const entryDate = new Date(entry.loggedAt);
        return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
      });
    }

    // Calculate average weight per week
    Object.entries(weeklyData).forEach(([week, entries]) => {
      if (entries.length > 0) {
        const totalWeight = entries.reduce((sum, entry) => sum + entry.weightGrams, 0);
        const avgWeightGrams = totalWeight / entries.length;
        
        chartData.push({
          week,
          weight: Math.round((avgWeightGrams / 1000) * 10) / 10, // Default to kg
          weightKg: Math.round((avgWeightGrams / 1000) * 10) / 10,
          weightLb: Math.round((avgWeightGrams / 453.592) * 10) / 10,
          date: typeof entries[0].loggedAt === 'string' ? entries[0].loggedAt : entries[0].loggedAt.toISOString(),
          entryCount: entries.length,
        });
      }
    });
  }

  // Calculate trend
  const getTrend = () => {
    if (chartData.length < 2) return { type: "neutral", change: 0 };
    
    const firstWeight = chartData[0].weight;
    const lastWeight = chartData[chartData.length - 1].weight;
    const change = lastWeight - firstWeight;
    
    if (Math.abs(change) < 0.5) return { type: "neutral", change };
    return { type: change > 0 ? "up" : "down", change };
  };

  const trend = getTrend();

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Week of ${label}`}</p>
          <p className="text-primary">
            Weight: <span className="font-bold">{data.weightKg}kg ({data.weightLb}lb)</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {data.entryCount} entr{data.entryCount === 1 ? 'y' : 'ies'}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>12-Week Progress</span>
          </CardTitle>
          <CardDescription>Loading weight trend...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-destructive">
            <TrendingUp className="h-5 w-5" />
            <span>12-Week Progress</span>
          </CardTitle>
          <CardDescription>Failed to load weight data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Unable to load chart data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>12-Week Progress</span>
          </CardTitle>
          <CardDescription>Track your weight over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <div className="text-6xl">📊</div>
            <p className="text-muted-foreground text-center">
              No weight data yet.<br />
              Start logging your weight to see your progress!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trend.type === "up" ? TrendingUp : trend.type === "down" ? TrendingDown : Minus;
  const trendColor = trend.type === "up" ? "text-red-500" : trend.type === "down" ? "text-green-500" : "text-gray-500";
  const trendText = trend.type === "up" ? "increased" : trend.type === "down" ? "decreased" : "stable";

  return (
    <Card className={className} data-testid="weight-chart">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>12-Week Progress</span>
          </div>
          <div className={`flex items-center space-x-1 text-sm ${trendColor}`} data-testid="weight-trend">
            <TrendIcon className="h-4 w-4" />
            <span>
              {Math.abs(trend.change).toFixed(1)}kg {trendText}
            </span>
          </div>
        </CardTitle>
        <CardDescription>
          Your weight trend over the last 12 weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64" data-testid="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
                domain={['dataMin - 2', 'dataMax + 2']}
              />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2, fill: "hsl(var(--background))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-primary" data-testid="chart-total-entries">
              {weightEntries?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Total Entries</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary" data-testid="chart-avg-weight">
              {chartData.length > 0 
                ? (chartData.reduce((sum, d) => sum + d.weight, 0) / chartData.length).toFixed(1)
                : "0"
              }kg
            </div>
            <div className="text-xs text-muted-foreground">Average Weight</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${trendColor}`} data-testid="chart-trend-change">
              {trend.change >= 0 ? "+" : ""}{trend.change.toFixed(1)}kg
            </div>
            <div className="text-xs text-muted-foreground">12-Week Change</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}