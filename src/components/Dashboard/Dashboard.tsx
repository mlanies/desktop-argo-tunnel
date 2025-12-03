import { useTranslation } from "react-i18next";
import { 
  Server, 
  Activity, 
  Clock, 
  Plus, 
  Terminal, 
  Monitor,
  ArrowRight
} from "lucide-react";
import StatsCard from "./StatsCard";
import Button from "../Button/Button";
import { useStore } from "../../store";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { 
    services_by_server_by_company, 
    connected_services, 
    recentConnections,
    tunnels 
  } = useStore();

  // Calculate real statistics
  const totalServers = services_by_server_by_company.reduce(
    (acc, company) => acc + company.servers.length, 
    0
  );
  const activeConnections = connected_services.length;
  const activeTunnels = tunnels.filter(t => t.status === 'active').length;

  const locale = i18n.language === 'ru' ? ru : enUS;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('dashboard.title')}</h1>
          <p className="text-gray-400 text-sm">Welcome back, here's what's happening</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm">
            {t('dashboard.viewLogs')}
          </Button>
          <Button cta size="sm">
            <Plus size={16} className="mr-2" />
            {t('dashboard.createTunnel')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title={t('dashboard.stats.totalServers')}
          value={totalServers}
          icon={<Server size={24} />}
          gradient="primary"
        />
        <StatsCard
          title={t('dashboard.stats.activeConnections')}
          value={activeConnections}
          icon={<Activity size={24} />}
          gradient="success"
        />
        <StatsCard
          title="Active Tunnels"
          value={activeTunnels}
          icon={<Clock size={24} />}
          gradient="warning"
        />
      </div>

      {/* Recent Connections */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">{t('dashboard.recentConnections')}</h2>
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
            View all <ArrowRight size={14} />
          </button>
        </div>

        {recentConnections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('dashboard.noActivity')}
          </div>
        ) : (
          <div className="space-y-3">
            {recentConnections.map((conn) => (
              <div 
                key={conn.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    conn.protocol === 'ssh' ? 'bg-green-500/20 text-green-400' :
                    conn.protocol === 'rdp' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {conn.protocol === 'ssh' ? <Terminal size={18} /> : 
                     conn.protocol === 'rdp' ? <Monitor size={18} /> : 
                     <Activity size={18} />}
                  </div>
                  <div>
                    <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {conn.name}
                    </div>
                    <div className="text-xs text-gray-500 uppercase">{conn.protocol}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(conn.timestamp), { addSuffix: true, locale })}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
