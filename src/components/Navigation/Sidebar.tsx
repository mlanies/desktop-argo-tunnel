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
import { useState } from "react";
import { useStore } from "../../store";
import classNames from "classnames";

export default function Sidebar() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['production']);
  
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

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
          label={t('nav.tunnels')} 
          active={activeTab === 'tunnels'}
          onClick={() => setActiveTab('tunnels')}
          badge={2}
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

        {/* Example Group */}
        <div className="space-y-1">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white cursor-pointer transition-colors"
            onClick={() => toggleGroup('production')}
          >
            {expandedGroups.includes('production') ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            <span className="text-sm font-medium">Production</span>
          </div>
          
          {expandedGroups.includes('production') && (
            <div className="pl-4 space-y-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                web-prod-01
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                db-prod-01
              </div>
            </div>
          )}
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
