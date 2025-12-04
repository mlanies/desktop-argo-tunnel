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
    selectedServerId,
    selectedServiceId,
    connected_services,
    setSelectedService,
    handleConnectService,
    handleDisconnectService,
    toggleFavorite,
    favorites,
    startTcpTunnel,
    stopTcpTunnel,
    tunnels,
    addRecentConnection
  } = useStore();

  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const toast = useToast();

  // Find selected server
  const selectedServer = selectedServerId
    ? services_by_server_by_company
        .flatMap((c) => c.servers)
        .find((s) => s.id === selectedServerId)
    : null;

  // Find selected service
  const selectedService = selectedServiceId
    ? services_by_server_by_company
        .flatMap((c) => c.servers)
        .flatMap((s) => s.services)
        .find((s) => s.id === selectedServiceId)
    : null;

  // Check if service has an active tunnel
  const activeTunnel = selectedService 
    ? tunnels.find(t => t.hostname === selectedService.host)
    : null;
    
  const isServiceConnected = !!activeTunnel;

  const isFavorite = selectedServiceId
    ? favorites.includes(selectedServiceId)
    : false;

  const handleToggleConnection = async () => {
    if (!selectedServiceId || !selectedService || !selectedService.host) return;

    if (!isServiceConnected) {
      // Generate random local port between 10000-60000
      const localPort = Math.floor(Math.random() * (60000 - 10000 + 1) + 10000);
      
      try {
        await startTcpTunnel(selectedService.host, localPort);
        handleConnectService(selectedServiceId);
        toast.success(`Connected to ${selectedService.host} on port ${localPort}`);
        
        // Add to recent connections
        addRecentConnection({
          id: `conn-${Date.now()}`,
          name: 'Service Connection',
          protocol: selectedService.protocol as 'ssh' | 'rdp' | 'tcp',
          timestamp: new Date().toISOString(),
          serverId: selectedServerId!,
          serviceId: selectedServiceId!
        });
      } catch (error) {
        console.error('Failed to start tunnel:', error);
        toast.error(`Failed to connect: ${error}`);
      }
    } else if (activeTunnel) {
      try {
        await stopTcpTunnel(activeTunnel.id);
        handleDisconnectService(selectedServiceId);
        toast.success('Disconnected successfully');
      } catch (error) {
        console.error('Failed to stop tunnel:', error);
        toast.error(`Failed to disconnect: ${error}`);
      }
    }
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
  
  // Empty state when NO servers exist at all
  if (!hasServers) {
    console.log('No servers in system, showing add server button');
    return (
      <>
        <div className="flex flex-col h-full items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/10 flex items-center justify-center">
              <ServerIcon size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Нет серверов</h3>
            <p className="text-gray-400 mb-6">
              Добавьте сервер для начала работы с подключениями
            </p>
            <Button 
              cta 
              onClick={() => {
                console.log('Add Server button clicked!');
                setShowAddServerModal(true);
              }}
            >
              <Plus size={16} className="mr-2" />
              Добавить сервер
            </Button>
          </div>
        </div>
        
        {/* Modals */}
        {showAddServerModal && (
          <Portal>
            <AddServerModal
              onClose={() => setShowAddServerModal(false)}
              onSuccess={() => {
                // Data will be updated via servers_event
              }}
            />
          </Portal>
        )}
      </>
    );
  }

  // Empty state when servers exist but nothing is selected
  if (!selectedServer && !selectedService) {
    console.log('Servers exist but nothing selected');
    return (
      <>
        <div className="flex flex-col h-full items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/10 flex items-center justify-center">
              <ServerIcon size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Выберите сервер</h3>
            <p className="text-gray-400 mb-6">
              Перейдите на вкладку "Серверы" в боковом меню и выберите сервер для просмотра деталей
            </p>
            <Button 
              cta 
              onClick={() => {
                console.log('Add Server button clicked from selection state!');
                setShowAddServerModal(true);
              }}
            >
              <Plus size={16} className="mr-2" />
              Добавить сервер
            </Button>
          </div>
        </div>
        
        {/* Modals */}
        {showAddServerModal && (
          <Portal>
            <AddServerModal
              onClose={() => setShowAddServerModal(false)}
              onSuccess={() => {
                // Data will be updated via servers_event
              }}
            />
          </Portal>
        )}
      </>
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
                {selectedServer.services.length} service{selectedServer.services.length !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <Edit2 size={18} />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Services List */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Services</h3>
            <button
              onClick={() => setShowAddServiceModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Add Service
            </button>
          </div>
          <div className="space-y-3">
            {selectedServer.services.map((service) => {
              const isConnected = connected_services.includes(service.id);
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
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
  if (!selectedService) return null;

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
            onClick={() => selectedServiceId && toggleFavorite(selectedServiceId)}
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
          <h3 className="text-lg font-semibold text-white">Connection Status</h3>
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
        <h3 className="text-lg font-semibold text-white mb-4">Service Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-gray-400">Protocol</span>
            <span className="text-white font-medium uppercase">{selectedService.protocol}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-gray-400">Host</span>
            <span className="text-white font-mono text-sm">{selectedService.host || 'Not configured'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-gray-400">Local Port</span>
            <span className="text-white font-mono">
              {activeTunnel ? (
                <span className="text-green-400 font-bold">{activeTunnel.localPort}</span>
              ) : (
                'Not connected'
              )}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Service ID</span>
            <span className="text-white font-mono text-xs">{selectedService.id}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {isServiceConnected && (
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="text-sm text-gray-400">
            Connected since {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
      
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
            onClose={() => setShowAddServerModal(false)}
            onSuccess={() => {
              // Data will be updated via servers_event
            }}
          />
        </Portal>
      )}
    </div>
  );
}
