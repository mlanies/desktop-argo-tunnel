import { useState } from "react";
import { X } from "lucide-react";
import Button from "../Button/Button";
import { useToast } from "../../hooks/useToast";
import { invoke } from "@tauri-apps/api/core";

interface AddServiceModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddServiceModal({ serverId, serverName, onClose, onSuccess }: AddServiceModalProps) {
  const [protocol, setProtocol] = useState<"ssh" | "rdp" | "tcp">("ssh");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const defaultPorts = {
    ssh: "22",
    rdp: "3389",
    tcp: "8080",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!host.trim()) {
      toast.error("Host is required");
      return;
    }

    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error("Port must be between 1 and 65535");
      return;
    }

    setIsLoading(true);
    try {
      await invoke("add_service", { 
        serverId, 
        protocol: protocol.toUpperCase(),
        host: host.trim(),
        port: portNum
      });
      toast.success(`${protocol.toUpperCase()} service added successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to add service:", error);
      toast.error(`Failed to add service: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in">
      <div className="glass-panel rounded-2xl w-full max-w-md mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Add Service</h2>
            <p className="text-sm text-gray-400 mt-1">to {serverName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Protocol <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["ssh", "rdp", "tcp"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setProtocol(p);
                    setPort(defaultPorts[p]);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium uppercase transition-colors ${
                    protocol === p
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                  }`}
                  disabled={isLoading}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Host <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="example.com or 192.168.1.100"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Port <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder={defaultPorts[protocol]}
              min="1"
              max="65535"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button cta type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Service"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
