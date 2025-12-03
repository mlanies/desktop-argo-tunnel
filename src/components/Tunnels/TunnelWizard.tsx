import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useStore } from "../../store";
import { X, Check, ArrowRight, ArrowLeft } from "lucide-react";
import Button from "../Button/Button";

interface TunnelWizardProps {
  onClose: () => void;
}

export default function TunnelWizard({ onClose }: TunnelWizardProps) {
  const { t } = useTranslation();
  const { createTunnel } = useStore();
  const [step, setStep] = useState(1);
  const [tunnelName, setTunnelName] = useState("");
  const [hostname, setHostname] = useState("");
  const [service, setService] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!tunnelName) return;

    setIsCreating(true);
    try {
      await createTunnel(tunnelName);
      // TODO: Configure ingress rules via backend
      // await configureTunnel(tunnelName, hostname, service);
      onClose();
    } catch (error) {
      console.error('Failed to create tunnel:', error);
      // TODO: Show error
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return tunnelName.length > 0;
      case 2:
        return hostname.length > 0 && service.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-panel rounded-2xl w-full max-w-2xl mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{t('tunnels.wizard.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                s === step ? 'bg-blue-500 text-white' :
                s < step ? 'bg-green-500 text-white' :
                'bg-white/10 text-gray-500'
              }`}>
                {s < step ? <Check size={16} /> : s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  s < step ? 'bg-green-500' : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Tunnel Configuration</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Choose a name for your tunnel. This will be used to identify it in the dashboard.
                </p>
              </div>
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('tunnels.wizard.tunnelName')}
                </label>
                <input
                  type="text"
                  value={tunnelName}
                  onChange={(e) => setTunnelName(e.target.value)}
                  placeholder={t('tunnels.wizard.tunnelNamePlaceholder')}
                  className="input w-full"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Routing Configuration</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Configure how traffic should be routed through your tunnel.
                </p>
              </div>
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('tunnels.wizard.hostname')}
                </label>
                <input
                  type="text"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="app.example.com"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('tunnels.wizard.service')}
                </label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="input w-full"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Review & Create</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Review your tunnel configuration before creating it.
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Tunnel Name</span>
                  <span className="text-white font-medium">{tunnelName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Hostname</span>
                  <span className="text-white font-mono text-sm">{hostname || 'Not configured'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Service</span>
                  <span className="text-white font-mono text-sm">{service || 'Not configured'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <Button
            variant="secondary"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          >
            <ArrowLeft size={16} className="mr-2" />
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          
          {step < 3 ? (
            <Button
              cta
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button
              cta
              onClick={handleCreate}
              disabled={isCreating}
            >
              <Check size={16} className="mr-2" />
              {isCreating ? 'Creating...' : t('tunnels.wizard.create')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
