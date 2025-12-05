import { Server as ServerIcon, Edit2, Trash2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import ServiceList from "./ServiceList";

interface ServerDetailViewProps {
  server: any;
  connectedServices: string[];
  onEdit: (server: any) => void;
  onDelete: (id: string, name: string) => void;
  onAddService: () => void;
}

export default function ServerDetailView({ 
  server, 
  connectedServices,
  onEdit, 
  onDelete,
  onAddService 
}: ServerDetailViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Server Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500/20">
            <ServerIcon size={24} className="text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{server.name}</h2>
            <p className="text-gray-400 text-sm">
              {server.services.length} {server.services.length === 1 ? t('serverManagement.serviceConfigured') : t('serverManagement.servicesConfigured')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(server)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            aria-label={`${t('common.edit')} ${server.name}`}
          >
            <Edit2 size={18} aria-hidden="true" />
          </button>
          <button
            onClick={() => onDelete(server.id, server.name)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
            aria-label={`${t('common.delete')} ${server.name}`}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Services List */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h3 className="text-lg font-semibold text-white">{t('serverManagement.services')}</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={onAddService}
            className="flex items-center gap-2 shrink-0"
            ariaLabel={t('serverManagement.addService')}
          >
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{t('serverManagement.addService')}</span>
          </Button>
        </div>
        <ServiceList 
          services={server.services} 
          connectedServices={connectedServices}
        />
      </div>
    </div>
  );
}
