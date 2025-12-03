import { invoke } from "@tauri-apps/api/core";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Company } from "./generated/ts-rs/Company";
import { ErasedService } from "./generated/ts-rs/ErasedService";
import { Credential } from "./generated/ts-rs/Credential";

type ErasedServiceCompanies = Company<ErasedService>[];

export interface Tunnel {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  hostname?: string;
  localPort?: number;
  pid?: number;
  config?: Record<string, any>;
}

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

type Actions = {
  // ... existing actions
  handleServicesByServersByCompanyChange: (
    services_by_server_by_company: ErasedServiceCompanies,
  ) => void;
  handleExpandedCompaniesChange: (expanded_companies: string[]) => void;
  handleConnectedServicesChange: (connected_services: string[]) => void;
  handleConnectService: (service_id: string) => void;
  handleDisconnectService: (service_id: string) => void;
  setSelectedServer: (serverId: string | null) => void;
  setSelectedService: (serviceId: string | null) => void;
  handleUpdateViewServiceCredential: (
    service: string,
    remember: boolean,
    credential: Credential | null,
  ) => void;
  clearViewServiceCredential: () => void;
  
  // New actions
  setActiveTab: (tab: string) => void;
  
  // Async Tunnel Actions
  startTcpTunnel: (hostname: string, localPort: number) => Promise<void>;
  stopTcpTunnel: (id: string) => Promise<void>;
  
  addRecentConnection: (connection: RecentConnection) => void;
  toggleFavorite: (serviceId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
};

export const useStore = create<State & Actions>()(
  immer((set, get) => ({
    // ... initial state
    services_by_server_by_company: [],
    expanded_companies: [],
    connected_services: [],
    selectedServerId: null,
    selectedServiceId: null,
    credentialsByServiceId: {},
    
    tunnels: [], // Now represents active TCP tunnels
    recentConnections: [],
    favorites: [],
    activeTab: 'dashboard',
    settings: {
      language: (localStorage.getItem('language') as 'en' | 'ru') || 'en',
      theme: 'dark',
      autoConnect: false,
      logLevel: 'info',
    },

    // ... existing handlers
    handleServicesByServersByCompanyChange: (
      services_by_server_by_company: ErasedServiceCompanies,
    ) => {
      set((state) => {
        state.services_by_server_by_company = services_by_server_by_company;
      });
    },
    handleExpandedCompaniesChange: (expanded_companies: string[]) => {
      set((state) => {
        state.expanded_companies = expanded_companies;
      });
    },
    handleConnectedServicesChange: (connected_services: string[]) => {
      set((state) => {
        state.connected_services = connected_services;
      });
    },
    handleConnectService: (service_id: string) => {
      set((state) => {
        state.connected_services.push(service_id);
      });
    },
    handleDisconnectService: (service_id: string) => {
      set((state) => {
        state.connected_services = state.connected_services.filter(
          (id) => id !== service_id,
        );
      });
    },
    setSelectedServer: (serverId: string | null) => {
      set((state) => {
        state.selectedServerId = serverId;
        if (serverId !== state.selectedServerId) {
          state.selectedServiceId = null;
        }
      });
    },
    setSelectedService: (serviceId: string | null) => {
      set((state) => {
        state.selectedServiceId = serviceId;
      });
    },
    handleUpdateViewServiceCredential: (
      service: string,
      remember: boolean,
      credential: Credential | null,
    ) => {
      set((state) => {
        state.view_service_credential = {
          service,
          remember,
          credential,
        };
        if (credential) {
          state.credentialsByServiceId[service] = credential;
        }
      });
    },
    clearViewServiceCredential: () => {
      set((state) => {
        state.view_service_credential = undefined;
      });
    },
    
    setActiveTab: (tab: string) => {
      set((state) => {
        state.activeTab = tab;
      });
    },
    
    // Async TCP Tunnel Implementation
    startTcpTunnel: async (hostname: string, localPort: number) => {
      try {
        const tunnel = await invoke<Tunnel>('start_tcp_tunnel', { hostname, localPort });
        set((state) => {
          state.tunnels.push({
            ...tunnel,
            status: 'active',
            createdAt: new Date().toISOString(),
            name: `${hostname}:${localPort}`
          });
        });
      } catch (error) {
        console.error('Failed to start TCP tunnel:', error);
        throw error;
      }
    },

    stopTcpTunnel: async (id: string) => {
      try {
        await invoke('stop_tcp_tunnel', { id });
        set((state) => {
          state.tunnels = state.tunnels.filter(t => t.id !== id);
        });
      } catch (error) {
        console.error('Failed to stop TCP tunnel:', error);
        throw error;
      }
    },
    
    addRecentConnection: (connection: RecentConnection) => {
      set((state) => {
        state.recentConnections = [connection, ...state.recentConnections].slice(0, 10);
      });
    },
    
    toggleFavorite: (serviceId: string) => {
      set((state) => {
        const index = state.favorites.indexOf(serviceId);
        if (index > -1) {
          state.favorites.splice(index, 1);
        } else {
          state.favorites.push(serviceId);
        }
      });
    },
    
    updateSettings: (settings: Partial<AppSettings>) => {
      set((state) => {
        state.settings = { ...state.settings, ...settings };
        if (settings.language) {
          localStorage.setItem('language', settings.language);
        }
      });
    },
  })),
);

export const useService = (id: string) => {
  const store = useStore();
  for (const company of store.services_by_server_by_company) {
    for (const server of company.servers) {
      for (const service of server.services) {
        if (service.id === id) {
          return service;
        }
      }
    }
  }
};
