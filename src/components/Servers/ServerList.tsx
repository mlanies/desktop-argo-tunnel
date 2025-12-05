import { Server as ServerIcon } from "lucide-react";
import { useStore } from "../../store";
import { useMemo, useCallback } from "react";

interface ServerListProps {
  companies: any[];
  selectedServerId: string | null;
}

export default function ServerList({ companies, selectedServerId }: ServerListProps) {
  const hasServers = useMemo(() => 
    companies.length > 0 && companies.some((c: any) => c.servers.length > 0),
    [companies]
  );

  const handleSelectServer = useCallback((serverId: string) => {
    useStore.getState().setSelectedServer(serverId);
    useStore.getState().setSelectedService(null);
  }, []);

  if (!hasServers) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <ServerIcon size={24} className="text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No servers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
      {companies.map((company: any) => (
        <div key={company.id}>
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 mb-2">
            {company.name}
          </div>
          <div className="space-y-1">
            {company.servers.map((server: any) => (
              <button
                key={server.id}
                onClick={() => handleSelectServer(server.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  selectedServerId === server.id
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
                aria-label={`Select server ${server.name}`}
                aria-pressed={selectedServerId === server.id}
              >
                <div className="flex items-center gap-3">
                  <ServerIcon 
                    size={16} 
                    className={selectedServerId === server.id ? 'text-blue-400' : 'text-gray-500'} 
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{server.name}</div>
                    <div className="text-[10px] text-gray-600 truncate">
                      {server.services.length} {server.services.length === 1 ? 'service' : 'services'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
