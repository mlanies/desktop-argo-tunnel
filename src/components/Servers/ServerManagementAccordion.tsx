import { useTranslation } from "react-i18next";
import { useStore } from "../../store";
import { Server as ServerIcon, Plus, ChevronDown, ChevronRight } from "lucide-react";
import Button from "../Button/Button";
import { useState, useMemo, useCallback } from "react";
import AddServiceModal from "./AddServiceModal";
import AddServerWizard from "./AddServerWizard";
import { useToast } from "../../hooks/useToast";
import Portal from "../Portal";
import ServiceDetailView from "./ServiceDetailView";

export default function ServerManagementAccordion() {
  const { t } = useTranslation();
  const {
    services_by_server_by_company,
    connected_services,
    selectedServiceId,
    tunnels,
    favorites
  } = useStore();

  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [selectedServerForService, setSelectedServerForService] = useState<any>(null);
  const toast = useToast();

  // Memoize expensive computations
  const allServers = useMemo(() => 
    services_by_server_by_company.flatMap((c: any) => c.servers),
    [services_by_server_by_company]
  );

  const allServices = useMemo(() => 
    allServers.flatMap((s: any) => s.services),
    [allServers]
  );

  // Find selected service (memoized)
  const selectedService = useMemo(() => 
    selectedServiceId ? allServices.find((s: any) => s.id === selectedServiceId) : null,
    [selectedServiceId, allServices]
  );

  // Check if service has an active tunnel (memoized)
  const activeTunnel = useMemo(() => 
    selectedService
      ? tunnels.find((t: any) => t.hostname === selectedService.host && t.remotePort === selectedService.port)
      : null,
    [selectedService, tunnels]
  );

  const isServiceConnected = !!activeTunnel;

  // Check if service is favorite (memoized)
  const isFavorite = useMemo(() => 
    selectedServiceId ? favorites.includes(selectedServiceId) : false,
    [selectedServiceId, favorites]
  );

  const handleToggleConnection = useCallback(async () => {
    if (!selectedService) return;

    try {
      if (isServiceConnected) {
        if (activeTunnel) {
          await useStore.getState().stopTcpTunnel(activeTunnel.id);
          toast.success(t('success.disconnected'));
        }
      } else {
        await useStore.getState().startTcpTunnel(selectedService.host, selectedService.port);
        toast.success(t('success.connected'));

        // Add to recent connections
        useStore.getState().addRecentConnection({
          id: crypto.randomUUID(),
          name: `Service ${selectedService.id.slice(0, 8)}`,
          protocol: selectedService.protocol,
          timestamp: new Date().toISOString(),
          serverId: selectedService.id,
          serviceId: selectedService.id
        });
      }
    } catch (error) {
      toast.error(t('errors.connectionFailed'));
    }
  }, [selectedService, isServiceConnected, activeTunnel, toast, t]);

  const handleCloseAddServerModal = useCallback(() => {
    setShowAddServerModal(false);
  }, []);

  const handleAddServer = useCallback(() => {
    setShowAddServerModal(true);
  }, []);

  const toggleServer = useCallback((serverId: string) => {
    setExpandedServers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serverId)) {
        newSet.delete(serverId);
      } else {
        newSet.add(serverId);
      }
      return newSet;
    });
  }, []);

  const handleAddServiceClick = useCallback((server: any) => {
    setSelectedServerForService(server);
    setShowAddServiceModal(true);
  }, []);

  // Check if there are any servers in the system (memoized)
  const hasServers = useMemo(() => 
    services_by_server_by_company.length > 0 &&
    services_by_server_by_company.some((c: any) => c.servers.length > 0),
    [services_by_server_by_company]
  );

  return (
    <div className="flex h-full">
      {/* Left sidebar - Accordion Server List */}
      <div className="w-80 shrink-0 flex flex-col border-r border-white/5 bg-black/20">
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('serverManagement.servers')}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddServer}
              className="h-6 w-6 p-0 hover:bg-white/10"
              ariaLabel={t('serverManagement.addServer')}
            >
              <Plus size={16} className="text-gray-400 hover:text-white" aria-hidden="true" />
            </Button>
          </div>

          {!hasServers ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ServerIcon size={24} className="text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">{t('serverManagement.noServers')}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {services_by_server_by_company.map((company: any) => (
                <div key={company.id}>
                  <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 mb-2">
                    {company.name}
                  </div>
                  <div className="space-y-1">
                    {company.servers.map((server: any) => {
                      const isExpanded = expandedServers.has(server.id);
                      return (
                        <div key={server.id} className="space-y-1">
                          {/* Server Header */}
                          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
                            <button
                              onClick={() => toggleServer(server.id)}
                              className="flex-1 flex items-center gap-2 text-left"
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${server.name}`}
                            >
                              {isExpanded ? (
                                <ChevronDown size={16} className="text-gray-400" aria-hidden="true" />
                              ) : (
                                <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />
                              )}
                              <ServerIcon size={14} className="text-gray-500" aria-hidden="true" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-white truncate">{server.name}</div>
                                <div className="text-[10px] text-gray-600">
                                  {server.services.length} {server.services.length === 1 ? 'service' : 'services'}
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleAddServiceClick(server)}
                              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                              aria-label={`Add service to ${server.name}`}
                            >
                              <Plus size={14} aria-hidden="true" />
                            </button>
                          </div>

                          {/* Services List (when expanded) */}
                          {isExpanded && (
                            <div className="ml-6 space-y-1">
                              {server.services.map((service: any) => {
                                const isConnected = connected_services.includes(service.id);
                                const isSelected = selectedServiceId === service.id;
                                return (
                                  <button
                                    key={service.id}
                                    onClick={() => useStore.getState().setSelectedService(service.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                                      isSelected
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                                    }`}
                                    aria-label={`Service ${service.id.slice(0, 8)} - ${service.protocol}`}
                                    aria-pressed={isSelected}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium">Service {service.id.slice(0, 8)}</div>
                                        <div className="text-[10px] text-gray-600 uppercase">{service.protocol}</div>
                                      </div>
                                      {isConnected && (
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-glow" aria-label="Connected" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right content area */}
      <div className="flex-1 min-w-0 bg-black/10">
        {selectedService ? (
          <ServiceDetailView
            service={selectedService}
            activeTunnel={activeTunnel}
            isFavorite={isFavorite}
            onToggleConnection={handleToggleConnection}
          />
        ) : (
          <div className="flex flex-col h-full items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/10 flex items-center justify-center">
                <ServerIcon size={32} className="text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('serverManagement.selectServer')}</h3>
              <p className="text-gray-400 mb-6">
                {t('serverManagement.selectServerDesc')}
              </p>
              <Button
                cta
                onClick={handleAddServer}
                ariaLabel={t('serverManagement.addServer')}
              >
                <Plus size={16} className="mr-2" aria-hidden="true" />
                {t('serverManagement.addServer')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddServiceModal && selectedServerForService && (
        <Portal>
          <AddServiceModal
            serverId={selectedServerForService.id}
            serverName={selectedServerForService.name}
            onClose={() => {
              setShowAddServiceModal(false);
              setSelectedServerForService(null);
            }}
            onSuccess={() => {
              // Data will be updated via servers_event
            }}
          />
        </Portal>
      )}
      {showAddServerModal && (
        <Portal>
          <AddServerWizard
            onClose={handleCloseAddServerModal}
            onSuccess={() => {
              // Data will be updated via servers_event
            }}
          />
        </Portal>
      )}
    </div>
  );
}
