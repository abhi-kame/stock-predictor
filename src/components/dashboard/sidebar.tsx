import { useStockStore } from "@/store/useStockStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, TrendingUp, Star, LayoutDashboard, LogOut, User, Menu, X, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";

export function Sidebar() {
  const { selectedSymbol, setSelectedSymbol, watchlist, fetchWatchlist } = useStockStore();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!search || search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`/api/stocks/search?q=${search}`);
        setResults(res.data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <>
      {/* Mobile Toggle */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-card border-r flex flex-col h-full transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="p-2 rounded-xl bg-primary/10">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tighter">StockAI</h1>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search symbols..." 
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background transition-colors" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && (
              <div className="absolute right-3 top-2.5">
                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>

          <nav className="space-y-1">
            <Link href="/dashboard">
              <Button 
                variant={pathname === "/dashboard" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 rounded-lg px-3 ${pathname === "/dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/screener">
              <Button 
                variant={pathname === "/dashboard/screener" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 rounded-lg px-3 ${pathname === "/dashboard/screener" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Activity className="h-4 w-4" />
                AI Screener
              </Button>
            </Link>
            <Link href="/watchlist">
              <Button 
                variant={pathname === "/watchlist" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 rounded-lg px-3 ${pathname === "/watchlist" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Star className="h-4 w-4" />
                Watchlist
              </Button>
            </Link>
          </nav>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-4">
            <h2 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {results.length > 0 ? "Search Results" : "My Watchlist"}
            </h2>
            <div className="space-y-1">
              {(results.length > 0 ? results : watchlist).map((symbol: any) => (
                <button
                  key={typeof symbol === 'string' ? symbol : symbol.symbol}
                  onClick={() => {
                    setSelectedSymbol(typeof symbol === 'string' ? symbol : symbol.symbol);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left transition-all group relative border ${
                    selectedSymbol === (typeof symbol === 'string' ? symbol : symbol.symbol)
                      ? "bg-primary/5 border-primary/20 text-primary shadow-sm"
                      : "hover:bg-muted/50 border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold tracking-tight">{typeof symbol === 'string' ? symbol : symbol.symbol}</span>
                    <TrendingUp className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                    {typeof symbol === 'string' ? 'Real-time Quote' : symbol.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* User Profile */}
        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10 overflow-hidden">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{session?.user?.name || "Stock Enthusiast"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email || "Welcome back"}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
