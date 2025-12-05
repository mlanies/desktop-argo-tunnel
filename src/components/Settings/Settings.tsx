import { useTranslation } from "react-i18next";
import { useStore } from "../../store";
import { Globe, Palette, Zap, Terminal, Network } from "lucide-react";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useStore();

  const handleLanguageChange = (lang: 'en' | 'ru') => {
    i18n.changeLanguage(lang);
    updateSettings({ language: lang });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">{t('settings.title')}</h1>
        <p className="text-gray-400 text-sm">{t('settings.description')}</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* General Settings */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Zap size={20} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">{t('settings.general')}</h2>
          </div>

          <div className="space-y-4">
            {/* Language */}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-gray-400" />
                <div>
                  <div className="text-white font-medium">{t('settings.language')}</div>
                  <div className="text-sm text-gray-500">{t('settings.languageDesc')}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.language === 'en'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageChange('ru')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.language === 'ru'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Русский
                </button>
              </div>
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Palette size={18} className="text-gray-400" />
                <div>
                  <div className="text-white font-medium">{t('settings.theme')}</div>
                  <div className="text-sm text-gray-500">{t('settings.themeDesc')}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.theme === 'dark'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {t('settings.themeDark')}
                </button>
                <button
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.theme === 'light'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {t('settings.themeLight')}
                </button>
                <button
                  onClick={() => updateSettings({ theme: 'system' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.theme === 'system'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {t('settings.themeSystem')}
                </button>
              </div>
            </div>

            {/* Auto Connect */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Network size={18} className="text-gray-400" />
                <div>
                  <div className="text-white font-medium">{t('settings.autoConnect')}</div>
                  <div className="text-sm text-gray-500">{t('settings.autoConnectDesc')}</div>
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.autoConnect}
                  onChange={(e) => updateSettings({ autoConnect: e.target.checked })}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Cloudflared Settings */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Terminal size={20} className="text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">{t('settings.cloudflared')}</h2>
          </div>

          <div className="space-y-4">
            {/* Binary Path */}
            <div className="py-3 border-b border-white/5">
              <label className="block text-white font-medium mb-2">{t('settings.binaryPath')}</label>
              <input
                type="text"
                value={settings.cloudflaredPath || ''}
                onChange={(e) => updateSettings({ cloudflaredPath: e.target.value })}
                placeholder="/usr/local/bin/cloudflared"
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('settings.binaryPathDesc')}
              </p>
            </div>

            {/* Log Level */}
            <div className="py-3">
              <label className="block text-white font-medium mb-3">{t('settings.logLevel')}</label>
              <div className="grid grid-cols-4 gap-2">
                {(['debug', 'info', 'warn', 'error'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => updateSettings({ logLevel: level })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      settings.logLevel === level
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">About</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Version</span>
              <span className="text-white font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Build</span>
              <span className="text-white font-mono">2024.12.03</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform</span>
              <span className="text-white">{navigator.platform}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
