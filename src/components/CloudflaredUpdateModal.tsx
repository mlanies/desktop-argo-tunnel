import { AlertCircle, Download, X } from "lucide-react";
import Button from "./Button/Button";

interface CloudflaredUpdateModalProps {
  currentVersion: string;
  latestVersion: string;
  onUpdate: () => Promise<void>;
  onClose: () => void;
  isUpdating: boolean;
  activeTunnelsCount: number;
}

export default function CloudflaredUpdateModal({ 
  currentVersion, 
  latestVersion, 
  onUpdate, 
  onClose, 
  isUpdating,
  activeTunnelsCount 
}: CloudflaredUpdateModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in">
      <div className="glass-panel rounded-2xl w-full max-w-lg mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Download size={24} className="text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Cloudflared Update Available</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-gray-300">
            A new version of <code className="bg-white/10 px-2 py-0.5 rounded text-blue-400">cloudflared</code> is available.
          </p>

          <div className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Version:</span>
              <code className="bg-black/30 px-3 py-1 rounded text-sm text-gray-300 font-mono">
                {currentVersion}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Latest Version:</span>
              <code className="bg-black/30 px-3 py-1 rounded text-sm text-green-400 font-mono">
                {latestVersion}
              </code>
            </div>
          </div>

          {activeTunnelsCount > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={20} className="text-orange-400 mt-0.5" />
                <div>
                  <p className="text-sm text-orange-300">
                    <strong>Warning:</strong> You have {activeTunnelsCount} active tunnel{activeTunnelsCount > 1 ? 's' : ''}.
                  </p>
                  <p className="text-sm text-orange-300 mt-1">
                    All active connections will be closed before updating.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> The update will download and install the latest version automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <Button variant="secondary" onClick={onClose} disabled={isUpdating}>
            Skip
          </Button>
          <Button cta onClick={onUpdate} loading={isUpdating} disabled={isUpdating}>
            <Download size={20} className="mr-2" />
            {isUpdating ? 'Updating...' : 'Update Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
