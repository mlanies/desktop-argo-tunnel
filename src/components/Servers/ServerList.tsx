import { Server as ServerIcon, ServerOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../store";
import { useMemo, useCallback } from "react";

interface ServerListProps {
  companies: any[];
  selectedServerId: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

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
      <motion.div 
        className="flex-1 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center">
          <ServerOff size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No servers</p>
          <p className="text-xs text-gray-600 mt-1">Add a server to get started</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex-1 overflow-y-auto custom-scrollbar space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {companies.map((company: any) => (
          <motion.div key={company.id} variants={itemVariants}>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
              {company.name}
            </div>
            <div className="space-y-1">
              {company.servers.map((server: any, idx: number) => (
                <motion.button
                  key={server.id}
                  onClick={() => handleSelectServer(server.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    selectedServerId === server.id
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                  aria-label={`Select server ${server.name}`}
                  aria-pressed={selectedServerId === server.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <ServerIcon 
                      size={16} 
                      className={selectedServerId === server.id ? 'text-emerald-400' : 'text-gray-500'} 
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{server.name}</div>
                      <div className="text-[10px] text-gray-600 truncate">
                        {server.services.length} {server.services.length === 1 ? 'service' : 'services'}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}