import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

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

export interface TunnelState {
  tunnels: Tunnel[];
  connected_services: string[];
  selectedServiceId: string | null;
}

export interface TunnelActions {
  handleConnectedServicesChange: (services: string[]) => void;
  handleConnectService: (serviceId: string) => void;
  handleDisconnectService: (serviceId: string) => void;
  setSelectedService: (serviceId: string | null) => void;
  startTcpTunnel: (hostname: string, localPort: number) => Promise<void>;
  stopTcpTunnel: (id: string) => Promise<void>;
}

export type TunnelSlice = TunnelState & TunnelActions;

export const createTunnelSlice: StateCreator<
  TunnelSlice,
  [],
  [],
  TunnelSlice
> = (set) => ({
  // State
  tunnels: [],
  connected_services: [],
  selectedServiceId: null,

  // Actions
  handleConnectedServicesChange: (services) => {
    set({ connected_services: services });
  },

  handleConnectService: (serviceId) => {
    set((state) => ({
      connected_services: [...state.connected_services, serviceId],
    }));
  },

  handleDisconnectService: (serviceId) => {
    set((state) => ({
      connected_services: state.connected_services.filter((id) => id !== serviceId),
    }));
  },

  setSelectedService: (serviceId) => {
    set({ selectedServiceId: serviceId });
  },

  startTcpTunnel: async (hostname, localPort) => {
    try {
      const tunnel = await invoke<Tunnel>('start_tcp_tunnel', { hostname, localPort });
      set((state) => ({
        tunnels: [
          ...state.tunnels,
          {
            ...tunnel,
            status: 'active',
            createdAt: new Date().toISOString(),
            name: `${hostname}:${localPort}`,
          },
        ],
      }));
    } catch (error) {
      console.error('Failed to start TCP tunnel:', error);
      throw error;
    }
  },

  stopTcpTunnel: async (id) => {
    try {
      await invoke('stop_tcp_tunnel', { id });
      set((state) => ({
        tunnels: state.tunnels.filter((t) => t.id !== id),
      }));
    } catch (error) {
      console.error('Failed to stop TCP tunnel:', error);
      throw error;
    }
  },
});
