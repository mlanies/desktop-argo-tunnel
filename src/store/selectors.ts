import { StoreState } from './index';

/**
 * Selectors for derived state
 * These help prevent unnecessary re-renders by selecting only needed data
 */

// Server selectors
export const selectAllServers = (state: StoreState) =>
  state.services_by_server_by_company.flatMap((c) => c.servers);

export const selectAllServices = (state: StoreState) =>
  selectAllServers(state).flatMap((s) => s.services);

export const selectServerById = (state: StoreState, id: string) =>
  selectAllServers(state).find((s) => s.id === id);

export const selectServiceById = (state: StoreState, id: string) =>
  selectAllServices(state).find((s) => s.id === id);

export const selectHasServers = (state: StoreState) =>
  state.services_by_server_by_company.length > 0 &&
  state.services_by_server_by_company.some((c) => c.servers.length > 0);

// Tunnel selectors
export const selectActiveTunnels = (state: StoreState) =>
  state.tunnels.filter((t) => t.status === 'active');

export const selectTunnelByService = (state: StoreState, serviceId: string) => {
  const service = selectServiceById(state, serviceId);
  if (!service) return null;
  return state.tunnels.find(
    (t) => t.hostname === service.host && t.remotePort === service.port
  );
};

// UI selectors
export const selectFavoriteServices = (state: StoreState) =>
  state.favorites.map((id) => selectServiceById(state, id)).filter(Boolean);

export const selectRecentConnectionsWithDetails = (state: StoreState) =>
  state.recentConnections.map((conn) => ({
    ...conn,
    service: selectServiceById(state, conn.serviceId),
    server: selectServerById(state, conn.serverId),
  }));

// Combined selectors
export const selectSelectedServer = (state: StoreState) =>
  state.selectedServerId ? selectServerById(state, state.selectedServerId) : null;

export const selectSelectedService = (state: StoreState) =>
  state.selectedServiceId ? selectServiceById(state, state.selectedServiceId) : null;

export const selectSelectedServiceTunnel = (state: StoreState) => {
  const service = selectSelectedService(state);
  if (!service) return null;
  return state.tunnels.find(
    (t) => t.hostname === service.host && t.remotePort === service.port
  );
};

export const selectIsServiceFavorite = (state: StoreState, serviceId: string) =>
  state.favorites.includes(serviceId);

export const selectIsServiceConnected = (state: StoreState, serviceId: string) =>
  state.connected_services.includes(serviceId);
