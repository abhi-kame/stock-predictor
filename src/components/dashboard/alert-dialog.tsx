"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStockStore } from "@/store/useStockStore";
import { Bell, TrendingUp, TrendingDown } from "lucide-react";

export function AlertDialog({ open, onOpenChange, symbol }: { open: boolean, onOpenChange: (open: boolean) => void, symbol: string }) {
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"ABOVE" | "BELOW">("ABOVE");
  const { createAlert } = useStockStore();

  const handleCreate = async () => {
    if (!targetPrice) return;
    await createAlert({
      symbol,
      targetPrice: parseFloat(targetPrice),
      direction
    });
    onOpenChange(false);
    setTargetPrice("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Bell className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-black text-center">Set Price Alert</DialogTitle>
          <DialogDescription className="text-center">
            Get notified when <span className="font-bold text-foreground">{symbol}</span> reaches your target price.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Trigger Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={direction === "ABOVE" ? "default" : "outline"} 
                className="rounded-xl h-12 gap-2"
                onClick={() => setDirection("ABOVE")}
              >
                <TrendingUp className="w-4 h-4" />
                Price Goes Above
              </Button>
              <Button 
                variant={direction === "BELOW" ? "default" : "outline"} 
                className="rounded-xl h-12 gap-2"
                onClick={() => setDirection("BELOW")}
              >
                <TrendingDown className="w-4 h-4" />
                Price Goes Below
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Target Price (₹)</label>
            <Input
              type="number"
              placeholder="0.00"
              className="h-12 rounded-xl text-lg font-bold bg-muted/30 border-transparent focus-visible:bg-background transition-colors"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20">
            Create Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
