import React from 'react';
import { useI18n } from '../lib/i18n';
import { useAppTheme } from '../lib/theme';
import { OfficeSettings } from '../types';
import { ShieldCheck, Moon, Sun, Globe } from 'lucide-react';

interface NavbarProps {
  settings: OfficeSettings | null;
  onRefresh?: () => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ settings, onRefresh, activeView }) => {
  const { lang, setLang, t } = useI18n();
  const { mode, toggleTheme } = useAppTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0F1210]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.office_name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white dark:bg-[#1A1F1C] p-0.5 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1F4A38] dark:bg-[#4A7862] text-white flex items-center justify-center shadow-xs shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
                {settings?.office_name || 'مكتب الأمانة للخدمات'}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                {t('services')} ({t('cleaning_short')} & {t('security_short')})
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 no-print"
              id="btn-lang-toggle"
            >
              <Globe className="w-3.5 h-3.5 text-[#1F4A38] dark:text-[#4A7862]" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors no-print"
              title={mode === 'light' ? t('dark') : t('light')}
              id="btn-theme-toggle"
            >
              {mode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

