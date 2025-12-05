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
  Square
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import { useStore } from "../../store";
import { useCallback, useMemo } from "react";

interface ServiceDetailViewProps {
  service: any;
  activeTunnel: any;
  isFavorite: boolean;
  onToggleConnection: () => void;
}

export default function ServiceDetailView({ 
  service, 
  activeTunnel,
  isFavorite,
  onToggleConnection 
}: ServiceDetailViewProps) {
  const { t } = useTranslation();
  const isServiceConnected = !!activeTunnel;

  const getProtocolIcon = useCallback((protocol: string) => {
    const iconClass = protocol === 'ssh' ? 'bg-green-500/20' :
                     protocol === 'rdp' ? 'bg-blue-500/20' :
                     'bg-purple-500/20';
    
    const Icon = protocol === 'ssh' ? Terminal :
                 protocol === 'rdp' ? Monitor :
                 Network;

    return (
      <div className={`p-3 rounded-xl ${iconClass}`}>
        <Icon size={20} className={
          protocol === 'ssh' ? 'text-green-400' :
          protocol === 'rdp' ? 'text-blue-400' :
          'text-purple-400'
        } aria-hidden="true" />
      </div>
    );
  }, []);

  const handleToggleFavorite = useCallback(() => {
    useStore.getState().toggleFavorite(service.id);
  }, [service.id]);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Service Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {getProtocolIcon(service.protocol)}
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Service {service.id.slice(0, 8)}</h2>
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
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            aria-label="Edit service"
          >
            <Edit2 size={18} aria-hidden="true" />
          </button>
          <button 
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
            aria-label="Delete service"
          >
            <Trash2 size={18} aria-hidden="true" />
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
            }`} aria-hidden="true" />
            <span className={`text-sm font-medium ${
              isServiceConnected ? 'text-green-400' : 'text-gray-400'
            }`}>
              {isServiceConnected ? t('common.connected') : t('common.disconnected')}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onToggleConnection}
            cta={!isServiceConnected}
            variant={isServiceConnected ? 'secondary' : 'primary'}
            className="flex-1"
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
      </div>

      {/* Service Details */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('serverManagement.serviceDetails')}</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-gray-400">{t('serverManagement.protocol')}</span>
            <span className="text-white font-medium uppercase">{service.protocol}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-gray-400">{t('serverManagement.host')}</span>
            <span className="text-white font-mono text-sm">{service.host || t('serverManagement.notConfigured')}</span>
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
            <span className="text-white font-mono text-xs">{service.id}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {isServiceConnected && (
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-gray-400" aria-hidden="true" />
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
