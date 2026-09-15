import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Client, Employee, DashboardData, OfficeSettings } from './types';
import {
  getDashboard,
  getSettings,
  listClients,
  listEmployees,
  createClient,
  updateClient,
  deleteClient,
  archiveClient,
  renewClient,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  archiveEmployee,
} from './lib/api';
import { I18nProvider, useI18n } from './lib/i18n';
import { ThemeProvider } from './lib/theme';
import { Navbar } from './components/Navbar';
import { TabsNav, ActiveTab } from './components/TabsNav';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { EmployeesView } from './components/EmployeesView';
import { StatementView } from './components/StatementView';
import { ArchiveView } from './components/ArchiveView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

const MainApp: React.FC = () => {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [settings, setSettings] = useState<OfficeSettings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Statement View Target
  const [statementTarget, setStatementTarget] = useState<{
    type: 'client' | 'employee';
    entity: Client | Employee;
  } | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [d, s, c, e] = await Promise.all([
        getDashboard(),
        getSettings(),
        listClients({ archived: false }),
        listEmployees({ archived: false }),
      ]);
      setDashboard(d);
      setSettings(s);
      setClients(c);
      setEmployees(e);
    } catch (err) {
      console.error('Error fetching office data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Client Operations
  const handleAddClient = async (data: Partial<Client>) => {
    await createClient(data);
    await fetchAllData();
  };

  const handleUpdateClient = async (id: string, data: Partial<Client>) => {
    await updateClient(id, data);
    await fetchAllData();
  };

  const handleDeleteClient = async (id: string) => {
    await deleteClient(id);
    await fetchAllData();
  };

  const handleArchiveClient = async (id: string, archived: boolean) => {
    await archiveClient(id, archived);
    await fetchAllData();
  };

  const handleRenewClient = async (id: string, months: number) => {
    await renewClient(id, months);
    await fetchAllData();
  };

  // Employee Operations
  const handleAddEmployee = async (data: Partial<Employee>) => {
    await createEmployee(data);
    await fetchAllData();
  };

  const handleUpdateEmployee = async (id: string, data: Partial<Employee>) => {
    await updateEmployee(id, data);
    await fetchAllData();
  };

  const handleDeleteEmployee = async (id: string) => {
    await deleteEmployee(id);
    await fetchAllData();
  };

  const handleArchiveEmployee = async (id: string, archived: boolean) => {
    await archiveEmployee(id, archived);
    await fetchAllData();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0C0F0D] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Bar */}
      <Navbar settings={settings} onRefresh={fetchAllData} activeView={activeTab} />

      {/* Tabs Navigation */}
      <TabsNav
        currentTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setStatementTarget(null);
        }}
        expiringCount={dashboard?.expiring?.length || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {statementTarget ? (
          <StatementView
            entityType={statementTarget.type}
            entity={statementTarget.entity}
            settings={settings}
            onBack={() => setStatementTarget(null)}
          />
        ) : activeTab === 'dashboard' ? (
          <DashboardView
            data={dashboard}
            settings={settings}
            onRenewClient={async (client) => {
              await handleRenewClient(client.id, 12);
            }}
            onViewStatement={(client) => {
              setStatementTarget({ type: 'client', entity: client });
            }}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
            }}
            onAddClient={() => {
              setActiveTab('clients');
            }}
            onAddEmployee={() => {
              setActiveTab('employees');
            }}
          />
        ) : activeTab === 'clients' ? (
          <ClientsView
            clients={clients}
            settings={settings}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onArchiveClient={handleArchiveClient}
            onRenewClient={handleRenewClient}
            onViewStatement={(client) => {
              setStatementTarget({ type: 'client', entity: client });
            }}
          />
        ) : activeTab === 'employees' ? (
          <EmployeesView
            employees={employees}
            settings={settings}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onArchiveEmployee={handleArchiveEmployee}
            onViewStatement={(emp) => {
              setStatementTarget({ type: 'employee', entity: emp });
            }}
          />
        ) : activeTab === 'reports' ? (
          <ReportsView
            dashboard={dashboard}
            clients={clients}
            employees={employees}
            settings={settings}
          />
        ) : activeTab === 'archive' ? (
          <ArchiveView settings={settings} onRefreshData={fetchAllData} />
        ) : activeTab === 'settings' ? (
          <SettingsView
            settings={settings}
            onUpdateSettings={(s) => setSettings(s)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onDataReset={fetchAllData}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 no-print transition-colors bg-white/50 dark:bg-[#111613]/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-start">
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center sm:justify-start gap-2">
              {settings?.logo_url && (
                <img
                  src={settings.logo_url}
                  alt={settings.office_name}
                  className="w-5 h-5 rounded object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              )}
              <span>{settings?.office_name || 'مكتب الأمانة للخدمات'}</span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {t('system_rights')}
              </span>
            </div>
            <p className="text-[11px] mt-1 text-slate-400">
              {settings?.address} • {settings?.phone}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <MainApp />
      </I18nProvider>
    </ThemeProvider>
  );
}
