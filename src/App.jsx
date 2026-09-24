import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import AppLayout from "./layouts/AppLayout";
import LoginScreen from "./screens/auth/LoginScreen";
import { getStoredUser } from "./api/authApi";
import { hasPermission } from "./utils/permissions";

const DashboardScreen = lazy(() => import("./screens/dashboard/DashboardScreen"));
const ProductionScreen = lazy(() => import("./screens/production/ProductionScreen"));
const ProductionMenuScreen = lazy(() => import("./screens/operations/ProductionMenuScreen"));
const ProductionPlanningScreen = lazy(() => import("./screens/planning/ProductionPlanningScreen"));
const HistoryScreen = lazy(() => import("./screens/history/HistoryScreen"));
const UsersScreen = lazy(() => import("./screens/users/UsersScreen"));
const CertificateScreen = lazy(() => import("./screens/certificate/CertificateScreen"));
const ControlPanelScreen = lazy(() => import("./screens/control-panel/ControlPanelScreen"));
const ProfileScreen = lazy(() => import("./screens/profile/ProfileScreen"));
const PlantControlScreen = lazy(() => import("./screens/PlantControl/PlantControlScreen"));
const ShiftScreen = lazy(() => import("./screens/shift/ShiftScreen"));
const ContractProductionScreen = lazy(() => import("./screens/operations/ContractProductionScreen"));
const ExpenseReportScreen = lazy(() => import("./screens/operations/ExpenseReportScreen"));
const ZincStockScreen = lazy(() => import("./screens/operations/ZincStockScreen"));
const MonthlyReportsScreen = lazy(() => import("./screens/operations/MonthlyReportsScreen"));
const RateCalculatorScreen = lazy(() => import("./screens/operations/RateCalculatorScreen"));
const SettingsScreen = lazy(() => import("./screens/operations/SettingsScreen"));
const SettingsMenuScreen = lazy(() => import("./screens/operations/SettingsMenuScreen"));
const ChemicalTrackingScreen = lazy(() => import("./screens/operations/ChemicalTrackingScreen"));
const ChatScreen = lazy(() => import('./screens/chat/ChatScreen'));

const productionWorkspacePermissions = ["production.view", "planning.view", "history.view", "rate_calculator.view", "contractors.view", "expense_report.view", "monthly_reports.view", "zinc_stock.view", "chemical_checks.view", "shifts.view", "certificates.view", "plant.view"];
const settingsWorkspacePermissions = ["contractors.manage", "items.manage", "financial_years.manage", "settings.manage", "app_updates.manage"];
const homeForUser = (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (role === "supervisor" && hasPermission(user, "production.view")) return "/production/live";
  if (hasPermission(user, "dashboard.view")) return "/dashboard";
  if (productionWorkspacePermissions.some((key) => hasPermission(user, key))) return "/production";
  if (settingsWorkspacePermissions.some((key) => hasPermission(user, key))) return "/settings";
  return "/profile";
};

function useSessionVersion() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("iv:session-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("iv:session-changed", refresh);
    };
  }, []);
}

function ProtectedRoute({ roles }) {
  useSessionVersion();
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user?.role) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(String(user.role).toLowerCase())) {
    return <Navigate to={homeForUser(user)} replace />;
  }

  return <Outlet />;
}

function PermissionRoute({ permission }) {
  useSessionVersion();
  const user = getStoredUser();
  const allowed = Array.isArray(permission)
    ? permission.some((key) => hasPermission(user, key))
    : hasPermission(user, permission);
  return allowed ? <Outlet /> : <Navigate to={homeForUser(user)} replace />;
}

function LoginRoute() {
  useSessionVersion();
  const user = getStoredUser();
  return localStorage.getItem("token") && user?.role ? (
    <Navigate to={homeForUser(user)} replace />
  ) : (
    <LoginScreen />
  );
}

function HomeRedirect() {
  const user = getStoredUser();
  return <Navigate to={homeForUser(user)} replace />;
}

function ScreenLoader() {
  return (
    <div className="screen-loader" role="status" aria-live="polite">
      <span />
      Loading screen…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />

            <Route element={<PermissionRoute permission="dashboard.view" />}>
              <Route path="dashboard" element={<DashboardScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="planning.view" />}>
              <Route path="production/planning" element={<ProductionPlanningScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="history.view" />}>
              <Route path="production/history" element={<HistoryScreen />} />
            </Route>

            <Route path="production" element={<ProductionMenuScreen />} />
            <Route element={<PermissionRoute permission="production.view" />}>
              <Route path="production/live" element={<ProductionScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="chat.view" />}><Route path="production/chat" element={<ChatScreen />} /></Route>

            <Route element={<PermissionRoute permission="contractors.view" />}>
              <Route path="production/contract-production" element={<ContractProductionScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="expense_report.view" />}>
              <Route path="production/expenses" element={<ExpenseReportScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="zinc_stock.view" />}>
              <Route path="production/zinc-stock" element={<ZincStockScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="monthly_reports.view" />}>
              <Route path="production/monthly-reports" element={<MonthlyReportsScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="rate_calculator.view" />}>
              <Route path="production/rate-calculator" element={<RateCalculatorScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="chemical_checks.view" />}>
              <Route path="production/chemical-tracking" element={<ChemicalTrackingScreen />} />
            </Route>

            <Route element={<PermissionRoute permission="certificates.view" />}>
              <Route path="production/certificates" element={<CertificateScreen />} />
            </Route>

            <Route element={<ProtectedRoute roles={["superadmin"]} />}>
              <Route path="settings/user-access" element={<UsersScreen />} />
            </Route>

            <Route element={<PermissionRoute permission="plant.view" />}>
              <Route path="production/plant" element={<PlantControlScreen />} />
            </Route>

            <Route element={<PermissionRoute permission="shifts.view" />}>
              <Route path="production/shift" element={<ShiftScreen />} />
            </Route>

            <Route element={<PermissionRoute permission={["settings.manage", "app_updates.manage"]} />}>
              <Route path="settings/control-panel" element={<ControlPanelScreen />} />
            </Route>

            <Route element={<PermissionRoute permission={["contractors.manage", "items.manage", "financial_years.manage", "settings.manage", "app_updates.manage"]} />}>
              <Route path="settings" element={<SettingsMenuScreen />} />
            </Route>
            <Route element={<PermissionRoute permission="items.manage" />}>
              <Route path="settings/items" element={<SettingsScreen initialTab="items" />} />
            </Route>
            <Route element={<PermissionRoute permission="contractors.manage" />}>
              <Route path="settings/contractors" element={<SettingsScreen initialTab="contractors" />} />
            </Route>
            <Route element={<PermissionRoute permission="financial_years.manage" />}>
              <Route path="settings/financial-years" element={<SettingsScreen initialTab="years" />} />
            </Route>

            <Route path="planning" element={<Navigate to="/production/planning" replace />} />
            <Route path="history" element={<Navigate to="/production/history" replace />} />
            <Route path="contract-production" element={<Navigate to="/production/contract-production" replace />} />
            <Route path="expenses" element={<Navigate to="/production/expenses" replace />} />
            <Route path="zinc-stock" element={<Navigate to="/production/zinc-stock" replace />} />
            <Route path="monthly-reports" element={<Navigate to="/production/monthly-reports" replace />} />
            <Route path="rate-calculator" element={<Navigate to="/production/rate-calculator" replace />} />
            <Route path="chemical-tracking" element={<Navigate to="/production/chemical-tracking" replace />} />
            <Route path="certificates" element={<Navigate to="/production/certificates" replace />} />
            <Route path="plant" element={<Navigate to="/production/plant" replace />} />
            <Route path="shift" element={<Navigate to="/production/shift" replace />} />
            <Route path="users" element={<Navigate to="/settings/user-access" replace />} />
            <Route path="control" element={<Navigate to="/settings/control-panel" replace />} />

            <Route path="profile" element={<ProfileScreen />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
