import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  Server, 
  Network, 
  Clock, 
  Star, 
  Settings,
  Plus,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import NavItem from "./NavItem";
import { useStore } from "../../store";

export default function Sidebar() {
  const { t } = useTranslation();
  const { 
    activeTab, 
    setActiveTab,
    services_by_server_by_company,
    expanded_companies,
    handleExpandedCompaniesChange,
    tunnels
  } = useStore();
  
  const toggleCompany = (companyId: string) => {
    const newExpanded = expanded_companies.includes(companyId)
      ? expanded_companies.filter(id => id !== companyId)
      : [...expanded_companies, companyId];
    handleExpandedCompaniesChange(newExpanded);
  };

  const activeTunnelsCount = tunnels.filter(t => t.status === 'active').length;

  return (
    <aside className="flex flex-col h-full bg-[#0e0e10] rounded-3xl border border-white/5 overflow-hidden">
      {/* Main Navigation */}
      <div className="p-4 space-y-1">
        <NavItem 
          icon={<LayoutDashboard size={18} />} 
          label={t('nav.dashboard')} 
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        />
        <NavItem 
          icon={<Network size={18} />} 
          label={t('nav.activeConnections')} 
          active={activeTab === 'active-connections'}
          onClick={() => setActiveTab('active-connections')}
          badge={activeTunnelsCount > 0 ? activeTunnelsCount : undefined}
        />
        <NavItem 
          icon={<Server size={18} />} 
          label={t('nav.servers')} 
          active={activeTab === 'servers'}
          onClick={() => setActiveTab('servers')}
        />
      </div>

      <div className="h-px bg-white/5 mx-4 my-2" />

      {/* Quick Access */}
      <div className="p-4 space-y-1">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
          {t('common.info')}
        </div>
        <NavItem 
          icon={<Clock size={18} />} 
          label={t('nav.recent')} 
          active={activeTab === 'recent'}
          onClick={() => setActiveTab('recent')}
        />
        <NavItem 
          icon={<Star size={18} />} 
          label={t('nav.favorites')} 
          active={activeTab === 'favorites'}
          onClick={() => setActiveTab('favorites')}
        />
      </div>

      <div className="h-px bg-white/5 mx-4 my-2" />

      {/* Server Groups */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="flex items-center justify-between px-3 mb-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t('nav.servers')}
          </div>
          <button className="p-1 hover:bg-white/10 rounded transition-colors">
            <Plus size={14} className="text-gray-400" />
          </button>
        </div>

        {/* Server Groups from real data */}
        <div className="space-y-1">
          {services_by_server_by_company.map((company) => (
            <div key={company.id}>
              <div 
                className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white cursor-pointer transition-colors"
                onClick={() => toggleCompany(company.id)}
              >
                {expanded_companies.includes(company.id) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <span className="text-sm font-medium">{company.name}</span>
              </div>
              
              {expanded_companies.includes(company.id) && (
                <div className="pl-4 space-y-1">
                  {company.servers.map((server) => (
                    <div 
                      key={server.id}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      {server.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings at bottom */}
      <div className="p-4 mt-auto border-t border-white/5">
        <NavItem 
          icon={<Settings size={18} />} 
          label={t('nav.settings')} 
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
        />
      </div>
    </aside>
  );
}
