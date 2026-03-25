"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react";

export function NewsPanel({ news, sentiment }: { news: any[], sentiment: any }) {
  if (!news) return <div className="h-[600px] w-full animate-pulse bg-muted rounded-xl" />;

  return (
    <Card className="h-full shadow-lg border-muted/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            Recent News
        </CardTitle>
        {sentiment && (
          <Badge variant={(sentiment.label === 'POSITIVE' ? 'default' : sentiment.label === 'NEGATIVE' ? 'destructive' : 'secondary') as any} className="px-3 py-1 font-bold">
            {sentiment.label} ({sentiment.score.toFixed(1)})
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px] p-6 pt-2">
          <div className="space-y-6">
            {news.map((article, i) => (
              <div key={i} className="group cursor-pointer space-y-2 border-b border-muted pb-4 last:border-0 hover:bg-accent/50 -mx-6 px-6 transition-colors">
                <div className="flex items-start justify-between gap-4 pt-4">
                  <h3 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <div className={`mt-1 flex-shrink-0 ${
                    article.sentimentLabel === 'POSITIVE' ? 'text-green-500' : 
                    article.sentimentLabel === 'NEGATIVE' ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {article.sentimentLabel === 'POSITIVE' ? <TrendingUp className="w-4 h-4" /> : 
                     article.sentimentLabel === 'NEGATIVE' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {article.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium pt-1">
                  <span>{article.source}</span>
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
