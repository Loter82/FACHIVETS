import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { CustomersListPage } from '@/features/customers/CustomersListPage';
import { CustomerProfilePage } from '@/features/customers/CustomerProfilePage';
import { StockPage } from '@/features/stock/StockPage';
import { SettingsSourcesPage } from '@/features/data-sources/SettingsSourcesPage';
import { SchemaInspectorPage } from '@/features/data-sources/SchemaInspectorPage';
import { SyncPage } from '@/features/sync/SyncPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { PlatformLayout } from '@/features/platform/PlatformLayout';
import { RequirePlatformAdmin } from '@/features/platform/RequirePlatformAdmin';
import { PlatformOverviewPage } from '@/features/platform/pages/PlatformOverviewPage';
import { PlatformTenantsPage } from '@/features/platform/pages/PlatformTenantsPage';
import { PlatformUsersPage } from '@/features/platform/pages/PlatformUsersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Платформ-адмінка — окрема гілка з власним лейаутом */}
      <Route
        path="/platform"
        element={
          <RequireAuth>
            <RequirePlatformAdmin>
              <PlatformLayout />
            </RequirePlatformAdmin>
          </RequireAuth>
        }
      >
        <Route index element={<PlatformOverviewPage />} />
        <Route path="tenants" element={<PlatformTenantsPage />} />
        <Route path="users" element={<PlatformUsersPage />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersListPage />} />
        <Route path="customers/:id" element={<CustomerProfilePage />} />
        <Route path="stock" element={<StockPage />} />
        <Route
          path="segments"
          element={<PlaceholderPage title="Сегменти" description="RFM, ABC, ручні фільтри" />}
        />
        <Route
          path="campaigns"
          element={<PlaceholderPage title="Кампанії" description="SMS / Email / Viber / Telegram" />}
        />
        <Route
          path="automation"
          element={<PlaceholderPage title="Автоматизація" description="Правила: тригери і дії" />}
        />
        <Route
          path="analytics"
          element={<PlaceholderPage title="Аналітика" description="Тренди, когорти, LTV" />}
        />
        <Route
          path="tasks"
          element={<PlaceholderPage title="Задачі" description="Канбан і список задач" />}
        />
        <Route
          path="sync"
          element={<SyncPage />}
        />
        <Route path="settings" element={<SettingsSourcesPage />} />
        <Route path="settings/sources" element={<SettingsSourcesPage />} />
        <Route path="settings/sources/:id/schema" element={<SchemaInspectorPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
