import { useTranslation } from "react-i18next";
import { useStore } from "../../store";
import { Star, Terminal, Monitor, Activity, Trash2 } from "lucide-react";

export default function Favorites() {
  const { t } = useTranslation();
  const { services_by_server_by_company, favorites, toggleFavorite } = useStore();

  // Get all favorite services
  const favoriteServices = services_by_server_by_company
    .flatMap(company => 
      company.servers.flatMap(server => 
        server.services
          .filter(service => favorites.includes(service.id))
          .map(service => ({
            ...service,
            serverName: server.name,
            companyName: company.name
          }))
      )
    );

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-yellow-500/20">
          <Star size={24} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('nav.favorites')}</h1>
          <p className="text-gray-400 text-sm">Избранные подключения</p>
        </div>
      </div>

      {/* Favorites List */}
      {favoriteServices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Star size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">Нет избранных подключений</p>
            <p className="text-gray-600 text-sm mt-2">Добавьте сервисы в избранное для быстрого доступа</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {favoriteServices.map((service) => (
            <div 
              key={service.id}
              className="glass-card rounded-xl p-4 hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    service.protocol === 'SSH' ? 'bg-green-500/20 text-green-400' :
                    service.protocol === 'RDP' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {service.protocol === 'SSH' ? <Terminal size={20} /> : 
                     service.protocol === 'RDP' ? <Monitor size={20} /> : 
                     <Activity size={20} />}
                  </div>
                  <div>
                    <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {service.serverName}
                    </div>
                    <div className="text-sm text-gray-400">{service.companyName}</div>
                    <div className="text-xs text-gray-500 uppercase mt-1">{service.protocol}</div>
                  </div>
                </div>

                <button
                  onClick={() => toggleFavorite(service.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-yellow-400 hover:text-red-400 transition-colors"
                  title="Удалить из избранного"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
