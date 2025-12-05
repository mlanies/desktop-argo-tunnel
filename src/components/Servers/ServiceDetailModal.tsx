import { 
  Terminal, 
  Monitor, 
  Network, 
  Server as ServerIcon,
  Edit2,
  Trash2,
  Star,
  Clock,
  Play,
  Square,
  X
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import { useStore } from "../../store";
import { useCallback, useMemo, useId } from "react";
import { FocusTrap } from "../FocusTrap";
import { useToast } from "../../hooks/useToast";

interface ServiceDetailModalProps {
  service: any;
  tunnels: any[];
  favorites: string[];
  onClose: () => void;
}

export default function ServiceDetailModal({ 
  service, 
  tunnels,
  favorites,
  onClose 
}: ServiceDetailModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const toast = useToast();

  const activeTunnel = useMemo(() => 
    tunnels.find((t: any) => t.hostname === service.host && t.remotePort === service.port),
    [tunnels, service]
  );

  const isServiceConnected = !!activeTunnel;
  const isFavorite = favorites.includes(service.id);

  const getProtocolIcon = useCallback((protocol: string) => {
    const iconClass = protocol === 'ssh' ? 'bg-green-500/20' :
                     protocol === 'rdp' ? 'bg-blue-500/20' :
                     'bg-purple-500/20';
    
    const Icon = protocol === 'ssh' ? Terminal :
                 protocol === 'rdp' ? Monitor :
                 Network;

    const iconColor = protocol === 'ssh' ? 'text-green-400' :
                      protocol === 'rdp' ? 'text-blue-400' :
                      'text-purple-400';

    return (
      <div className={`p-3 rounded-xl ${iconClass}`}>
        <Icon size={24} className={iconColor} aria-hidden="true" />
      </div>
    );
  }, []);

  const handleToggleFavorite = useCallback(() => {
    useStore.getState().toggleFavorite(service.id);
  }, [service.id]);

  const handleToggleConnection = useCallback(async () => {
    try {
      if (isServiceConnected) {
        if (activeTunnel) {
          await useStore.getState().stopTcpTunnel(activeTunnel.id);
          toast.success(t('success.disconnected'));
        }
      } else {
        await useStore.getState().startTcpTunnel(service.host, service.port);
        toast.success(t('success.connected'));

        // Add to recent connections
        useStore.getState().addRecentConnection({
          id: crypto.randomUUID(),
          name: `Service ${service.id.slice(0, 8)}`,
          protocol: service.protocol,
          timestamp: new Date().toISOString(),
          serverId: service.id,
          serviceId: service.id
        });
      }
    } catch (error) {
      toast.error(t('errors.connectionFailed'));
    }
  }, [service, isServiceConnected, activeTunnel, toast, t]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <FocusTrap active onEscape={onClose}>
        <div 
          className="glass-panel rounded-2xl w-full max-w-lg mx-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-white/10">
            <div className="flex items-start gap-4">
              {getProtocolIcon(service.protocol)}
              <div>
                <h2 id={titleId} className="text-2xl font-bold text-white mb-1">
                  Service {service.id.slice(0, 8)}
                </h2>
                <p className="text-gray-400 text-sm uppercase">{service.protocol} Service</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleToggleFavorite}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'hover:bg-white/10 text-gray-400 hover:text-yellow-400'
                }`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={isFavorite}
              >
                <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                aria-label={t('common.close') || 'Close'}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Connection Status */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{t('serverManagement.connectionStatus')}</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isServiceConnected
                      ? 'bg-green-500 animate-pulse-glow'
                      : 'bg-gray-600'
                  }`} aria-hidden="true" />
                  <span className={`text-sm font-medium ${
                    isServiceConnected ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {isServiceConnected ? t('common.connected') : t('common.disconnected')}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleToggleConnection}
                cta={!isServiceConnected}
                variant={isServiceConnected ? 'secondary' : 'primary'}
                className="w-full"
                ariaLabel={isServiceConnected ? t('common.disconnect') : t('common.connect')}
              >
                {isServiceConnected ? (
                  <>
                    <Square size={16} className="mr-2" aria-hidden="true" />
                    {t('common.disconnect')}
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2" aria-hidden="true" />
                    {t('common.connect')}
                  </>
                )}
              </Button>
            </div>

            {/* Service Details */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">{t('serverManagement.serviceDetails')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">{t('serverManagement.protocol')}</span>
                  <span className="text-white font-medium uppercase">{service.protocol}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">{t('serverManagement.host')}</span>
                  <span className="text-white font-mono text-sm">{service.host || t('serverManagement.notConfigured')}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">{t('serverManagement.localPort')}</span>
                  <span className="text-white font-mono">
                    {activeTunnel ? (
                      <span className="text-green-400 font-bold">{activeTunnel.localPort}</span>
                    ) : (
                      t('serverManagement.notConnected')
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-400">{t('serverManagement.serviceId')}</span>
                  <span className="text-white font-mono text-xs">{service.id}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {isServiceConnected && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-gray-400" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-white">{t('serverManagement.recentActivity')}</h3>
                </div>
                <div className="text-sm text-gray-400">
                  {t('serverManagement.connectedSince')} {new Date().toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
