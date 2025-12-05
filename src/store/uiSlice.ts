import { StateCreator } from 'zustand';

export interface RecentConnection {
  id: string;
  name: string;
  protocol: 'ssh' | 'rdp' | 'tcp';
  timestamp: string;
  serverId: string;
  serviceId: string;
}

export interface AppSettings {
  language: 'en' | 'ru';
  theme: 'dark' | 'light' | 'system';
  cloudflaredPath?: string;
  autoConnect: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface UIState {
  activeTab: string;
  recentConnections: RecentConnection[];
  favorites: string[];
  settings: AppSettings;
}

export interface UIActions {
  setActiveTab: (tab: string) => void;
  addRecentConnection: (connection: RecentConnection) => void;
  toggleFavorite: (serviceId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export type UISlice = UIState & UIActions;

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set) => ({
  // State
  activeTab: 'dashboard',
  recentConnections: [],
  favorites: [],
  settings: {
    language: (localStorage.getItem('language') as 'en' | 'ru') || 'en',
    theme: 'dark',
    autoConnect: false,
    logLevel: 'info',
  },

  // Actions
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  addRecentConnection: (connection) => {
    set((state) => ({
      recentConnections: [connection, ...state.recentConnections].slice(0, 10),
    }));
  },

  toggleFavorite: (serviceId) => {
    set((state) => {
      const index = state.favorites.indexOf(serviceId);
      const newFavorites = [...state.favorites];
      if (index > -1) {
        newFavorites.splice(index, 1);
      } else {
        newFavorites.push(serviceId);
      }
      return { favorites: newFavorites };
    });
  },

  updateSettings: (settings) => {
    set((state) => {
      const newSettings = { ...state.settings, ...settings };
      if (settings.language) {
        localStorage.setItem('language', settings.language);
      }
      return { settings: newSettings };
    });
  },
});
