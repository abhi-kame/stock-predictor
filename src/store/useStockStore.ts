import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface WatchlistItem {
  symbol: string;
  name?: string;
}

interface Alert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'ABOVE' | 'BELOW';
  isActive: boolean;
}

interface StockState {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedRange: string;
  setSelectedRange: (range: string) => void;
  aiModel: 'ensemble' | 'lstm';
  setAiModel: (model: 'ensemble' | 'lstm') => void;
  watchlist: WatchlistItem[];
  alerts: Alert[];
  loading: boolean;
  setLoading: (loading: boolean) => void;
  fetchWatchlist: () => Promise<void>;
  addToWatchlist: (symbol: string, name?: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  createAlert: (alert: Omit<Alert, 'id' | 'isActive'>) => Promise<void>;
}

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      selectedSymbol: 'RELIANCE.NS',
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
      selectedRange: '1mo',
      setSelectedRange: (range) => set({ selectedRange: range }),
      aiModel: 'ensemble',
      setAiModel: (model) => set({ aiModel: model }),
      watchlist: [],
      alerts: [],
      loading: false,
      setLoading: (loading) => set({ loading }),

      fetchWatchlist: async () => {
        try {
          const res = await axios.get('/api/watchlist');
          set({ watchlist: res.data });
        } catch (error) {
          console.error("Failed to fetch watchlist:", error);
        }
      },

      addToWatchlist: async (symbol, name) => {
        try {
          const res = await axios.post('/api/watchlist', { symbol, name });
          set((state) => ({ watchlist: [res.data, ...state.watchlist] }));
        } catch (error) {
          console.error("Failed to add to watchlist:", error);
        }
      },

      removeFromWatchlist: async (symbol) => {
        try {
          await axios.delete('/api/watchlist', { data: { symbol } });
          set((state) => ({ watchlist: state.watchlist.filter((s) => s.symbol !== symbol) }));
        } catch (error) {
          console.error("Failed to remove from watchlist:", error);
        }
      },

      fetchAlerts: async () => {
        try {
          const res = await axios.get('/api/alerts');
          set({ alerts: res.data });
        } catch (error) {
          console.error("Failed to fetch alerts:", error);
        }
      },

      createAlert: async (alertData) => {
        try {
          const res = await axios.post('/api/alerts', alertData);
          set((state) => ({ alerts: [res.data, ...state.alerts] }));
        } catch (error) {
          console.error("Failed to create alert:", error);
        }
      },
    }),
    {
      name: 'stock-storage',
      partialize: (state) => ({ selectedSymbol: state.selectedSymbol }),
    }
  )
);
