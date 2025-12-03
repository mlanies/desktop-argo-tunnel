import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Company } from "./generated/ts-rs/Company";
import { ErasedService } from "./generated/ts-rs/ErasedService";
import { Credential } from "./generated/ts-rs/Credential";

type ErasedServiceCompanies = Company<ErasedService>[];

type State = {
  services_by_server_by_company: ErasedServiceCompanies;
  expanded_companies: string[];
  connected_services: string[];
  selectedServerId: string | null;
  selectedServiceId: string | null;
  view_service_credential?: {
    service: string;
    remember: boolean;
    credential: Credential | null;
  };
  credentialsByServiceId: Record<string, Credential>;
};

type Actions = {
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
};

export const useStore = create<State & Actions>()(
  immer((set) => ({
    services_by_server_by_company: [],
    expanded_companies: [],
    connected_services: [],
    selectedServerId: null,
    selectedServiceId: null,
    credentialsByServiceId: {},
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
        // Сбрасываем выбранный сервис при смене сервера
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
