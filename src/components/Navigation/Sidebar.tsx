import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  Server, 
  Network, 
  Clock, 
  Star, 
  Settings
} from "lucide-react";
import NavItem from "./NavItem";
import { useStore } from "../../store";

export default function Sidebar() {
  const { t } = useTranslation();
  const { 
    activeTab, 
    setActiveTab,
    tunnels
  } = useStore();

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
