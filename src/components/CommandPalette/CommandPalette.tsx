import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { useStore } from "../../store";
import { 
  Search, 
  Server, 
  Clock, 
  Folder, 
  Plus, 
  Settings as SettingsIcon,
  Command
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const { 
    services_by_server_by_company, 
    recentConnections,
    setActiveTab,
    setSelectedService 
  } = useStore();
  
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // All servers for search
  const allServers = services_by_server_by_company.flatMap(company => 
    company.servers.map(server => ({
      id: server.id,
      name: server.name,
      type: 'server' as const,
      company: company.name,
      action: () => {
        setActiveTab('servers');
        onClose();
      }
    }))
  );

  // Recent items
  const recentItems = recentConnections.slice(0, 5).map(conn => ({
    id: conn.id,
    name: conn.name,
    type: 'recent' as const,
    timestamp: conn.timestamp,
    action: () => {
      setSelectedService(conn.serviceId);
      setActiveTab('servers');
      onClose();
    }
  }));

  // Actions
  const actions = [
    {
      id: 'add-server',
      name: t('common.addServer'),
      type: 'action' as const,
      action: () => {
        setActiveTab('servers');
        onClose();
      }
    },
    {
      id: 'manage-connections',
      name: 'Manage Connections',
      type: 'action' as const,
      action: () => {
        setActiveTab('settings');
        onClose();
      }
    }
  ];

  // Filter items based on search
  const filteredServers = allServers.filter(item =>
    (item.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const allItems = search 
    ? filteredServers 
    : [...filteredServers.slice(0, 3), ...recentItems, ...actions];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % allItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + allItems.length) % allItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (allItems[selectedIndex]) {
            allItems[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allItems, onClose]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'server':
        return <Server size={18} />;
      case 'recent':
        return <Clock size={18} />;
      case 'action':
        return <Plus size={18} />;
      default:
        return <Folder size={18} />;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[20vh] z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl mx-4 rounded-2xl overflow-hidden animate-scale-in"
        style={{
          background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 60px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search servers..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg"
          />
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 text-xs text-gray-400">
            <Command size={12} />
            <span>K</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {!search && filteredServers.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                SERVERS
              </div>
              {filteredServers.slice(0, 3).map((item, index) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    selectedIndex === index
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="text-gray-400">{getIcon(item.type)}</div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium">{item.name}</div>
                    {item.type === 'server' && (
                      <div className="text-xs text-gray-500">{item.company}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-xs text-gray-400">
                    <Command size={10} />
                    <span>K</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!search && recentItems.length > 0 && (
            <div className="p-2 border-t border-white/5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                RECENT
              </div>
              {recentItems.map((item, index) => {
                const actualIndex = filteredServers.slice(0, 3).length + index;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      selectedIndex === actualIndex
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="text-gray-400">{getIcon(item.type)}</div>
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!search && actions.length > 0 && (
            <div className="p-2 border-t border-white/5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                ACTIONS
              </div>
              {actions.map((item, index) => {
                const actualIndex = filteredServers.slice(0, 3).length + recentItems.length + index;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      selectedIndex === actualIndex
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="text-gray-400">
                      {item.id === 'add-server' ? <Plus size={18} /> : <SettingsIcon size={18} />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">{item.name}</div>
                    </div>
                    <div className="text-xs text-gray-500">Enter</div>
                  </button>
                );
              })}
            </div>
          )}

          {search && filteredServers.length > 0 && (
            <div className="p-2">
              {filteredServers.map((item, index) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    selectedIndex === index
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="text-gray-400">{getIcon(item.type)}</div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.company}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {search && filteredServers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No results found for "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
