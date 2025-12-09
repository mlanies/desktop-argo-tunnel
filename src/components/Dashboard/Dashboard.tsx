import { useTranslation } from "react-i18next";
import { 
  Server, 
  Activity, 
  
  Plus, 
  Terminal, 
  Monitor,
  ArrowRight,
  CloudOff
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import StatsCard from "./StatsCard";
import Button from "../Button/Button";
import { useStore } from "../../store";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { useState, useMemo, useCallback } from "react";
import AddServerWizard from "../Servers/AddServerWizard";
import Portal from "../Portal";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { 
    services_by_server_by_company, 
    connected_services, 
    recentConnections,
    tunnels,
    setActiveTab
  } = useStore();

  const [showAddServerModal, setShowAddServerModal] = useState(false);

  // Memoize expensive calculations
  const totalServers = useMemo(() => 
    services_by_server_by_company.reduce(
      (acc, company) => acc + company.servers.length, 
      0
    ),
    [services_by_server_by_company]
  );

  const activeConnections = useMemo(() => 
    connected_services.length,
    [connected_services]
  );

  const activeTunnels = useMemo(() => 
    tunnels.filter(t => t.status === 'active').length,
    [tunnels]
  );

  const locale = useMemo(() => 
    i18n.language === 'ru' ? ru : enUS,
    [i18n.language]
  );

  const handleViewLogs = useCallback(() => {
    setActiveTab('active-connections');
  }, [setActiveTab]);

  const handleAddServer = useCallback(() => {
    setShowAddServerModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAddServerModal(false);
  }, []);

  const handleViewAll = useCallback(() => {
    setActiveTab('servers');
  }, [setActiveTab]);

  return (
    <motion.div 
      className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('dashboard.title')}</h1>
          <p className="text-gray-400 text-sm">{t('dashboard.welcome')}</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleViewLogs}
            ariaLabel={t('dashboard.viewLogs')}
          >
            {t('dashboard.viewLogs')}
          </Button>
          <Button 
            cta 
            size="sm"
            onClick={handleAddServer}
            ariaLabel={t('dashboard.addServer')}
          >
            <Plus size={16} className="mr-2" aria-hidden="true" />
            {t('dashboard.addServer')}
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title={t('dashboard.stats.totalServers')}
          value={totalServers}
          icon={<Server size={24} />}
          gradient="primary"
          onClick={() => setActiveTab('servers')}
          index={0}
        />
        <StatsCard
          title={t('dashboard.stats.activeConnections')}
          value={activeConnections}
          icon={<Activity size={24} />}
          gradient="success"
          onClick={() => setActiveTab('active-connections')}
          index={1}
        />
        <StatsCard
          title={t('dashboard.activeTunnels')}
          value={activeTunnels}
          icon={<Activity size={24} className="text-amber-400" />}
          gradient="warning"
          onClick={() => setActiveTab('active-connections')}
          index={2}
        />
      </div>

      {/* Recent Connections */}
      <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">{t('dashboard.recentConnections')}</h2>
          <button 
            onClick={handleViewAll}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            aria-label={t('common.viewAll')}
          >
            <span>{t('common.viewAll')}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {recentConnections.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <CloudOff size={48} className="mb-4 text-gray-600" />
              <p className="text-lg font-medium mb-2">{t('dashboard.noActivity')}</p>
              <p className="text-sm text-gray-600">{t('dashboard.connectToStart', 'Connect to a server to see activity here')}</p>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              className="space-y-3"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              {recentConnections.map((conn, idx) => (
                <motion.div 
                  key={conn.id}
                  variants={itemVariants}
                  custom={idx}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      conn.protocol === 'ssh' ? 'bg-emerald-500/20 text-emerald-400' :
                      conn.protocol === 'rdp' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {conn.protocol === 'ssh' ? <Terminal size={18} /> : 
                       conn.protocol === 'rdp' ? <Monitor size={18} /> : 
                       <Activity size={18} />}
                    </div>
                    <div>
                      <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                        {conn.name}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">{conn.protocol}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(conn.timestamp), { addSuffix: true, locale })}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-gray-600" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Modals */}
      {showAddServerModal && (
        <Portal>
          <AddServerWizard
            onClose={handleCloseModal}
            onSuccess={handleCloseModal}
          />
        </Portal>
      )}
    </motion.div>
  );
}