import { Terminal, Monitor, Network, Server as ServerIcon } from "lucide-react";
import { useStore } from "../../store";
import { useCallback } from "react";

interface ServiceListProps {
  services: any[];
  connectedServices: string[];
}

export default function ServiceList({ services, connectedServices }: ServiceListProps) {
  const getProtocolIcon = useCallback((protocol: string) => {
    switch (protocol.toLowerCase()) {
      case 'ssh':
        return <Terminal size={20} className="text-green-400" aria-hidden="true" />;
      case 'rdp':
        return <Monitor size={20} className="text-blue-400" aria-hidden="true" />;
      case 'tcp':
        return <Network size={20} className="text-purple-400" aria-hidden="true" />;
      default:
        return <ServerIcon size={20} className="text-gray-400" aria-hidden="true" />;
    }
  }, []);

  const handleSelectService = useCallback((serviceId: string) => {
    useStore.getState().setSelectedService(serviceId);
  }, []);

  return (
    <div className="space-y-3">
      {services.map((service: any) => {
        const isConnected = connectedServices.includes(service.id);
        return (
          <button
            key={service.id}
            onClick={() => handleSelectService(service.id)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
            aria-label={`Service ${service.id.slice(0, 8)} - ${service.protocol} - ${isConnected ? 'Connected' : 'Disconnected'}`}
          >
            <div className="flex items-center gap-4">
              {getProtocolIcon(service.protocol)}
              <div>
                <div className="font-medium text-white group-hover:text-blue-400 transition-colors text-left">
                  Service {service.id.slice(0, 8)}
                </div>
                <div className="text-xs text-gray-500 uppercase">{service.protocol}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isConnected
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}
                aria-label={isConnected ? 'Connected' : 'Disconnected'}
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
