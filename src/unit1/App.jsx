import MaterialBundlesScreen from "./screens/MaterialBundlesScreen";
import MaterialDispatchReportScreen from "./screens/MaterialDispatchReportScreen";
import MaterialRegisterScreen from "./screens/MaterialRegisterScreen";
import CoilStockInvoices from "./components/CoilStockInvoices";
import CoilStockScreen from "./screens/CoilStockScreen";
import AssignCoilScreen from "./screens/AssignCoilScreen";
import LiveInspectionsScreen from "./screens/LiveInspectionsScreen";
import { screenNavigation } from "./utils/screenNavigation";
import LoadingIndicator from "../components/LoadingIndicator";
import { navigationSection } from "../portal/navigationSection";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  Navigate,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  CalendarDays,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  UserCircle2,
  X,
} from "lucide-react";
import { getProfile, readSession } from "./api/authApi";
import { clearAuth, setAuth, setNavigationOpen } from "./store/authSlice";
import { queryClient } from "./store/queryClient";
import { formatDate } from "./utils/dateTime";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import ProductionScreen from "./screens/ProductionScreen";
import SettingsScreen from "./screens/SettingsScreen";
import VendorsScreen from "./screens/VendorsScreen";
import MaterialsGradesScreen from "./screens/MaterialsGradesScreen";
import QrScanSettingsScreen from "./screens/QrScanSettingsScreen";
import MachinesScreen from "./screens/MachinesScreen";
import UsersAccessScreen from "./screens/UsersAccessScreen";
import ShiftSettingsScreen from "./screens/ShiftSettingsScreen";
import NotificationTestScreen from "./screens/NotificationTestScreen";
import Unit1RealtimeSync from "./components/Unit1RealtimeSync";
import "./App.css";
import "./Unit2Layout.css";
import "./Unit2Login.css";
import "./Interface.css";
import "./Unit2Visual.css";
import "./Unit2Workflow.css";

const MaintenanceScreen = lazy(() => import("./screens/MaintenanceScreen"));
const MaterialViewerScreen = lazy(() =>
  import("./screens/MaterialViewerScreen")
);
const LiveProductionScreen = lazy(() =>
  import("./screens/LiveProductionScreen")
);
const MachineProductionEntriesScreen = lazy(() =>
  import("./screens/MachineProductionEntriesScreen")
);
const MachineHoleChecksScreen = lazy(() =>
  import("./screens/MachineHoleChecksScreen")
);
const PdfPreviewScreen = lazy(() => import("./screens/PdfPreviewScreen"));
const JobCardsScreen = lazy(() => import("./screens/MaterialTemplatesScreen"));
const ProductionPlanningScreen = lazy(() =>
  import("./screens/ProductionPlanningScreen")
);
const ProductionHistoryScreen = lazy(() =>
  import("./screens/ProductionHistoryScreen")
);

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/production", label: "Production", icon: Factory },
  { to: "/settings", label: "Settings", icon: Settings2 },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
];

function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, navigationOpen } = useSelector((state) => state.auth);
  const [connected, setConnected] = useState(false);
  const location = useLocation();
  const activeSection = navigationSection("unit1", location.pathname);
  const { title: screenTitle, backTo } = screenNavigation(
    location.pathname,
    location.state
  );
  const initials = String(user?.name || "IV")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  useEffect(() => {
    dispatch(setNavigationOpen(false));
  }, [location.pathname, dispatch]);
  useEffect(() => {
    const update = (event) => setConnected(Boolean(event.detail?.connected));
    window.addEventListener("unit1:connection", update);
    return () => window.removeEventListener("unit1:connection", update);
  }, []);
  useEffect(() => {
    const stopWheelStepping = (event) => {
      const input = event.target;
      if (
        input instanceof HTMLInputElement &&
        input.type === "number" &&
        input.closest(".unit1-workspace") &&
        document.activeElement === input
      ) {
        // Remove number-input focus before its wheel default runs; page scrolling continues.
        input.blur();
      }
    };
    document.addEventListener("wheel", stopWheelStepping, {
      capture: true,
      passive: true,
    });
    return () => document.removeEventListener("wheel", stopWheelStepping, true);
  }, []);

  useEffect(() => {
    if (!navigationOpen) return;
    const previous = document.body.style.overflow;
    const close = (e) => {
      if (e.key === "Escape") dispatch(setNavigationOpen(false));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [navigationOpen, dispatch]);

  function logout() {
    localStorage.setItem("iv_last_unit", "unit1");
    localStorage.removeItem("ivs1_session");
    queryClient.clear();
    dispatch(clearAuth());
    navigate("/login", { replace: true });
  }

  return (
    <div className="application-shell unit1-workspace">
      <Unit1RealtimeSync />
      {navigationOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => dispatch(setNavigationOpen(false))}
        />
      )}
      <aside className={`app-sidebar ${navigationOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/iv-logo.png" alt="IV Square Structure" />
          <div>
            <strong>IV APP</strong>
            <span>UNIT 1 · Production Management</span>
          </div>
          <button
            className="sidebar-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => dispatch(setNavigationOpen(false))}
          >
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-navigation" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-current={activeSection === to ? "page" : undefined}
              onClick={() => dispatch(setNavigationOpen(false))}
              className={
                activeSection === to ? "sidebar-link active" : "sidebar-link"
              }
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div
            className={`backend-status ${
              connected ? "connected" : "disconnected"
            }`}
          >
            <span className="backend-dot" />
            <div>
              <strong>
                {connected ? "Backend connected" : "Reconnecting…"}
              </strong>
              <small>
                {connected
                  ? "Live updates active"
                  : "Updates temporarily offline"}
              </small>
            </div>
          </div>
          <div className="sidebar-profile">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-details">
              <strong>{user?.name || "User"}</strong>
              <small>
                {String(user?.role || "")
                  .replaceAll("_", " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </small>
            </div>
            <button
              className="sidebar-logout"
              type="button"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="application-main">
        <header className="application-header">
          <div className="header-title-area">
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => dispatch(setNavigationOpen(true))}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            {backTo && (
              <button
                className="header-back-button"
                type="button"
                onClick={() =>
                  navigate(backTo, { state: location.state?.returnState })
                }
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="header-title-copy">
              <span>IV Square Structure</span>
              <h1 title={screenTitle}>{screenTitle}</h1>
            </div>
          </div>
          <div className="header-right">
            <div
              className={`header-live-status ${
                connected ? "connected" : "disconnected"
              }`}
            >
              <span />
              {connected ? "Live" : "Offline"}
            </div>
            <div className="header-date">
              <CalendarDays size={17} />
              {formatDate(new Date())}
            </div>
            <div className="header-user">
              <div className="header-avatar">{initials}</div>
              <span>
                <strong>{user?.name || "User"}</strong>
                <small>
                  {String(user?.role || "")
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </small>
              </span>
            </div>
          </div>
        </header>
        <main className="application-content">
          <div className="page-content">
            <Routes>
              <Route
                path="profile"
                element={<ProfileScreen onLogout={logout} />}
              />
              <Route index element={<HomeScreen />} />
              <Route path="production" element={<ProductionScreen />} />
              <Route
                path="production/material-viewer"
                element={
                  <Suspense
                    fallback={<LoadingIndicator label="Loading 3D viewer…" />}
                  >
                    <MaterialViewerScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/maintenance"
                element={
                  <Suspense
                    fallback={<LoadingIndicator label="Loading maintenance…" />}
                  >
                    <MaintenanceScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/planning"
                element={
                  <Suspense
                    fallback={<LoadingIndicator label="Loading planning…" />}
                  >
                    <ProductionPlanningScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/job-cards"
                element={
                  <Suspense
                    fallback={<LoadingIndicator label="Loading job cards…" />}
                  >
                    <JobCardsScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/live"
                element={
                  <Suspense
                    fallback={
                      <LoadingIndicator label="Loading live production…" />
                    }
                  >
                    <LiveProductionScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/reports/preview"
                element={
                  <Suspense
                    fallback={<LoadingIndicator label="Loading PDF preview…" />}
                  >
                    <PdfPreviewScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/assign-coil"
                element={<AssignCoilScreen />}
              />
              <Route
                path="production/live-inspections"
                element={<LiveInspectionsScreen />}
              />
              <Route
                path="production/history"
                element={
                  <Suspense
                    fallback={
                      <LoadingIndicator label="Loading production history…" />
                    }
                  >
                    <ProductionHistoryScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/live/:machineId/hole-checks/preview"
                element={
                  <Suspense
                    fallback={<LoadingIndicator label="Loading PDF preview…" />}
                  >
                    <PdfPreviewScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/live/:machineId/hole-checks"
                element={
                  <Suspense
                    fallback={<LoadingIndicator label="Loading inspections…" />}
                  >
                    <MachineHoleChecksScreen />
                  </Suspense>
                }
              />
              <Route
                path="production/live/:machineId/entries"
                element={
                  <Suspense
                    fallback={
                      <LoadingIndicator label="Loading production entries…" />
                    }
                  >
                    <MachineProductionEntriesScreen />
                  </Suspense>
                }
              />
              <Route path="production/material-stock/bundles" element={<MaterialBundlesScreen/>}/>
              <Route path="production/material-stock/dispatch-report" element={<MaterialDispatchReportScreen/>}/>
              <Route path="production/material-stock/dispatch" element={<Navigate to="/production/material-stock" replace/>}/>
              <Route path="production/material-stock" element={<MaterialRegisterScreen/>}/>
              <Route path="coils/invoices" element={<CoilStockInvoices/>}/>
              <Route path="coils/add" element={<CoilStockScreen key="add-stock"/>}/>
              <Route path="coils" element={<CoilStockScreen/>}/>
              <Route path="settings" element={<SettingsScreen />} />
              <Route path="settings/vendors" element={<VendorsScreen />} />
              <Route
                path="settings/materials-grades"
                element={<MaterialsGradesScreen />}
              />
              <Route path="settings/machines" element={<MachinesScreen />} />
              <Route path="settings/shifts" element={<ShiftSettingsScreen />} />
              <Route
                path="settings/notifications"
                element={<NotificationTestScreen />}
              />
              <Route path="settings/users" element={<UsersAccessScreen />} />
              <Route
                path="settings/qr-scan"
                element={<QrScanSettingsScreen />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { token, bootstrapping } = useSelector((state) => state.auth);

  useEffect(() => {
    let cancelled = false;
    const saved = readSession();
    if (!saved?.token) {
      dispatch(clearAuth());
      return;
    }
    getProfile()
      .then((response) => {
        if (cancelled) return;
        const user =
          response?.data?.user ||
          response?.data ||
          response?.user ||
          saved.user;
        dispatch(setAuth({ token: saved.token, user }));
      })
      .catch((error) => {
        if (cancelled) return;
        if (
          error?.response?.status === 401 ||
          error?.response?.status === 403
        ) {
          localStorage.removeItem("ivs1_session");
          dispatch(clearAuth());
        } else {
          dispatch(setAuth(saved));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (bootstrapping)
    return (
      <div className="boot-screen">
        <div className="brand-mark">IV</div>
        <LoadingIndicator label="Opening workspace…" />
      </div>
    );

  return (
    <Routes>
      <Route
        path="/login"
        element={
          token ? (
            <Navigate to={location.state?.from || "/"} replace />
          ) : (
            <LoginScreen />
          )
        }
      />
      <Route
        path="/*"
        element={
          token ? (
            <AppShell />
          ) : (
            <Navigate
              to="/login"
              state={{ from: location.pathname + location.search }}
              replace
            />
          )
        }
      />
    </Routes>
  );
}
