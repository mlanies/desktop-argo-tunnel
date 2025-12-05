import { Server as ServerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  variant: 'no-servers' | 'select-server';
  onAddServer: () => void;
}

export default function EmptyState({ variant, onAddServer }: EmptyStateProps) {
  const { t } = useTranslation();

  const content = variant === 'no-servers' ? {
    title: t('serverManagement.noServers'),
    description: t('serverManagement.addServerDesc'),
  } : {
    title: t('serverManagement.selectServer'),
    description: t('serverManagement.selectServerDesc'),
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/10 flex items-center justify-center">
          <ServerIcon size={32} className="text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{content.title}</h3>
        <p className="text-gray-400 mb-6">
          {content.description}
        </p>
        <Button
          cta
          onClick={onAddServer}
          ariaLabel={t('serverManagement.addServer')}
        >
          <Plus size={16} className="mr-2" aria-hidden="true" />
          {t('serverManagement.addServer')}
        </Button>
      </div>
    </div>
  );
}
