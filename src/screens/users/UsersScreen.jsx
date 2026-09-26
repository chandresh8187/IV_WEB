import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Edit3,
  Mail,
  KeyRound,
  LockKeyhole,
  Moon,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
  UserCheck,
  UserRound,
  Users,
  UserX,
  X,
} from "lucide-react";

import {
  getActiveSupervisorsApi,
  getUsersApi,
  registerUserApi,
  setUserStatusApi,
  getUserPermissionsApi,
  updateUserPermissionsApi,
  updateUserApi,
  resetUserPasswordApi,
} from "../../api/usersApi";

import "./UsersScreen.css";
import socket from "../../socket/socket";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "supervisor",
  assigned_shift: "day",
  current_password: "",
};

const roleLabels = {
  superadmin: "Superadmin",
  plant_manager: "Plant Manager",
  admin: "Admin",
  supervisor: "Supervisor",
  labour: "Labour",
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function getLoggedUser() {
  const keys = ["iv_user", "user", "auth"];

  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");

      if (value?.user) {
        return value.user;
      }

      if (value?.role) {
        return value;
      }
    } catch {
      // Try the next localStorage key.
    }
  }

  return {};
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  const time = String(value);

  const date = new Date(time.includes("T") ? time : `2000-01-01T${time}`);

  if (Number.isNaN(date.getTime())) {
    return time;
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <article
      className="users-summary-card"
      style={{
        "--users-card-color": color,
      }}
    >
      <div className="users-summary-icon">
        <Icon size={20} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function ActiveSupervisorCard({ item }) {
  const ShiftIcon = item.shift_name === "night" ? Moon : Sun;

  return (
    <article className="users-active-card">
      <div className="users-avatar active">
        <UserCheck size={19} />
        <span />
      </div>

      <div className="users-active-details">
        <strong>{item.supervisor_name || "-"}</strong>

        <span>{item.supervisor_email || "-"}</span>
      </div>

      <div className="users-active-shift">
        <ShiftIcon size={15} />

        <div>
          <strong>{item.shift_name || "-"} shift</strong>

          <span>{formatDate(item.shift_date)}</span>
        </div>
      </div>

      <div className="users-active-time">
        <Clock3 size={14} />

        <span>Started {formatTime(item.start_time)}</span>
      </div>

      <span className="users-live-badge">
        <i />
        Live
      </span>
    </article>
  );
}

function UserCard({ user, canManage, onEdit, onStatus, onPermissions, onPassword }) {
  const active = user.status !== "inactive";

  return (
    <article className="users-user-card">
      <div className="users-avatar">
        <UserRound size={20} />
      </div>

      <div className="users-user-identity">
        <strong>{user.name || "-"}</strong>

        <span>
          <Mail size={12} />
          {user.email || "-"}
        </span>
      </div>

      <div className="users-role-cell">
        <span className={`users-role-badge ${user.role}`}>
          {roleLabels[user.role] || user.role}
        </span>

        {user.role === "supervisor" ? (
          <small>Assigned: {user.assigned_shift || "-"} shift</small>
        ) : null}
      </div>

      <div className="users-shift-cell">
        {Number(user.is_shift_active) === 1 ? (
          <>
            <span className="users-shift-running">
              <Activity size={13} />
              {user.active_shift_name} shift active
            </span>

            <small>
              {formatDate(user.active_shift_date)} •{" "}
              {formatTime(user.active_shift_start_time)}
            </small>
          </>
        ) : (
          <span className="users-shift-idle">No active shift</span>
        )}
      </div>

      <span className={`users-status-badge ${active ? "active" : "inactive"}`}>
        {active ? "Active" : "Inactive"}
      </span>

      {canManage ? (
        <div className="users-row-actions">
          <button type="button" title="Manage feature access" onClick={() => onPermissions(user)}>
            <KeyRound size={15} />
          </button>
          <button type="button" title="Edit user" onClick={() => onEdit(user)}>
            <Edit3 size={15} />
          </button>
          <button type="button" title="Set new password" onClick={() => onPassword(user)}>
            <LockKeyhole size={15} />
          </button>

          <button
            type="button"
            className={active ? "danger" : "success"}
            title={active ? "Deactivate user" : "Activate user"}
            onClick={() => onStatus(user)}
          >
            {active ? <UserX size={15} /> : <UserCheck size={15} />}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function UserModal({ mode, form, setForm, saving, onClose, onSubmit }) {
  const isEdit = mode === "edit";

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div
      className="users-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="users-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="users-modal-title"
      >
        <header className="users-modal-header">
          <div className="users-modal-title-icon">
            {isEdit ? <Edit3 size={19} /> : <Plus size={20} />}
          </div>

          <div>
            <span>USER MANAGEMENT</span>

            <h3 id="users-modal-title">
              {isEdit ? "Edit user" : "Create new user"}
            </h3>

            <p>
              {isEdit
                ? "Update account details, role and shift assignment."
                : "Add a secure account for your plant team."}
            </p>
          </div>

          <button
            className="users-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close user form"
          >
            <X size={18} />
          </button>
        </header>

        <form className="users-form" onSubmit={onSubmit}>
          <label>
            <span>Full name *</span>

            <input
              autoFocus
              value={form.name}
              placeholder="Enter full name"
              onChange={(event) => update("name", event.target.value)}
            />
          </label>

          <label>
            <span>Email address *</span>

            <input
              type="email"
              value={form.email}
              placeholder="name@company.com"
              onChange={(event) => update("email", event.target.value)}
            />
          </label>

          {!isEdit ? (
            <label>
              <span>Temporary password *</span>

              <input
                type="password"
                maxLength={72}
                value={form.password}
                placeholder="Enter any password"
                onChange={(event) => update("password", event.target.value)}
              />
            </label>
          ) : null}

          <label>
            <span>Account role *</span>

            <select
              value={form.role}
              onChange={(event) => update("role", event.target.value)}
            >
              <option value="supervisor">Supervisor</option>

              <option value="labour">Labour</option>

              <option value="admin">Admin</option>

              <option value="plant_manager">Plant Manager</option>

              {!isEdit ? <option value="superadmin">Superadmin</option> : null}
            </select>
          </label>

          {form.role === "supervisor" ? (
            <fieldset className="users-shift-selector">
              <legend>Assigned shift *</legend>

              {["day", "night", "both"].map((shift) => (
                <button
                  key={shift}
                  type="button"
                  className={form.assigned_shift === shift ? "active" : ""}
                  onClick={() => update("assigned_shift", shift)}
                >
                  {shift === "day" ? (
                    <Sun size={15} />
                  ) : shift === "night" ? (
                    <Moon size={15} />
                  ) : (
                    <Clock3 size={15} />
                  )}

                  {shift}
                </button>
              ))}
            </fieldset>
          ) : null}

          {!isEdit && form.role === "superadmin" ? (
            <label className="users-sensitive-field">
              <span>Your current password *</span>

              <input
                type="password"
                value={form.current_password}
                placeholder="Verify your Superadmin account"
                onChange={(event) =>
                  update("current_password", event.target.value)
                }
              />

              <small>Required only when creating another Superadmin.</small>
            </label>
          ) : null}

          <footer className="users-modal-actions">
            <button
              className="users-cancel-button"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="users-save-button"
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="users-spinning" size={16} />
              ) : isEdit ? (
                <CheckCircle2 size={16} />
              ) : (
                <Plus size={17} />
              )}

              {saving ? "Saving..." : isEdit ? "Save changes" : "Create user"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ConfirmStatusModal({ user, saving, onClose, onConfirm }) {
  const deactivate = user?.status !== "inactive";

  return (
    <div className="users-modal-backdrop">
      <section
        className="users-confirm-modal"
        role="alertdialog"
        aria-modal="true"
      >
        <div
          className={`users-confirm-icon ${deactivate ? "danger" : "success"}`}
        >
          {deactivate ? <UserX size={23} /> : <UserCheck size={23} />}
        </div>

        <h3>
          {deactivate ? "Deactivate" : "Activate"} {user?.name}?
        </h3>

        <p>
          {deactivate
            ? "This user will not be able to sign in until the account is activated again."
            : "This user will regain access to the IV Square application."}
        </p>

        <div className="users-confirm-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className={deactivate ? "danger" : "success"}
            disabled={saving}
            onClick={onConfirm}
          >
            {saving ? "Updating..." : "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PermissionModal({ user, onClose, onSaved }) {
  const [permissions, setPermissions] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getUserPermissionsApi(user.id)
      .then((response) => {
        if (!active) return;
        const rows = response?.data?.permissions || [];
        setPermissions(rows);
        setDraft(Object.fromEntries(rows.map((item) => [item.key, item.override])));
      })
      .catch((requestError) => active && setError(getErrorMessage(requestError, "Could not load feature access.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user.id]);

  const grouped = useMemo(() => permissions.reduce((result, item) => {
    (result[item.group] ||= []).push(item);
    return result;
  }, {}), [permissions]);
  const effective = (item) => draft[item.key] == null ? item.default_allowed : draft[item.key];
  const save = async () => {
    setSaving(true); setError("");
    try {
      const response = await updateUserPermissionsApi({ id: user.id, overrides: permissions.map((item) => ({ key: item.key, allowed: draft[item.key] ?? null })) });
      onSaved(response?.message || `Access updated for ${user.name}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update feature access."));
    } finally { setSaving(false); }
  };

  return <div className="users-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
    <section className="permissions-modal" role="dialog" aria-modal="true" aria-labelledby="permission-title">
      <header className="permissions-header"><div className="users-modal-title-icon"><KeyRound size={19}/></div><div><span>USER ACCESS</span><h3 id="permission-title">Feature access</h3><p>{user.name} · {roleLabels[user.role] || user.role}</p></div><button className="users-modal-close" onClick={onClose} disabled={saving} aria-label="Close access editor"><X size={18}/></button></header>
      {loading ? <div className="users-loader"><RefreshCw className="users-spinning" size={24}/>Loading permissions...</div> : <div className="permissions-body">
        <div className="permissions-intro"><div><strong>Role defaults + custom access</strong><p>Each switch shows the user’s effective access. Changes override the role default for this user only.</p></div><button type="button" onClick={() => setDraft(Object.fromEntries(permissions.map((item) => [item.key, null])))}><RotateCcw size={15}/>Use role defaults</button></div>
        {error ? <div className="users-message error"><AlertTriangle size={18}/><span>{error}</span></div> : null}
        {Object.entries(grouped).map(([group, items]) => <section className="permission-group" key={group}><h4>{group}</h4>{items.map((item) => {const allowed=effective(item),custom=draft[item.key]!=null;return <label className="permission-row" key={item.key}><span><span className="permission-label">{item.label}{custom?<small>CUSTOM</small>:null}</span><em>{item.description}</em></span><input type="checkbox" checked={Boolean(allowed)} onChange={(event)=>setDraft((current)=>({...current,[item.key]:event.target.checked}))}/><i aria-hidden="true"/></label>})}</section>)}
      </div>}
      <footer className="permissions-actions"><button className="users-cancel-button" onClick={onClose} disabled={saving}>Cancel</button><button className="users-save-button" onClick={save} disabled={loading||saving}>{saving?<RefreshCw className="users-spinning" size={16}/>:<KeyRound size={16}/>} {saving?"Saving...":"Save feature access"}</button></footer>
    </section>
  </div>;
}

export default function UsersScreen() {
  const loggedUser = useMemo(() => getLoggedUser(), []);

  const isSuperadmin =
    String(loggedUser?.role || "").toLowerCase() === "superadmin";

  const [users, setUsers] = useState([]);

  const [activeSupervisors, setActiveSupervisors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");

  const [form, setForm] = useState(emptyForm);

  const [modalMode, setModalMode] = useState(null);

  const [editingId, setEditingId] = useState(null);

  const [statusUser, setStatusUser] = useState(null);
  const [permissionUser, setPermissionUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState(null);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage(null);
    }, 4000);
  }, []);

  const loadUsers = useCallback(
    async (showSuccess = false) => {
      try {
        const [usersResponse, activeResponse] = await Promise.all([
          getUsersApi(),
          getActiveSupervisorsApi(),
        ]);

        const userData = usersResponse?.data || {};

        const combined = Array.isArray(userData.users)
          ? userData.users
          : [
              ...(userData.superadmins || []),
              ...(userData.plant_managers || []),
              ...(userData.admins || []),
              ...(userData.supervisors || []),
              ...(userData.labour || []),
            ];

        setUsers(combined);

        setActiveSupervisors(
          Array.isArray(activeResponse?.data) ? activeResponse.data : [],
        );

        if (showSuccess) {
          showMessage("success", "User list refreshed.");
        }
      } catch (error) {
        showMessage("error", getErrorMessage(error, "Unable to load users."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showMessage],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleShiftUpdate = () => {
      loadUsers();
    };

    socket.on("shift_updated", handleShiftUpdate);
    socket.on("users_updated", handleShiftUpdate);

    return () => {
      socket.off("shift_updated", handleShiftUpdate);
      socket.off("users_updated", handleShiftUpdate);
    };
  }, [loadUsers]);

  const counts = useMemo(
    () => ({
      total: users.length,

      superadmins: users.filter((item) => item.role === "superadmin").length,

      managers: users.filter((item) => item.role === "plant_manager").length,

      admins: users.filter((item) => item.role === "admin").length,

      supervisors: users.filter((item) => item.role === "supervisor").length,

      labour: users.filter((item) => item.role === "labour").length,

      active: activeSupervisors.length,
    }),
    [users, activeSupervisors],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesFilter =
        activeFilter === "all" ||
        user.role === activeFilter ||
        (activeFilter === "active" && user.status !== "inactive");

      const matchesSearch =
        !query ||
        [user.name, user.email, user.role, user.assigned_shift].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );

      return matchesFilter && matchesSearch;
    });
  }, [users, activeFilter, search]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalMode("create");
  };

  const openEdit = (user) => {
    setForm({
      ...emptyForm,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "supervisor",
      assigned_shift: user.assigned_shift || "day",
    });

    setEditingId(user.id);
    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalMode(null);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submitUser = async (event) => {
    event.preventDefault();

    const actionMode = modalMode;

    if (!form.name.trim() || !form.email.trim()) {
      showMessage("error", "Name and email are required.");

      return;
    }

    if (modalMode === "create" && (!form.password || form.password.length > 72)) {
      showMessage("error", "Enter a password with 72 characters or fewer.");

      return;
    }

    if (
      modalMode === "create" &&
      form.role === "superadmin" &&
      !form.current_password
    ) {
      showMessage(
        "error",
        "Enter your current password to create a Superadmin.",
      );

      return;
    }

    const body = {
      name: form.name.trim(),

      email: form.email.trim().toLowerCase(),

      role: form.role,

      assigned_shift: form.role === "supervisor" ? form.assigned_shift : null,
    };

    if (modalMode === "create") {
      body.password = form.password;

      if (form.role === "superadmin") {
        body.current_password = form.current_password;
      }
    }

    setSaving(true);

    try {
      const response =
        actionMode === "edit"
          ? await updateUserApi({
              id: editingId,
              body,
            })
          : await registerUserApi(body);

      setModalMode(null);
      setEditingId(null);
      setForm(emptyForm);

      await loadUsers();

      showMessage(
        "success",
        response?.message ||
          (actionMode === "edit"
            ? "User updated successfully."
            : "User created successfully."),
      );
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Unable to save user."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!statusUser) {
      return;
    }

    const status = statusUser.status === "inactive" ? "active" : "inactive";

    setSaving(true);

    try {
      const response = await setUserStatusApi({
        id: statusUser.id,
        status,
      });

      setStatusUser(null);

      await loadUsers();

      showMessage("success", response?.message || `User marked ${status}.`);
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(error, "Unable to change account status."),
      );
    } finally {
      setSaving(false);
    }
  };

  const saveNewPassword = async (event) => {
    event.preventDefault();
    if (!passwordUser || !newPassword || newPassword.length > 72) {
      showMessage("error", "Enter a password with 72 characters or fewer.");
      return;
    }
    setSaving(true);
    try {
      const response = await resetUserPasswordApi({ id: passwordUser.id, password: newPassword });
      setPasswordUser(null);
      setNewPassword("");
      showMessage("success", response?.message || "Password updated successfully.");
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Unable to update password."));
    } finally {
      setSaving(false);
    }
  };

  const filters = [
    ["all", "All Users"],
    ["active", "Active"],
    ["superadmin", "Superadmins"],
    ["plant_manager", "Plant Managers"],
    ["admin", "Admins"],
    ["supervisor", "Supervisors"],
    ["labour", "Labour"],
  ];

  return (
    <div className="users-screen">
      <div className="users-toolbar">
        <div>
          <span className="users-overline">ACCESS MANAGEMENT</span>

          <h2>Users & permissions</h2>

          <p>Monitor active supervisors and manage team access.</p>
        </div>

        <div className="users-toolbar-actions">
          <button
            className="users-refresh-button"
            type="button"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              loadUsers(true);
            }}
          >
            <RefreshCw
              className={refreshing ? "users-spinning" : ""}
              size={17}
            />
            Refresh
          </button>

          {isSuperadmin ? (
            <button
              className="users-add-button"
              type="button"
              onClick={openCreate}
            >
              <Plus size={17} />
              Add User
            </button>
          ) : null}
        </div>
      </div>

      {message ? (
        <div className={`users-message ${message.type}`}>
          {message.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}

          <span>{message.text}</span>

          <button type="button" onClick={() => setMessage(null)}>
            <X size={16} />
          </button>
        </div>
      ) : null}

      <section className="users-summary-grid">
        <SummaryCard
          icon={Users}
          label="Total Team Members"
          value={counts.total}
          color="#2878ff"
        />

        <SummaryCard
          icon={UserCheck}
          label="Active Supervisors"
          value={counts.active}
          color="#18a567"
        />

        {isSuperadmin ? (
          <SummaryCard
            icon={BriefcaseBusiness}
            label="Plant Managers"
            value={counts.managers}
            color="#7357d8"
          />
        ) : null}

        {isSuperadmin ? (
          <SummaryCard
            icon={ShieldCheck}
            label="Administrators"
            value={counts.admins}
            color="#d98c00"
          />
        ) : null}
      </section>

      <section className="users-section-card users-active-section">
        <header className="users-section-header">
          <div>
            <span>LIVE SHIFT STATUS</span>

            <h3>Active supervisors</h3>

            <p>Supervisors currently running a production shift.</p>
          </div>

          <span className="users-live-count">
            {activeSupervisors.length} online
          </span>
        </header>

        {loading ? (
          <div className="users-loader compact">
            <RefreshCw className="users-spinning" size={22} />
            Loading live shift status...
          </div>
        ) : activeSupervisors.length ? (
          <div className="users-active-grid">
            {activeSupervisors.map((item) => (
              <ActiveSupervisorCard key={item.shift_id} item={item} />
            ))}
          </div>
        ) : (
          <div className="users-empty compact">
            <Activity size={28} />

            <strong>No active supervisor right now</strong>

            <span>Live shift details will appear here.</span>
          </div>
        )}
      </section>

      <section className="users-section-card">
        <header className="users-directory-header">
          <div>
            <span>TEAM DIRECTORY</span>
            <h3>All user accounts</h3>
          </div>

          <div className="users-search">
            <Search size={16} />

            <input
              type="search"
              value={search}
              placeholder="Search name, email, role or shift..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </header>

        <nav className="users-filters" aria-label="User filters">
          {filters
            .filter(
              ([value]) =>
                isSuperadmin ||
                !["superadmin", "plant_manager", "admin"].includes(value),
            )
            .map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={activeFilter === value ? "active" : ""}
                onClick={() => setActiveFilter(value)}
              >
                {label}
              </button>
            ))}
        </nav>

        <div className="users-list-header" aria-hidden="true">
          <span>User</span>
          <span>Role</span>
          <span>Current Shift</span>
          <span>Status</span>

          {isSuperadmin ? <span>Actions</span> : null}
        </div>

        {loading ? (
          <div className="users-loader">
            <RefreshCw className="users-spinning" size={28} />
            Loading user accounts...
          </div>
        ) : filteredUsers.length ? (
          <div className="users-list">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                canManage={
                  isSuperadmin &&
                  Number(user.id) !== Number(loggedUser.id) &&
                  user.role !== "superadmin"
                }
                onEdit={openEdit}
                onStatus={setStatusUser}
                onPermissions={setPermissionUser}
                onPassword={(selectedUser) => {
                  setNewPassword("");
                  setPasswordUser(selectedUser);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="users-empty">
            <Users size={36} />

            <strong>No user accounts found</strong>

            <span>Try a different search or role filter.</span>
          </div>
        )}
      </section>

      {modalMode ? (
        <UserModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          saving={saving}
          onClose={closeModal}
          onSubmit={submitUser}
        />
      ) : null}

      {statusUser ? (
        <ConfirmStatusModal
          user={statusUser}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setStatusUser(null);
            }
          }}
          onConfirm={changeStatus}
        />
      ) : null}

      {permissionUser ? <PermissionModal user={permissionUser} onClose={() => setPermissionUser(null)} onSaved={(text) => { setPermissionUser(null); showMessage("success", text); loadUsers(); }} /> : null}

      {passwordUser ? (
        <div className="users-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPasswordUser(null); }}>
          <section className="users-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
            <header className="users-modal-header">
              <div className="users-modal-title-icon"><LockKeyhole size={19} /></div>
              <div><span>ACCOUNT PASSWORD</span><h3 id="password-modal-title">Set new password</h3><p>Assign a new password for {passwordUser.name}.</p></div>
              <button className="users-modal-close" type="button" disabled={saving} onClick={() => setPasswordUser(null)} aria-label="Close password form"><X size={18} /></button>
            </header>
            <form className="users-form" onSubmit={saveNewPassword}>
              <label><span>New password *</span><input autoFocus type="password" maxLength={72} value={newPassword} placeholder="Enter any password" onChange={(event) => setNewPassword(event.target.value)} /></label>
              <div className="users-modal-actions"><button className="users-cancel-button" type="button" disabled={saving} onClick={() => setPasswordUser(null)}>Cancel</button><button className="users-save-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save password"}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
