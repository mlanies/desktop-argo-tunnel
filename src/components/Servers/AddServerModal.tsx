import { useState, useId } from "react";
import { X } from "lucide-react";
import Button from "../Button/Button";
import { useToast } from "../../hooks/useToast";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { FocusTrap } from "../FocusTrap";

interface AddServerModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    name: string;
    description?: string;
  };
}

export default function AddServerModal({ onClose, onSuccess, initialData }: AddServerModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { t } = useTranslation();
  const titleId = useId();

  const isEditing = !!initialData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error(t('modals.addServer.serverName') + ' ' + t('modals.addServer.required'));
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && initialData) {
        await invoke("update_server", { 
          serverId: initialData.id,
          name: name.trim(), 
          description: description.trim() || null 
        });
        toast.success(`${t('modals.addServer.title')} "${name}" ${t('success.updated')}`);
      } else {
        await invoke("add_server", { 
          name: name.trim(), 
          description: description.trim() || null 
        });
        toast.success(`${t('modals.addServer.title')} "${name}" ${t('success.serverAdded')}`);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save server:", error);
      toast.error(`${t('errors.generic')}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <FocusTrap active onEscape={onClose}>
        <div 
          className="glass-panel rounded-2xl w-full max-w-md mx-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 id={titleId} className="text-2xl font-bold text-white">
              {isEditing ? t('common.edit') : t('modals.addServer.title')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              aria-label={t('common.close') || 'Close'}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="server-name" className="block text-sm font-medium text-gray-300 mb-2">
              {t('modals.addServer.serverName')} <span className="text-red-400">*</span>
            </label>
            <input
              id="server-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('modals.addServer.serverNamePlaceholder')}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              disabled={isLoading}
              autoFocus
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="server-description" className="block text-sm font-medium text-gray-300 mb-2">
              {t('modals.addServer.description')}
            </label>
            <textarea
              id="server-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('modals.addServer.descriptionPlaceholder')}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
              disabled={isLoading}
            />
          </div>

          {!isEditing && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                {t('modals.addServer.note')}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button cta type="submit" disabled={isLoading}>
              {isLoading ? t('common.loading') : (isEditing ? t('common.save') : t('modals.addServer.addButton'))}
            </Button>
          </div>
        </form>
      </div>
    </FocusTrap>
    </div>
  );
}
