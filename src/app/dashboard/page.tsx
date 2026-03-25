"use client";

import { useEffect, useState } from "react";
import { useStockStore } from "@/store/useStockStore";
import { Sidebar } from "@/components/dashboard/sidebar";
import { StockHeader } from "@/components/dashboard/stock-header";
import { StockChart } from "@/components/dashboard/stock-chart";
import { NewsPanel } from "@/components/dashboard/news-panel";
import { PredictionChart } from "@/components/dashboard/prediction-chart";
import { AIInsights } from "@/components/dashboard/ai-insights";
import axios from "axios";

export default function Dashboard() {
  const { selectedSymbol, selectedRange, setLoading } = useStockStore();
  const [data, setData] = useState<any>(null);
  const [newsData, setNewsData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [stockRes, newsRes] = await Promise.all([
          axios.get(`/api/stocks/${selectedSymbol}?range=${selectedRange}`),
          axios.get(`/api/news/${selectedSymbol}`),
        ]);
        setData(stockRes.data);
        setNewsData(newsRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSymbol, selectedRange, setLoading]);

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto outline-none scrollbar-hide">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
          <StockHeader quote={data?.quote} />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <StockChart history={data?.history} />
              <PredictionChart symbol={selectedSymbol} history={data?.history} />
            </div>
            <div className="xl:col-span-1 space-y-6">
              <AIInsights symbol={selectedSymbol} sentiment={newsData?.sentiment} quote={data?.quote} />
              <NewsPanel news={newsData?.news} sentiment={newsData?.sentiment} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
