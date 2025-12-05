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
  cloudflaredVersion: string | null;
  isInstallingCloudflared: boolean;
  cloudflaredLatestVersion: string | null;
  isUpdatingCloudflared: boolean;
}

export interface UIActions {
  setActiveTab: (tab: string) => void;
  addRecentConnection: (connection: RecentConnection) => void;
  toggleFavorite: (serviceId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  // Cloudflared Actions
  checkCloudflared: () => Promise<void>;
  installCloudflared: () => Promise<void>;
  checkForCloudflaredUpdate: () => Promise<void>;
  updateCloudflared: () => Promise<void>;
}

export type UISlice = UIState & UIActions;

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set, get) => ({
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
  cloudflaredVersion: null,
  isInstallingCloudflared: false,
  cloudflaredLatestVersion: null,
  isUpdatingCloudflared: false,

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

  // Cloudflared Actions
  checkCloudflared: async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const version = await invoke<string>('check_cloudflared_version');
      set({ cloudflaredVersion: version });
    } catch (error) {
      console.log('Cloudflared not found or error:', error);
      set({ cloudflaredVersion: null });
    }
  },

  installCloudflared: async () => {
    set({ isInstallingCloudflared: true });
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('install_cloudflared');
      // Check version again to confirm installation
      const version = await invoke<string>('check_cloudflared_version');
      set({ 
        cloudflaredVersion: version,
        isInstallingCloudflared: false 
      });
    } catch (error) {
      console.error('Failed to install cloudflared:', error);
      set({ isInstallingCloudflared: false });
      throw error;
    }
  },

  checkForCloudflaredUpdate: async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const latestVersion = await invoke<string>('get_latest_cloudflared_version');
      set({ cloudflaredLatestVersion: latestVersion });
    } catch (error) {
      console.error('Failed to check for cloudflared updates:', error);
    }
  },

  updateCloudflared: async () => {
    set({ isUpdatingCloudflared: true });
    try {
      // Stop all active tunnels first
      const store = get() as any;
      if (store.stopAllTunnels) {
          await store.stopAllTunnels();
      }
      
      const { invoke } = await import('@tauri-apps/api/core');
      // Install/update cloudflared
      await invoke('install_cloudflared');
      
      // Check version again to confirm update
      const version = await invoke<string>('check_cloudflared_version');
      set({ 
        cloudflaredVersion: version,
        cloudflaredLatestVersion: null,
        isUpdatingCloudflared: false 
      });
    } catch (error) {
      console.error('Failed to update cloudflared:', error);
      set({ isUpdatingCloudflared: false });
      throw error;
    }
  },
});

