import {
  CalendarDays,
  Clock3,
  Factory,
  FileCheck2,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { logoutApi } from "../api/authApi";
import socket from "../socket/socket";
import "./AppLayout.css";

const iconByRoute = {
  dashboard: LayoutDashboard,
  production: Factory,
  planning: CalendarDays,
  history: History,
  certificates: FileCheck2,
  users: Users,
  plant: Gauge,
  shift: Clock3,
  control: Settings2,
  profile: UserCircle2,
};

const labelByRoute = {
  dashboard: "Dashboard",
  production: "Production",
  planning: "Production Planning",
  history: "History",
  certificates: "Certificates",
  users: "Users",
  plant: "Plant Control",
  shift: "Shift",
  control: "Control Panel",
  profile: "Profile",
};

const navigationByRole = {
  superadmin: [
    "dashboard",
    "production",
    "planning",
    "history",
    "certificates",
    "users",
    "plant",
    "control",
    "profile",
  ],

  plant_manager: [
    "dashboard",
    "production",
    "planning",
    "history",
    "plant",
    "profile",
  ],

  admin: [
    "dashboard",
    "production",
    "planning",
    "history",
    "certificates",
    "users",
    "profile",
  ],

  supervisor: ["production", "shift", "profile"],
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const formatRole = (role) => {
  return String(role || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getInitials = (name) => {
  return String(name || "IV")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [, setSessionVersion] = useState(0);

  const user = getStoredUser();

  const role = String(user?.role || "")
    .trim()
    .toLowerCase();

  const navigation = navigationByRole[role] || ["profile"];

  const activeRoute = location.pathname.split("/")[1] || navigation[0];

  const pageTitle = labelByRoute[activeRoute] || "IV APP";

  const handleLogout = () => {
    socket.disconnect();
    logoutApi();

    navigate("/login", {
      replace: true,
    });
  };

  const closeMobileNavigation = () => {
    setMobileOpen(false);
  };

  useEffect(() => {
    const refreshUser = () => setSessionVersion((value) => value + 1);
    window.addEventListener("iv:session-changed", refreshUser);
    window.addEventListener("storage", refreshUser);
    return () => {
      window.removeEventListener("iv:session-changed", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleDisconnect);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleDisconnect);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <div className="application-shell">
      {mobileOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          onClick={closeMobileNavigation}
          aria-label="Close navigation"
        />
      ) : null}

      <aside className={mobileOpen ? "app-sidebar mobile-open" : "app-sidebar"}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">IV</div>

          <div>
            <strong>IV APP</strong>
            <span>Production Management</span>
          </div>

          <button
            className="sidebar-close"
            type="button"
            onClick={closeMobileNavigation}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">Main menu</div>

        <nav className="sidebar-navigation">
          {navigation.map((route) => {
            const Icon = iconByRoute[route];

            return (
              <NavLink
                key={route}
                to={`/${route}`}
                className={({ isActive }) =>
                  isActive ? "sidebar-link active" : "sidebar-link"
                }
                onClick={closeMobileNavigation}
              >
                <Icon size={19} strokeWidth={1.8} />

                <span>{labelByRoute[route]}</span>

                {route === "control" ? <small>SA</small> : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div
            className={`backend-status ${connected ? "connected" : "disconnected"}`}
            title={connected ? "Connected to IV APP backend" : "Reconnecting to IV APP backend"}
            role="status"
          >
            <span className="backend-dot" />

            <div>
              <strong>{connected ? "Backend connected" : "Reconnecting…"}</strong>
              <small>{connected ? "Live updates active" : "Updates temporarily offline"}</small>
            </div>
          </div>

          <div className="sidebar-profile">
            <div className="sidebar-avatar">{getInitials(user?.name)}</div>

            <div className="sidebar-user-details">
              <strong>{user?.name}</strong>

              <small>{formatRole(user?.role)}</small>
            </div>

            <button
              className="sidebar-logout"
              type="button"
              onClick={handleLogout}
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
              onClick={() => {
                setMobileOpen(true);
              }}
              aria-label="Open navigation"
            >
              <Menu size={23} />
            </button>

            <div>
              <span>IV Square Structure</span>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="header-right">
            <div className={`header-live-status ${connected ? "connected" : "disconnected"}`}>
              <span />
              {connected ? "Live" : "Offline"}
            </div>

            <div className="header-date">
              <CalendarDays size={17} />

              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>

            <div className="header-user">
              <div className="header-avatar">{getInitials(user?.name)}</div>

              <span>
                <strong>{user?.name}</strong>

                <small>{formatRole(user?.role)}</small>
              </span>
            </div>
          </div>
        </header>

        <main className="application-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
