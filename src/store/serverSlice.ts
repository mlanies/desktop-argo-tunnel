import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Company } from '../generated/ts-rs/Company';
import { ErasedService } from '../generated/ts-rs/ErasedService';
import { Credential } from '../generated/ts-rs/Credential';

type ErasedServiceCompanies = Company<ErasedService>[];

export interface ServerState {
  services_by_server_by_company: ErasedServiceCompanies;
  expanded_companies: string[];
  selectedServerId: string | null;
  view_service_credential?: {
    service: string;
    remember: boolean;
    credential: Credential | null;
  };
  credentialsByServiceId: Record<string, Credential>;
}

export interface ServerActions {
  handleServicesByServersByCompanyChange: (services: ErasedServiceCompanies) => void;
  handleExpandedCompaniesChange: (expanded: string[]) => void;
  setSelectedServer: (serverId: string | null) => void;
  handleUpdateViewServiceCredential: (
    service: string,
    remember: boolean,
    credential: Credential | null
  ) => void;
  clearViewServiceCredential: () => void;
  deleteServer: (id: string) => Promise<void>;
  updateServer: (id: string, name: string, description?: string) => Promise<void>;
}

export type ServerSlice = ServerState & ServerActions;

export const createServerSlice: StateCreator<
  ServerSlice,
  [],
  [],
  ServerSlice
> = (set) => ({
  // State
  services_by_server_by_company: [],
  expanded_companies: [],
  selectedServerId: null,
  credentialsByServiceId: {},

  // Actions
  handleServicesByServersByCompanyChange: (services) => {
    set({ services_by_server_by_company: services });
  },

  handleExpandedCompaniesChange: (expanded) => {
    set({ expanded_companies: expanded });
  },

  setSelectedServer: (serverId) => {
    set((state) => ({
      selectedServerId: serverId,
      selectedServiceId: serverId !== state.selectedServerId ? null : state.selectedServiceId,
    }));
  },

  handleUpdateViewServiceCredential: (service, remember, credential) => {
    set((state) => ({
      view_service_credential: { service, remember, credential },
      credentialsByServiceId: credential
        ? { ...state.credentialsByServiceId, [service]: credential }
        : state.credentialsByServiceId,
    }));
  },

  clearViewServiceCredential: () => {
    set({ view_service_credential: undefined });
  },

  deleteServer: async (id) => {
    try {
      await invoke('delete_server', { serverId: id });
    } catch (error) {
      console.error('Failed to delete server:', error);
      throw error;
    }
  },

  updateServer: async (id, name, description) => {
    try {
      await invoke('update_server', { serverId: id, name, description });
    } catch (error) {
      console.error('Failed to update server:', error);
      throw error;
    }
  },
});
