import { X, AlertCircle, Download } from "lucide-react";
import Button from "./Button/Button";

interface CloudflaredCheckModalProps {
  onRetry: () => void;
  onClose: () => void;
}

export default function CloudflaredCheckModal({ onRetry, onClose }: CloudflaredCheckModalProps) {

  const installInstructions = {
    macos: {
      title: "macOS",
      command: "brew install cloudflared",
      link: "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    },
    windows: {
      title: "Windows",
      command: "winget install Cloudflare.cloudflared",
      link: "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    },
    linux: {
      title: "Linux",
      command: "wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared-linux-amd64.deb",
      link: "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    },
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in">
      <div className="glass-panel rounded-2xl w-full max-w-2xl mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <AlertCircle size={24} className="text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Cloudflared Not Found</h2>
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
            This application requires <code className="bg-white/10 px-2 py-0.5 rounded text-blue-400">cloudflared</code> to be installed on your system.
            Please install it using one of the methods below:
          </p>

          {/* Installation Instructions */}
          <div className="space-y-4">
            {Object.entries(installInstructions).map(([os, { title, command, link }]) => (
              <div key={os} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{title}</h3>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    <Download size={14} />
                    Download
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 px-3 py-2 rounded text-sm text-gray-300 font-mono overflow-x-auto">
                    {command}
                  </code>
                  <button
                    onClick={() => copyToClipboard(command)}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> After installation, you may need to restart this application or click "Retry" below.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <Button variant="secondary" onClick={onClose}>
            Continue Anyway
          </Button>
          <Button cta onClick={onRetry}>
            Retry Check
          </Button>
        </div>
      </div>
    </div>
  );
}
