import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useStockStore } from "@/store/useStockStore";

const ranges = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "1Y", value: "1y" },
];

export function StockChart({ history }: { history: any[] }) {
  const { selectedRange, setSelectedRange } = useStockStore();

  if (!history || history.length === 0) return <div className="h-[400px] w-full animate-pulse bg-muted rounded-xl" />;

  const chartData = history.map(item => ({
    time: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    price: item.close
  }));

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));

  return (
    <Card className="shadow-lg border-muted/50 overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle className="text-xl font-bold">Market Performance</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Historical price action for the selected period</p>
        </div>
        <Tabs value={selectedRange} onValueChange={setSelectedRange} className="w-auto">
          <TabsList className="grid grid-cols-5 h-9 w-[280px]">
            {ranges.map((r) => (
              <TabsTrigger key={r.value} value={r.value} className="text-xs">
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" strokeOpacity={0.5} />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}}
                minTickGap={30}
              />
              <YAxis 
                domain={[minPrice * 0.995, maxPrice * 1.005]} 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}}
                tickFormatter={(val) => `$${val.toLocaleString()}`}
                orientation="right"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '1px solid hsl(var(--border) / 0.5)',
                  backdropFilter: 'blur(8px)'
                }}
                itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                labelStyle={{ marginBottom: '4px', fontWeight: '600' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
