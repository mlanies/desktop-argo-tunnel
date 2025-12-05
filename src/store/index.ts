import { create } from 'zustand';
import { createServerSlice, ServerSlice } from './serverSlice';
import { createTunnelSlice, TunnelSlice } from './tunnelSlice';
import { createUISlice, UISlice } from './uiSlice';

// Combined store type
export type StoreState = ServerSlice & TunnelSlice & UISlice;

// Create the store by combining all slices
export const useStore = create<StoreState>()((...a) => ({
  ...createServerSlice(...a),
  ...createTunnelSlice(...a),
  ...createUISlice(...a),
}));

// Utility hook to find a service by ID
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

// Export types
export type { Tunnel, RecentConnection, AppSettings } from './tunnelSlice';
export type { ServerState, TunnelState, UIState } from './serverSlice';
