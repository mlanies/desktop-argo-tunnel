import classNames from "classnames";
import Logo from "../Logo";
import Button from "../Button/Button";
import Icon from "../Icon/Icon";
import { useMemo, useState } from "react";
import { FiMinus, FiX, FiGlobe } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  className?: string;
  back?: React.ReactElement | string | number;
  title?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'minimal' | 'transparent';
}

export default function Header({
  className,
  back,
  title,
  actions,
  variant = 'default',
}: HeaderProps) {
  const { i18n } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) || 
           /Mac/.test(navigator.userAgent);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setShowLangMenu(false);
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const appWindow = getCurrentWebviewWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const appWindow = getCurrentWebviewWindow();
      if (isMac) {
        await appWindow.hide();
      } else {
        await appWindow.close();
      }
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  const variantClasses = {
    minimal: 'bg-transparent',
    transparent: 'bg-transparent',
  };

  const windowControls = isMac ? (
    <div className="flex items-center gap-2 relative z-20" data-tauri-drag-region="none">
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="p-1.5 rounded hover:bg-red-500/80 transition-colors"
        title="Close"
        data-tauri-drag-region="none"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiX size={12} className="text-white" />
      </motion.button>
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          handleMinimize();
        }}
        className="p-1.5 rounded hover:bg-emerald-500/20 transition-colors"
        title="Minimize"
        data-tauri-drag-region="none"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiMinus size={12} className="text-gray-300" />
      </motion.button>
    </div>
  ) : (
    <div className="flex items-center gap-2 relative z-20" data-tauri-drag-region="none">
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="p-1.5 rounded hover:bg-red-500/80 transition-colors"
        title="Close"
        data-tauri-drag-region="none"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiX size={12} className="text-white" />
      </motion.button>
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          handleMinimize();
        }}
        className="p-1.5 rounded hover:bg-emerald-500/20 transition-colors"
        title="Minimize"
        data-tauri-drag-region="none"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiMinus size={12} className="text-gray-300" />
      </motion.button>
    </div>
  );

  return (
    <motion.header
      className={classNames(
        "flex items-center justify-between px-6 py-4 transition-all duration-200 z-50 relative",
        variant === 'default' ? '' : variantClasses[variant],
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Draggable overlay */}
      <div 
        className="absolute inset-0 cursor-move"
        data-tauri-drag-region
      />

      {/* Левая часть */}
      <div className="flex items-center gap-4 relative z-10" data-tauri-drag-region="none">
        {isMac && windowControls}
        
        {back && (
          <div className="flex items-center gap-2" data-tauri-drag-region="none">
            {typeof back === 'string' || typeof back === 'number' ? (
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-tauri-drag-region="none">
                <Icon name="arrow" className="w-4 h-4 mr-1" />
                {back}
              </Button>
            ) : (
              back
            )}
          </div>
        )}
      </div>

      {/* Центральная часть */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-4">
          <Logo size="md" variant="minimal" />
          {title && (
            <h1 className="text-lg font-semibold text-white opacity-40">{title}</h1>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 relative z-10" data-tauri-drag-region="none">
        {actions}
        
        {/* Language Selector */}
        <div className="relative">
          <motion.button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-1.5 rounded hover:bg-emerald-500/20 transition-colors"
            title="Language / Язык"
            data-tauri-drag-region="none"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiGlobe size={14} className="text-gray-300" />
          </motion.button>
          
          <AnimatePresence>
            {showLangMenu && (
              <motion.div 
                className="absolute right-0 top-full mt-2 bg-[#0a100e] border border-emerald-500/20 rounded-lg shadow-xl overflow-hidden min-w-[120px] z-50"
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => changeLanguage('en')}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-emerald-500/10 transition-colors ${
                    i18n.language === 'en' ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-300'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => changeLanguage('ru')}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-emerald-500/10 transition-colors ${
                    i18n.language === 'ru' ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-300'
                  }`}
                >
                  Русский
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {!isMac && windowControls}
      </div>
    </motion.header>
  );
}