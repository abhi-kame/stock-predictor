"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { AIRecommendations } from "@/components/dashboard/ai-recommendations";

export default function ScreenerPage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      <Sidebar />
      <main className="flex-1 overflow-y-auto outline-none scrollbar-hide py-12">
        <div className="max-w-[1200px] mx-auto w-full px-6">
          <div className="mb-8">
            <h1 className="text-4xl font-black tracking-tighter">Market Screener</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Live AI analysis scanning the Top 50 Nifty index stocks to identify breakout and breakdown opportunities.
            </p>
          </div>
          
          <AIRecommendations />
        </div>
      </main>
    </div>
  );
}
