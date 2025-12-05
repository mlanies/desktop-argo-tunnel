import { useTranslation } from "react-i18next";
import { useStore } from "../../store";
import { Square, Network, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";

export default function ActiveConnections() {
  const { t, i18n } = useTranslation();
  const { tunnels, stopTcpTunnel } = useStore();
  const locale = i18n.language === 'ru' ? ru : enUS;

  const handleStopTunnel = async (id: string) => {
    try {
      await stopTcpTunnel(id);
    } catch (error) {
      console.error('Failed to stop tunnel:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('nav.activeConnections')}</h1>
          <p className="text-gray-400 text-sm">{t('tunnels.manageActiveTunnels')}</p>
        </div>
      </div>

      {/* Tunnels List */}
      {tunnels.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Network size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tunnels.noActiveConnections')}</h3>
            <p className="text-gray-400 mb-6">
              {t('tunnels.noActiveConnectionsDesc')}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tunnels.map((tunnel) => (
            <div 
              key={tunnel.id}
              className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{tunnel.hostname}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      Active
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-xs font-bold text-gray-500">Local Port</span>
                      <code className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">{tunnel.localPort}</code>
                      <button 
                        onClick={() => copyToClipboard(tunnel.localPort?.toString() || '')}
                        className="hover:text-white transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-xs font-bold text-gray-500">PID</span>
                      <code className="font-mono">{tunnel.pid}</code>
                    </div>
                    <span>Started {formatDistanceToNow(new Date(tunnel.createdAt), { addSuffix: true, locale })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStopTunnel(tunnel.id)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-orange-400 hover:text-orange-300"
                    title="Stop Tunnel"
                  >
                    <Square size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
