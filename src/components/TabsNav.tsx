import React from 'react';
import { useI18n } from '../lib/i18n';
import { LayoutDashboard, Users, UserCheck, Settings, Archive, BarChart3 } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'clients' | 'employees' | 'settings' | 'archive' | 'reports';

interface TabsNavProps {
  currentTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  expiringCount?: number;
}

export const TabsNav: React.FC<TabsNavProps> = ({ currentTab, onChangeTab, expiringCount = 0 }) => {
  const { t } = useI18n();

  const mainTabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'clients', label: t('clients'), icon: <Users className="w-4 h-4" />, badge: expiringCount > 0 ? expiringCount : undefined },
    { id: 'employees', label: t('employees'), icon: <UserCheck className="w-4 h-4" /> },
    { id: 'reports', label: t('reports'), icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'archive', label: t('archive'), icon: <Archive className="w-4 h-4" /> },
    { id: 'settings', label: t('settings'), icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white dark:bg-[#0F1210] border-b border-slate-200 dark:border-slate-800 sticky top-16 z-20 transition-colors no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-2 rtl:space-x-reverse py-2.5 overflow-x-auto no-scrollbar" aria-label="Tabs">
          {mainTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 relative ${
                  isActive
                    ? 'bg-[#1F4A38] text-white shadow-sm dark:bg-[#4A7862]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isActive
                        ? 'bg-amber-400 text-slate-900'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
