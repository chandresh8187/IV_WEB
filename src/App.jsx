import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import AppLayout from "./layouts/AppLayout";
import LoginScreen from "./screens/auth/LoginScreen";
import { getStoredUser } from "./api/authApi";

const DashboardScreen = lazy(() => import("./screens/dashboard/DashboardScreen"));
const ProductionScreen = lazy(() => import("./screens/production/ProductionScreen"));
const ProductionPlanningScreen = lazy(() => import("./screens/planning/ProductionPlanningScreen"));
const HistoryScreen = lazy(() => import("./screens/history/HistoryScreen"));
const UsersScreen = lazy(() => import("./screens/users/UsersScreen"));
const CertificateScreen = lazy(() => import("./screens/certificate/CertificateScreen"));
const ControlPanelScreen = lazy(() => import("./screens/control-panel/ControlPanelScreen"));
const ProfileScreen = lazy(() => import("./screens/profile/ProfileScreen"));
const PlantControlScreen = lazy(() => import("./screens/PlantControl/PlantControlScreen"));
const ShiftScreen = lazy(() => import("./screens/shift/ShiftScreen"));

const homeForRole = (role) =>
  String(role || "").toLowerCase() === "supervisor"
    ? "/production"
    : "/dashboard";

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
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}

function LoginRoute() {
  useSessionVersion();
  const user = getStoredUser();
  return localStorage.getItem("token") && user?.role ? (
    <Navigate to={homeForRole(user.role)} replace />
  ) : (
    <LoginScreen />
  );
}

function HomeRedirect() {
  const user = getStoredUser();
  return <Navigate to={homeForRole(user?.role)} replace />;
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

            <Route element={<ProtectedRoute roles={["admin", "superadmin", "plant_manager"]} />}>
              <Route path="dashboard" element={<DashboardScreen />} />
              <Route path="planning" element={<ProductionPlanningScreen />} />
              <Route path="history" element={<HistoryScreen />} />
            </Route>

            <Route path="production" element={<ProductionScreen />} />

            <Route element={<ProtectedRoute roles={["admin", "superadmin"]} />}>
              <Route path="certificates" element={<CertificateScreen />} />
            </Route>

            <Route element={<ProtectedRoute roles={["admin", "superadmin", "plant_manager"]} />}>
              <Route path="users" element={<UsersScreen />} />
            </Route>

            <Route element={<ProtectedRoute roles={["plant_manager", "superadmin"]} />}>
              <Route path="plant" element={<PlantControlScreen />} />
            </Route>

            <Route element={<ProtectedRoute roles={["supervisor"]} />}>
              <Route path="shift" element={<ShiftScreen />} />
            </Route>

            <Route element={<ProtectedRoute roles={["superadmin"]} />}>
              <Route path="control" element={<ControlPanelScreen />} />
            </Route>

            <Route path="profile" element={<ProfileScreen />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
