import { useTranslation } from "react-i18next";
import { useStore } from "../../store";
import { 
  Server as ServerIcon, 
  Edit2, 
  Trash2, 
  Play, 
  Square,
  Terminal,
  Monitor,
  Network,
  Star,
  Clock,
  Plus
} from "lucide-react";
import Button from "../Button/Button";
import { useState } from "react";
import AddServiceModal from "./AddServiceModal";
import AddServerModal from "./AddServerModal";
import { useToast } from "../../hooks/useToast";
import Portal from "../Portal";

export default function ServerManagement() {
  const { t } = useTranslation();
  const {
    services_by_server_by_company,
    connected_services,
    selectedServerId,
    selectedServiceId,
    tunnels,
    favorites,
    deleteServer
  } = useStore();

  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [serverToEdit, setServerToEdit] = useState<any>(null);
  const toast = useToast();

  // Find selected server
  const selectedServer = selectedServerId
    ? services_by_server_by_company
        .flatMap((c: any) => c.servers)
        .find((s: any) => s.id === selectedServerId)
    : null;

  // Find selected service
  const selectedService = selectedServiceId
    ? services_by_server_by_company
        .flatMap((c: any) => c.servers)
        .flatMap((s: any) => s.services)
        .find((s: any) => s.id === selectedServiceId)
    : null;

  // Check if service has an active tunnel
  const activeTunnel = selectedService
    ? tunnels.find((t: any) => t.hostname === selectedService.host && t.remotePort === selectedService.port)
    : null;

  const isServiceConnected = !!activeTunnel;

  // Check if service is favorite
  const isFavorite = selectedServiceId ? favorites.includes(selectedServiceId) : false;

  const handleToggleConnection = async () => {
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
          serverId: selectedServerId!,
          serviceId: selectedService.id
        });
      }
    } catch (error) {
      toast.error(t('errors.connectionFailed'));
    }
  };

  const handleDeleteServer = async (id: string, name: string) => {
    if (window.confirm(t('common.deleteConfirm', { name }))) {
      try {
        await deleteServer(id);
        toast.success(t('success.deleted'));
        if (selectedServerId === id) {
          useStore.getState().setSelectedServer(null);
        }
      } catch (error) {
        toast.error(t('errors.generic'));
      }
    }
  };

  const handleEditServer = (server: any) => {
    setServerToEdit(server);
    setShowAddServerModal(true);
  };

  const handleCloseAddServerModal = () => {
    setShowAddServerModal(false);
    setServerToEdit(null);
  };

  const getProtocolIcon = (protocol: string) => {
    switch (protocol.toLowerCase()) {
      case 'ssh':
        return <Terminal size={20} className="text-green-400" />;
      case 'rdp':
        return <Monitor size={20} className="text-blue-400" />;
      case 'tcp':
        return <Network size={20} className="text-purple-400" />;
      default:
        return <ServerIcon size={20} className="text-gray-400" />;
    }
  };

  // Check if there are any servers in the system
  const hasServers = services_by_server_by_company.length > 0 &&
    services_by_server_by_company.some((c: any) => c.servers.length > 0);

  const renderContent = () => {
    // Empty state when NO servers exist at all
    if (!hasServers) {
      return (
        <div className="flex flex-col h-full items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/10 flex items-center justify-center">
              <ServerIcon size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('serverManagement.noServers')}</h3>
            <p className="text-gray-400 mb-6">
              {t('serverManagement.addServerDesc')}
            </p>
            <Button
              cta
              onClick={() => setShowAddServerModal(true)}
            >
              <Plus size={16} className="mr-2" />
              {t('serverManagement.addServer')}
            </Button>
          </div>
        </div>
      );
    }

    // Empty state when servers exist but nothing is selected
    if (!selectedServer && !selectedService) {
      return (
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
              onClick={() => setShowAddServerModal(true)}
            >
              <Plus size={16} className="mr-2" />
              {t('serverManagement.addServer')}
            </Button>
          </div>
        </div>
      );
    }

    // Server view (when server is selected but no service)
    if (selectedServer && !selectedService) {
      return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Server Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <ServerIcon size={24} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedServer.name}</h2>
                <p className="text-gray-400 text-sm">
                  {selectedServer.services.length} {selectedServer.services.length === 1 ? t('serverManagement.serviceConfigured') : t('serverManagement.servicesConfigured')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEditServer(selectedServer)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                title={t('common.edit')}
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDeleteServer(selectedServer.id, selectedServer.name)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
                title={t('common.delete')}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Services List */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-semibold text-white">{t('serverManagement.services')}</h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddServiceModal(true)}
                className="flex items-center gap-2 shrink-0"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">{t('serverManagement.addService')}</span>
              </Button>
            </div>
            <div className="space-y-3">
              {selectedServer.services.map((service: any) => {
                const isConnected = connected_services.includes(service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => useStore.getState().setSelectedService(service.id)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {getProtocolIcon(service.protocol)}
                      <div>
                        <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          Service {service.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">{service.protocol}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isConnected
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {isConnected ? t('common.connected') : t('common.disconnected')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Service detail view
    if (selectedService) {
      return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Service Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                selectedService.protocol === 'ssh' ? 'bg-green-500/20' :
                selectedService.protocol === 'rdp' ? 'bg-blue-500/20' :
                'bg-purple-500/20'
              }`}>
                {getProtocolIcon(selectedService.protocol)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Service {selectedService.id.slice(0, 8)}</h2>
                <p className="text-gray-400 text-sm uppercase">{selectedService.protocol} Service</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectedServiceId && useStore.getState().toggleFavorite(selectedServiceId)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'hover:bg-white/10 text-gray-400 hover:text-yellow-400'
                }`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                <Edit2 size={18} />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">{t('serverManagement.connectionStatus')}</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isServiceConnected
                    ? 'bg-green-500 animate-pulse-glow'
                    : 'bg-gray-600'
                }`} />
                <span className={`text-sm font-medium ${
                  isServiceConnected ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {isServiceConnected ? t('common.connected') : t('common.disconnected')}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleToggleConnection}
                cta={!isServiceConnected}
                variant={isServiceConnected ? 'secondary' : 'primary'}
                className="flex-1"
              >
                {isServiceConnected ? (
                  <>
                    <Square size={16} className="mr-2" />
                    {t('common.disconnect')}
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2" />
                    {t('common.connect')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Service Details */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{t('serverManagement.serviceDetails')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-400">{t('serverManagement.protocol')}</span>
                <span className="text-white font-medium uppercase">{selectedService.protocol}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-400">{t('serverManagement.host')}</span>
                <span className="text-white font-mono text-sm">{selectedService.host || t('serverManagement.notConfigured')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-400">{t('serverManagement.localPort')}</span>
                <span className="text-white font-mono">
                  {activeTunnel ? (
                    <span className="text-green-400 font-bold">{activeTunnel.localPort}</span>
                  ) : (
                    t('serverManagement.notConnected')
                  )}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">{t('serverManagement.serviceId')}</span>
                <span className="text-white font-mono text-xs">{selectedService.id}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {isServiceConnected && (
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-gray-400" />
                <h3 className="text-lg font-semibold text-white">{t('serverManagement.recentActivity')}</h3>
              </div>
              <div className="text-sm text-gray-400">
                {t('serverManagement.connectedSince')} {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar - Server List */}
      <div className="w-56 shrink-0 flex flex-col border-r border-white/5 bg-black/20">
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('serverManagement.servers')}</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddServerModal(true)}
              className="h-6 w-6 p-0 hover:bg-white/10"
            >
              <Plus size={16} className="text-gray-400 hover:text-white" />
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
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {services_by_server_by_company.map((company: any) => (
                <div key={company.id}>
                  <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 mb-2">
                    {company.name}
                  </div>
                  <div className="space-y-1">
                    {company.servers.map((server: any) => (
                      <button
                        key={server.id}
                        onClick={() => {
                          useStore.getState().setSelectedServer(server.id);
                          useStore.getState().setSelectedService(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                          selectedServerId === server.id
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ServerIcon size={16} className={selectedServerId === server.id ? 'text-blue-400' : 'text-gray-500'} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{server.name}</div>
                            <div className="text-[10px] text-gray-600 truncate">
                              {server.services.length} {server.services.length === 1 ? 'service' : 'services'}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right content area */}
      <div className="flex-1 min-w-0 bg-black/10">
        {renderContent()}
      </div>

      {/* Modals */}
      {showAddServiceModal && selectedServer && (
        <Portal>
          <AddServiceModal
            serverId={selectedServer.id}
            serverName={selectedServer.name}
            onClose={() => setShowAddServiceModal(false)}
            onSuccess={() => {
              // Data will be updated via servers_event
            }}
          />
        </Portal>
      )}
      {showAddServerModal && (
        <Portal>
          <AddServerModal
            onClose={handleCloseAddServerModal}
            onSuccess={() => {
              // Data will be updated via servers_event
            }}
            initialData={serverToEdit}
          />
        </Portal>
      )}
    </div>
  );
}
