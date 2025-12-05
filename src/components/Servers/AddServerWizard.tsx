import { useState, useId, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import Button from "../Button/Button";
import { useToast } from "../../hooks/useToast";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { FocusTrap } from "../FocusTrap";

interface AddServerWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    name: string;
    description?: string;
  };
}

type WizardStep = 'server' | 'tunnels' | 'settings';

interface TunnelConfig {
  protocol: 'ssh' | 'rdp' | 'tcp';
  host: string;
  port: number;
  localPort?: number;
}

export default function AddServerWizard({ onClose, onSuccess, initialData }: AddServerWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('server');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { t } = useTranslation();
  const titleId = useId();

  // Server data
  const [serverName, setServerName] = useState(initialData?.name || "");
  const [serverDescription, setServerDescription] = useState(initialData?.description || "");

  // Tunnel data
  const [tunnels, setTunnels] = useState<TunnelConfig[]>([
    { protocol: 'ssh', host: '', port: 22 }
  ]);

  // Settings data
  const [autoConnect, setAutoConnect] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);

  const isEditing = !!initialData;

  const steps: { id: WizardStep; title: string; description: string }[] = [
    { id: 'server', title: t('tunnels.wizard.serverInfo'), description: t('tunnels.wizard.serverInfoDesc') },
    { id: 'tunnels', title: t('tunnels.wizard.tunnels'), description: t('tunnels.wizard.tunnelsDesc') },
    { id: 'settings', title: t('tunnels.wizard.settings'), description: t('tunnels.wizard.settingsDesc') },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleAddTunnel = useCallback(() => {
    setTunnels([...tunnels, { protocol: 'ssh', host: '', port: 22 }]);
  }, [tunnels]);

  const handleRemoveTunnel = useCallback((index: number) => {
    setTunnels(tunnels.filter((_, i) => i !== index));
  }, [tunnels]);

  const handleTunnelChange = useCallback((index: number, field: keyof TunnelConfig, value: any) => {
    const newTunnels = [...tunnels];
    newTunnels[index] = { ...newTunnels[index], [field]: value };
    setTunnels(newTunnels);
  }, [tunnels]);

  const handleNext = useCallback(() => {
    if (currentStep === 'server' && !serverName.trim()) {
      toast.error(t('tunnels.wizard.serverNameRequired'));
      return;
    }

    if (currentStep === 'tunnels') {
      const hasEmptyHost = tunnels.some(t => !t.host.trim());
      if (hasEmptyHost) {
        toast.error(t('servers.errors.fieldsRequired'));
        return;
      }
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  }, [currentStep, currentStepIndex, serverName, tunnels, steps, toast, t]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  }, [currentStepIndex, steps]);

  const handleSubmit = useCallback(async () => {
    if (!serverName.trim()) {
      toast.error(t('tunnels.wizard.serverNameRequired'));
      return;
    }

    setIsLoading(true);
    try {
      let serverId: string;

      if (isEditing && initialData) {
        await invoke("update_server", { 
          serverId: initialData.id,
          name: serverName.trim(), 
          description: serverDescription.trim() || null 
        });
        serverId = initialData.id;
        toast.success(t('success.serverUpdated'));
      } else {
        serverId = await invoke<string>("add_server", { 
          name: serverName.trim(), 
          description: serverDescription.trim() || null 
        });
        toast.success(t('success.serverAdded'));
      }

      // Add tunnels
      for (const tunnel of tunnels) {
        if (tunnel.host.trim()) {
          await invoke("add_service", {
            serverId,
            protocol: tunnel.protocol,
            host: tunnel.host.trim(),
            port: tunnel.port,
            localPort: tunnel.localPort,
          });
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save server:", error);
      toast.error(`${t('errors.generic')}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [serverName, serverDescription, tunnels, isEditing, initialData, toast, t, onSuccess, onClose]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'server':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="server-name" className="block text-sm font-medium text-gray-300 mb-2">
                {t('modals.addServer.serverName')} <span className="text-red-400">*</span>
              </label>
              <input
                id="server-name"
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
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
                value={serverDescription}
                onChange={(e) => setServerDescription(e.target.value)}
                placeholder={t('modals.addServer.descriptionPlaceholder')}
                rows={3}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                disabled={isLoading}
              />
            </div>
          </div>
        );

      case 'tunnels':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">{t('tunnels.wizard.addTunnelsDesc')}</p>
            
            {tunnels.map((tunnel, index) => (
              <div key={index} className="p-4 bg-white/5 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white">Tunnel {index + 1}</h4>
                  {tunnels.length > 1 && (
                    <button
                      onClick={() => handleRemoveTunnel(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                      aria-label={`Remove tunnel ${index + 1}`}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Protocol</label>
                    <select
                      value={tunnel.protocol}
                      onChange={(e) => handleTunnelChange(index, 'protocol', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="ssh">SSH</option>
                      <option value="rdp">RDP</option>
                      <option value="tcp">TCP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Port</label>
                    <input
                      type="number"
                      value={tunnel.port}
                      onChange={(e) => handleTunnelChange(index, 'port', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Host <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={tunnel.host}
                    onChange={(e) => handleTunnelChange(index, 'host', e.target.value)}
                    placeholder="example.com"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>
            ))}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddTunnel}
              className="w-full"
            >
              + Add Another Tunnel
            </Button>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-white">Auto-connect</h4>
                <p className="text-xs text-gray-400">Connect automatically on startup</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConnect}
                  onChange={(e) => setAutoConnect(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-white">Save credentials</h4>
                <p className="text-xs text-gray-400">Remember login credentials</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCredentials}
                  onChange={(e) => setSaveCredentials(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>
        );
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
          className="glass-panel rounded-2xl w-full max-w-2xl mx-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 id={titleId} className="text-2xl font-bold text-white">
                {isEditing ? t('tunnels.wizard.editServer') : t('tunnels.wizard.addServer')}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              aria-label={t('common.close') || 'Close'}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pt-6">
            <div className="flex items-start justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1 gap-2">
                    <div className="flex items-center w-full">
                      <div className="flex-1" />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors shrink-0 ${
                        index < currentStepIndex 
                          ? 'bg-green-500 text-white' 
                          : index === currentStepIndex
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-600 text-gray-400'
                      }`}>
                        {index < currentStepIndex ? <Check size={16} /> : index + 1}
                      </div>
                      {index < steps.length - 1 ? (
                        <div className={`h-0.5 flex-1 mx-2 ${
                          index < currentStepIndex ? 'bg-green-500' : 'bg-gray-600'
                        }`} />
                      ) : (
                        <div className="flex-1" />
                      )}
                    </div>
                    <span className={`text-xs text-center whitespace-nowrap ${
                      index === currentStepIndex ? 'text-white font-medium' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || isLoading}
              ariaLabel="Previous step"
            >
              <ChevronLeft size={16} className="mr-2" aria-hidden="true" />
              {t('tunnels.wizard.back')}
            </Button>

            <div className="flex gap-3">
              {currentStepIndex < steps.length - 1 ? (
                <Button
                  cta
                  onClick={handleNext}
                  disabled={isLoading}
                  ariaLabel="Next step"
                >
                  {t('tunnels.wizard.next')}
                  <ChevronRight size={16} className="ml-2" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  cta
                  onClick={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading}
                  ariaLabel={isEditing ? 'Update server' : 'Create server'}
                >
                  {isEditing ? t('tunnels.wizard.update') : t('tunnels.wizard.create')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
