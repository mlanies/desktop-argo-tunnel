import { useState, useCallback, useMemo } from "react";
import { useStore } from "../../store";
import { useTranslation } from "react-i18next";
import { 
  Plus, 
  ChevronDown, 
  Terminal, 
  Monitor, 
  Network,
  Edit2,
  Trash2
} from "lucide-react";
import Button from "../Button/Button";
import AddServerWizard from "./AddServerWizard";
import AddServiceModal from "./AddServiceModal";
import ServiceDetailModal from "./ServiceDetailModal";
import ConfirmationModal from "../ConfirmationModal";
import { useToast } from "../../hooks/useToast";
import Portal from "../Portal";

export default function ServerManagement() {
  const { t } = useTranslation();
  const {
    services_by_server_by_company,
    connected_services,
    tunnels,
    favorites,
    deleteServer,
    deleteService
  } = useStore();

  const [showAddServerWizard, setShowAddServerWizard] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showServiceDetailModal, setShowServiceDetailModal] = useState(false);
  const [serverToEdit, setServerToEdit] = useState<any>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [selectedServerForService, setSelectedServerForService] = useState<any>(null);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<any>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const toast = useToast();

  const allServers = useMemo(() => 
    services_by_server_by_company.flatMap((c: any) => c.servers),
    [services_by_server_by_company]
  );

  const closeConfirmationModal = useCallback(() => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleDeleteServer = useCallback((serverId: string, name: string, servicesCount: number) => {
    const message = servicesCount > 0 
      ? t('common.deleteConfirm', { name }) + '\n\n' + t('serverManagement.deleteServerWithServices', { count: servicesCount })
      : t('common.deleteConfirm', { name });
    
    setConfirmationModal({
      isOpen: true,
      title: t('serverManagement.deleteServer'),
      message,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteServer(serverId);
          toast.success(t('success.deleted'));
          closeConfirmationModal();
        } catch (error) {
          console.error('Failed to delete server:', error);
          toast.error(t('errors.generic'));
        }
      }
    });
  }, [deleteServer, toast, t, closeConfirmationModal]);

  const handleEditServer = useCallback((server: any) => {
    setServerToEdit(server);
    setShowAddServerWizard(true);
  }, []);

  const handleDeleteService = useCallback(async (serviceId: string, serverId: string) => {
    try {
      await deleteService(serviceId, serverId);
      toast.success(t('success.deleted'));
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  }, [deleteService, toast, t]);

  const handleAddServerClick = useCallback(() => {
    setServerToEdit(null);
    setShowAddServerWizard(true);
  }, []);

  const handleCloseAddServerWizard = useCallback(() => {
    setShowAddServerWizard(false);
    setServerToEdit(null);
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

  const handleServiceClick = useCallback((service: any) => {
    setSelectedServiceForDetail(service);
    setShowServiceDetailModal(true);
  }, []);

  const getProtocolIcon = (protocol: string) => {
    switch (protocol.toLowerCase()) {
      case 'ssh':
        return <Terminal size={20} className="text-green-400" />;
      case 'rdp':
        return <Monitor size={20} className="text-blue-400" />;
      case 'tcp':
        return <Network size={20} className="text-purple-400" />;
      default:
        return <Network size={20} className="text-gray-400" />;
    }
  };

  const hasServers = useMemo(() => 
    services_by_server_by_company.length > 0 &&
    services_by_server_by_company.some((c: any) => c.servers.length > 0),
    [services_by_server_by_company]
  );

  return (
    <div className="flex h-full justify-center items-center">
      {/* Full-width Accordion Server List */}
      <div className="w-full max-w-2xl flex flex-col h-full">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">{t('serverManagement.servers')}</h1>
            <Button
              cta
              onClick={handleAddServerClick}
              ariaLabel={t('serverManagement.addServer')}
            >
              <Plus size={16} className="mr-2" />
              {t('serverManagement.addServer')}
            </Button>
          </div>

          {/* Server List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {!hasServers ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <h3 className="text-lg font-semibold text-white mb-2">{t('serverManagement.noServers')}</h3>
                <p className="text-gray-400 mb-6">{t('serverManagement.addServerDesc')}</p>
                <Button
                  cta
                  onClick={handleAddServerClick}
                  ariaLabel={t('serverManagement.addServer')}
                >
                  <Plus size={16} className="mr-2" />
                  {t('serverManagement.addServer')}
                </Button>
              </div>
            ) : (
              allServers.map((server: any) => (
                <div 
                  key={server.id}
                  className="glass-panel rounded-xl overflow-hidden"
                >
                  {/* Server Header */}
                  <button
                    onClick={() => toggleServer(server.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-2 h-2 rounded-full ${
                        server.services.some((s: any) => connected_services.includes(s.id))
                          ? 'bg-green-400'
                          : 'bg-gray-500'
                      }`} />
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{server.name}</h3>
                        {server.description && (
                          <p className="text-sm text-gray-400 mt-0.5">{server.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {server.services.length} {server.services.length === 1 ? t('serverManagement.serviceConfigured') : t('serverManagement.servicesConfigured')}
                      </span>
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`text-gray-400 transition-transform ${
                        expandedServers.has(server.id) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Server Actions & Services */}
                  {expandedServers.has(server.id) && (
                    <div className="border-t border-white/10">
                      {/* Server Actions */}
                      <div className="p-3 bg-white/5 flex items-center justify-between border-b border-white/10">
                        <span className="text-xs text-gray-400 uppercase font-medium">Actions</span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditServer(server);
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-blue-400 hover:text-blue-300"
                            aria-label={`${t('common.edit')} ${server.name}`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteServer(server.id, server.name, server.services.length);
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
                            aria-label={`${t('common.delete')} ${server.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddServiceClick(server);
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            aria-label={`Add service to ${server.name}`}
                          >
                            <Plus size={18} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Services List */}
                      <div className="p-4 space-y-2">
                        {server.services.map((service: any) => {
                          const isConnected = connected_services.includes(service.id);
                          return (
                            <div
                              key={service.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                            >
                              <button
                                onClick={() => handleServiceClick(service)}
                                className="flex items-center gap-3 flex-1 text-left"
                              >
                                {getProtocolIcon(service.protocol)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{service.protocol.toUpperCase()}</span>
                                    {isConnected && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                        Connected
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-400">{service.host}:{service.port}</p>
                                </div>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteService(service.id, server.id);
                                }}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                                aria-label={`Delete ${service.protocol} service`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddServiceModal && selectedServerForService && (
        <Portal>
          <AddServiceModal
            serverId={selectedServerForService.id}
            serverName={selectedServerForService.name}
            onClose={() => setShowAddServiceModal(false)}
            onSuccess={() => setShowAddServiceModal(false)}
          />
        </Portal>
      )}

      {showAddServerWizard && (
        <Portal>
          <AddServerWizard
            onClose={handleCloseAddServerWizard}
            onSuccess={handleCloseAddServerWizard}
            initialData={serverToEdit}
          />
        </Portal>
      )}

      {showServiceDetailModal && selectedServiceForDetail && (
        <Portal>
          <ServiceDetailModal
            service={selectedServiceForDetail}
            tunnels={tunnels}
            favorites={favorites}
            onClose={() => setShowServiceDetailModal(false)}
          />
        </Portal>
      )}

      <Portal>
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          title={confirmationModal.title}
          message={confirmationModal.message}
          onConfirm={confirmationModal.onConfirm}
          onCancel={closeConfirmationModal}
          isDestructive={confirmationModal.isDestructive}
        />
      </Portal>
    </div>
  );
}
