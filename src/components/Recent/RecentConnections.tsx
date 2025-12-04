import { useTranslation } from "react-i18next";
import { useStore } from "../../store";
import { Clock, Terminal, Monitor, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";

export default function RecentConnections() {
  const { t, i18n } = useTranslation();
  const { recentConnections } = useStore();
  const locale = i18n.language === 'ru' ? ru : enUS;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <Clock size={24} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('nav.recent')}</h1>
          <p className="text-gray-400 text-sm">История подключений</p>
        </div>
      </div>

      {/* Recent Connections List */}
      {recentConnections.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">{t('dashboard.noActivity')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {recentConnections.map((conn) => (
            <div 
              key={conn.id}
              className="glass-card rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    conn.protocol === 'ssh' ? 'bg-green-500/20 text-green-400' :
                    conn.protocol === 'rdp' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {conn.protocol === 'ssh' ? <Terminal size={20} /> : 
                     conn.protocol === 'rdp' ? <Monitor size={20} /> : 
                     <Activity size={20} />}
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
