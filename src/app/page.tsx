"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, ShieldCheck, Zap, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-muted/40 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tighter">StockAI</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/dashboard">
            Dashboard
          </Link>
          <Link href="/auth/sign-in">
            <Button variant="outline" size="sm" className="rounded-full px-6">
              Sign In
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 lg:py-48 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary animate-fade-in">
                <Zap className="mr-1 h-3 w-3 fill-primary" />
                <span>Next-Gen Stock Intelligence</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl leading-[1.1]">
                Predict the Market with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">AI-Powered</span> Precision
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-2xl/relaxed">
                Harness the power of LSTM neural networks and sentiment analysis to gain an edge in the stock market. Real-time data, insights, and predictions at your fingertips.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/sign-in">
                  <Button size="lg" className="rounded-full px-8 text-lg font-semibold h-14 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 group">
                    Start Predicting
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                  <Button size="lg" variant="outline" className="rounded-full px-8 text-lg font-semibold h-14 border-muted-foreground/20 hover:bg-muted/50 transition-all">
                    Star on GitHub
                  </Button>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute bottom-[-100px] left-1/2 translate-x-1/2 w-[600px] h-[300px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-24 bg-muted/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-3xl bg-card border border-muted/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-2">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold">Deep Learning</h3>
                <p className="text-muted-foreground">
                  Our LSTM models analyze years of historical data to uncover hidden patterns and trends.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-3xl bg-card border border-muted/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500 mb-2">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold">Sentiment Pulse</h3>
                <p className="text-muted-foreground">
                  Real-time news processing provides immediate sentiment scores for any stock symbol.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-3xl bg-card border border-muted/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 rounded-2xl bg-green-500/10 text-green-500 mb-2">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold">Watchlist & Alerts</h3>
                <p className="text-muted-foreground">
                  Never miss a move with persistent watchlists and custom price alerts delivered to you.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-muted/40 py-12 bg-background">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-bold">StockAI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 StockAI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link className="text-sm text-muted-foreground hover:text-primary" href="#">
              Privacy
            </Link>
            <Link className="text-sm text-muted-foreground hover:text-primary" href="#">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
