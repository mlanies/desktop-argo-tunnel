import { useTranslation } from "react-i18next";
import { useStore } from "../../store";
import { Plus, Play, Square, Trash2, Settings as SettingsIcon, Eye } from "lucide-react";
import Button from "../Button/Button";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { useState, useEffect } from "react";
import TunnelWizard from "./TunnelWizard";
import TunnelLogs from "./TunnelLogs";

export default function TunnelsList() {
  const { t, i18n } = useTranslation();
  const { tunnels, deleteTunnel, startTunnel, stopTunnel, fetchTunnels } = useStore();
  const locale = i18n.language === 'ru' ? ru : enUS;

  const [showWizard, setShowWizard] = useState(false);
  const [selectedTunnelForLogs, setSelectedTunnelForLogs] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchTunnels();
  }, [fetchTunnels]);

  const handleStartTunnel = async (id: string) => {
    try {
      await startTunnel(id);
    } catch (error) {
      console.error('Failed to start tunnel:', error);
      // TODO: Show error notification
    }
  };

  const handleStopTunnel = async (id: string) => {
    try {
      await stopTunnel(id);
    } catch (error) {
      console.error('Failed to stop tunnel:', error);
    }
  };

  const handleDeleteTunnel = async (id: string) => {
    if (confirm('Are you sure you want to delete this tunnel?')) {
      try {
        await deleteTunnel(id);
      } catch (error) {
        console.error('Failed to delete tunnel:', error);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('tunnels.title')}</h1>
          <p className="text-gray-400 text-sm">Manage your Cloudflare Tunnels</p>
        </div>
        <Button cta size="sm" onClick={() => setShowWizard(true)}>
          <Plus size={16} className="mr-2" />
          {t('tunnels.createTunnel')}
        </Button>
      </div>

      {/* Tunnels List */}
      {tunnels.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <SettingsIcon size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tunnels.noTunnels')}</h3>
            <p className="text-gray-400 mb-6">
              Create your first tunnel to start securely exposing your services
            </p>
            <Button cta onClick={() => setShowWizard(true)}>
              <Plus size={16} className="mr-2" />
              {t('tunnels.createTunnel')}
            </Button>
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
                    <h3 className="text-lg font-semibold text-white">{tunnel.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      tunnel.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : tunnel.status === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {tunnel.status === 'active' ? t('tunnels.active') : 
                       tunnel.status === 'error' ? 'Error' : 
                       t('tunnels.inactive')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>ID: {tunnel.id}</span>
                    <span>•</span>
                    <span>Created {formatDistanceToNow(new Date(tunnel.createdAt), { addSuffix: true, locale })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTunnelForLogs({ id: tunnel.id, name: tunnel.name })}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                    title="View Logs"
                  >
                    <Eye size={18} />
                  </button>
                  
                  {tunnel.status === 'active' ? (
                    <button
                      onClick={() => handleStopTunnel(tunnel.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-orange-400 hover:text-orange-300"
                      title="Stop Tunnel"
                    >
                      <Square size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartTunnel(tunnel.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-green-400 hover:text-green-300"
                      title="Start Tunnel"
                    >
                      <Play size={18} />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteTunnel(tunnel.id)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
                    title="Delete Tunnel"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showWizard && <TunnelWizard onClose={() => setShowWizard(false)} />}
      {selectedTunnelForLogs && (
        <TunnelLogs
          tunnelId={selectedTunnelForLogs.id}
          tunnelName={selectedTunnelForLogs.name}
          onClose={() => setSelectedTunnelForLogs(null)}
        />
      )}
    </div>
  );
}
