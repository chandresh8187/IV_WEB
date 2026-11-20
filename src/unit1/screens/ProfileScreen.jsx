import { useMutation } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeCheck,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  LogOut,
  Clock3,
} from "lucide-react";
import { getProfile } from "../api/authApi";
import { setAuth } from "../store/authSlice";
import { formatDateTime } from "../utils/dateTime";

export default function ProfileScreen({ onLogout }) {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const refresh = useMutation({
    mutationFn: getProfile,
    onSuccess: (response) => {
      const next = response?.data?.user || response?.data || response?.user;
      if (next?.id) dispatch(setAuth({ token, user: next }));
    },
  });
  const role = String(user?.role || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = String(user?.name || "IV User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const detail = (label, value) => (
    <div className="profile-detail-row" key={label}>
      <span>{label}</span>
      <strong>{value || "Not recorded"}</strong>
    </div>
  );
  return (
    <section className="profile-screen">
      <header className="profile-toolbar">
        <div>
          <span className="profile-overline">My account</span>
          <h2>Profile</h2>
          <p>Review your Unit 1 account and access details.</p>
        </div>
        <button
          className="profile-refresh-button"
          type="button"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          <RefreshCw
            size={15}
            className={refresh.isPending ? "profile-spinning" : ""}
          />
          Refresh
        </button>
      </header>
      {refresh.isError && (
        <div className="notice error" role="alert">
          {refresh.error?.message || "Could not refresh your profile."}
        </div>
      )}
      <article className="profile-identity-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-identity-copy">
          <div>
            <h3>{user?.name || "IV User"}</h3>
            <span className={"profile-role-badge " + (user?.role || "")}>
              <BadgeCheck size={13} />
              {role}
            </span>
          </div>
          <p>
            <Mail size={14} />
            {user?.email || "Not recorded"}
          </p>
        </div>
        <div className="profile-status">
          <span>
            <i />
            {user?.status || "Status not recorded"} account
          </span>
          <small>Account ID #{user?.id || "—"}</small>
        </div>
      </article>
      <div className="profile-layout">
        <div className="profile-main-column">
          <article className="profile-card">
            <header className="profile-card-header">
              <div className="profile-card-icon">
                <UserRound size={18} />
              </div>
              <div>
                <span>Personal information</span>
                <h3>Account details</h3>
              </div>
            </header>
            <div className="unit1-profile-details">
              {detail("Name", user?.name)}
              {detail("Email address", user?.email)}
              {detail("Access role", role)}
              {user?.assignedShift &&
                detail("Assigned shift", user.assignedShift)}
              {user?.assignedMachineName &&
                detail("Assigned machine", user.assignedMachineName)}
            </div>
          </article>
          <article className="profile-card">
            <header className="profile-card-header">
              <div className="profile-card-icon secure">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span>Account security</span>
                <h3>Workspace access</h3>
              </div>
            </header>
            <div className="unit1-profile-details">
              <div className="profile-security-note">
                <ShieldCheck size={17} />
                <div>
                  <strong>Your access follows your assigned role</strong>
                  <span>
                    Contact your administrator for account, password or
                    permission changes.
                  </span>
                </div>
              </div>
              <button
                className="outline-button coil-delete-action"
                type="button"
                onClick={onLogout}
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          </article>
        </div>
        <aside className="profile-side-column">
          <article className="profile-side-card">
            <header>
              <BadgeCheck size={17} />
              <h3>Access overview</h3>
            </header>
            {detail("Workspace", "Unit 1")}
            {detail("Role", role)}
            {detail("Account status", user?.status)}
          </article>
          {user?.created_at && (
            <article className="profile-side-card">
              <header>
                <Clock3 size={17} />
                <h3>Account activity</h3>
              </header>
              {detail("Created", formatDateTime(user.created_at))}
            </article>
          )}
        </aside>
      </div>
    </section>
  );
}
