import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Factory,
  History,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

import {
  getPlantStatusApi,
  getPlantStatusHistoryApi,
  updatePlantStatusApi,
} from "../../api/plantControlApi";

import socket from "../../socket/socket";
import "./PlantControlScreen.css";

const statusConfig = {
  running: {
    label: "Running",
    icon: PlayCircle,
    description: "Production entry and normal plant operations are enabled.",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    description:
      "Production entry is blocked while maintenance is in progress.",
  },
  stopped: {
    label: "Stopped",
    icon: Square,
    description: "Production entry and plant operations are stopped.",
  },
};

const emptyForm = {
  status: "maintenance",
  title: "",
  message: "",
  expected_restart_at: "",
};

function getLoggedUser() {
  for (const key of ["iv_user", "user", "auth"]) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      if (value?.user) return value.user;
      if (value?.role) return value;
    } catch {
      // Try the next supported storage key.
    }
  }
  return {};
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLocalDateTimeMinimum() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function formatDuration(minutes) {
  const total = Math.max(0, Number(minutes) || 0);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = Math.floor(total % 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function StatusIcon({ status, size = 20 }) {
  const Icon = statusConfig[status]?.icon || AlertTriangle;
  return <Icon size={size} />;
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  return (
    <article className={`plant-control-summary-card ${tone}`}>
      <span>
        <Icon size={19} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

export default function PlantControlScreen() {
  const user = useMemo(() => getLoggedUser(), []);
  const role = String(user?.role || "")
    .toLowerCase()
    .trim();
  const canView = ["superadmin", "plant_manager", "admin"].includes(role);
  const canControl = ["superadmin", "plant_manager"].includes(role);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => {
      setMessage((current) => (current?.text === text ? null : current));
    }, 4500);
  }, []);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!canView) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!silent) setLoading(true);
      try {
        const [statusResponse, historyResponse] = await Promise.all([
          getPlantStatusApi(),
          getPlantStatusHistoryApi(),
        ]);
        setStatus(statusResponse?.data || null);
        setHistory(
          Array.isArray(historyResponse?.data) ? historyResponse.data : [],
        );
      } catch (error) {
        showMessage(
          "error",
          getErrorMessage(error, "Unable to load plant control data."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView, showMessage],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!canView) return undefined;

    if (!socket.connected) socket.connect();
    const handleUpdate = (updated) => {
      if (updated) setStatus(updated);
      loadData({ silent: true });
    };
    socket.on("plant_status_updated", handleUpdate);
    return () => socket.off("plant_status_updated", handleUpdate);
  }, [canView, loadData]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const requestStatusChange = (event) => {
    event.preventDefault();
    if (!canControl) return;
    if (
      form.status !== "running" &&
      (!form.title.trim() || !form.message.trim())
    ) {
      showMessage("error", "Title and operator message are required.");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmStatusChange = async () => {
    setSaving(true);
    try {
      const payload = {
        status: form.status,
        title: form.status === "running" ? null : form.title.trim(),
        message: form.status === "running" ? null : form.message.trim(),
        expected_restart_at:
          form.status === "running" || !form.expected_restart_at
            ? null
            : form.expected_restart_at,
      };
      const response = await updatePlantStatusApi(payload);
      setStatus(response?.data || status);
      setForm(emptyForm);
      setConfirmOpen(false);
      showMessage(
        "success",
        response?.message || "Plant status updated successfully.",
      );
      await loadData({ silent: true });
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(error, "Unable to update plant status."),
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!query) return true;
      return [
        item.title,
        item.message,
        item.started_by_name,
        item.ended_by_name,
        item.status,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [history, search, statusFilter]);

  const historyStats = useMemo(
    () => ({
      total: history.length,
      maintenance: history.filter((item) => item.status === "maintenance")
        .length,
      stopped: history.filter((item) => item.status === "stopped").length,
      open: history.filter((item) => !item.ended_at).length,
    }),
    [history],
  );

  const currentStatus = status?.status || "running";
  const currentConfig = statusConfig[currentStatus] || statusConfig.running;

  if (!canView) {
    return (
      <section className="plant-control-access-denied">
        <ShieldCheck size={35} />
        <h2>Plant Control access denied</h2>
        <p>Your account does not have permission to view this screen.</p>
      </section>
    );
  }

  return (
    <div className="plant-control-screen">
      <header className="plant-control-toolbar">
        <div>
          <span className="plant-control-overline">OPERATIONS CONTROL</span>
          <h2>Plant control</h2>
          <p>
            Control production availability and keep a traceable maintenance
            history.
          </p>
        </div>
        <button
          className="plant-control-refresh"
          type="button"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            loadData({ silent: true });
          }}
        >
          <RefreshCw
            className={refreshing ? "plant-control-spinning" : ""}
            size={16}
          />
          Refresh
        </button>
      </header>

      {message ? (
        <div className={`plant-control-message ${message.type}`}>
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

      {loading ? (
        <section className="plant-control-loader">
          <RefreshCw className="plant-control-spinning" size={29} />
          <strong>Loading plant controls...</strong>
        </section>
      ) : (
        <>
          <section className={`plant-control-current ${currentStatus}`}>
            <div className="plant-control-current-icon">
              <StatusIcon status={currentStatus} size={30} />
            </div>
            <div className="plant-control-current-copy">
              <span>CURRENT PLANT STATUS</span>
              <h3>{currentConfig.label}</h3>
              <p>{status?.message || currentConfig.description}</p>
            </div>
            <div className="plant-control-current-details">
              <div>
                <span>Production entry</span>
                <strong>
                  {status?.production_allowed ? "Enabled" : "Blocked"}
                </strong>
              </div>
              <div>
                <span>Status since</span>
                <strong>
                  {formatDateTime(status?.started_at || status?.updated_at)}
                </strong>
              </div>
              <div>
                <span>Expected restart</span>
                <strong>{formatDateTime(status?.expected_restart_at)}</strong>
              </div>
              <div>
                <span>Updated by</span>
                <strong>{status?.updated_by?.name || "System"}</strong>
              </div>
            </div>
          </section>

          <section className="plant-control-summary-grid">
            <SummaryCard
              icon={History}
              label="History records"
              value={historyStats.total}
              tone="blue"
            />
            <SummaryCard
              icon={Wrench}
              label="Maintenance events"
              value={historyStats.maintenance}
              tone="amber"
            />
            <SummaryCard
              icon={AlertOctagon}
              label="Stopped events"
              value={historyStats.stopped}
              tone="red"
            />
            <SummaryCard
              icon={Activity}
              label="Active event"
              value={historyStats.open ? "Yes" : "No"}
              tone="green"
            />
          </section>

          <div
            className={`plant-control-main-grid ${canControl ? "" : "view-only"}`}
          >
            {canControl ? (
              <section className="plant-control-card plant-control-change-card">
                <header>
                  <div>
                    <span className="plant-control-card-icon">
                      <ShieldCheck size={18} />
                    </span>
                    <div>
                      <h3>Change plant status</h3>
                      <p>This immediately changes production availability.</p>
                    </div>
                  </div>
                </header>

                <form onSubmit={requestStatusChange}>
                  <div className="plant-control-status-options">
                    {Object.entries(statusConfig).map(([value, option]) => (
                      <button
                        key={value}
                        className={`${value} ${form.status === value ? "active" : ""}`}
                        type="button"
                        onClick={() => updateField("status", value)}
                      >
                        <StatusIcon status={value} size={19} />
                        <span>
                          <strong>{option.label}</strong>
                          <small>
                            {value === "running"
                              ? "Allow production"
                              : "Block production"}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>

                  {form.status !== "running" ? (
                    <div className="plant-control-form-fields">
                      <label>
                        <span>Notice title *</span>
                        <input
                          type="text"
                          maxLength={120}
                          value={form.title}
                          placeholder={
                            form.status === "maintenance"
                              ? "Example: Kettle maintenance"
                              : "Example: Emergency plant stop"
                          }
                          onChange={(event) =>
                            updateField("title", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        <span>Operator message *</span>
                        <textarea
                          rows={4}
                          maxLength={500}
                          value={form.message}
                          placeholder="Explain why production is blocked and what staff should do."
                          onChange={(event) =>
                            updateField("message", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        <span>Expected restart (optional)</span>
                        <input
                          type="datetime-local"
                          min={getLocalDateTimeMinimum()}
                          value={form.expected_restart_at}
                          onChange={(event) =>
                            updateField(
                              "expected_restart_at",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="plant-control-running-note">
                      <CheckCircle2 size={18} />
                      <span>
                        <strong>Resume normal operations</strong>Production
                        entry will be enabled for supervisors immediately.
                      </span>
                    </div>
                  )}

                  <button
                    className={`plant-control-submit ${form.status}`}
                    type="submit"
                    disabled={saving || form.status === currentStatus}
                  >
                    <StatusIcon status={form.status} size={17} />
                    {form.status === currentStatus
                      ? `Plant is already ${currentConfig.label.toLowerCase()}`
                      : `Set plant to ${statusConfig[form.status].label}`}
                  </button>
                </form>
              </section>
            ) : null}

            <section className="plant-control-card plant-control-guidance">
              <header>
                <div>
                  <span className="plant-control-card-icon">
                    <Factory size={18} />
                  </span>
                  <div>
                    <h3>Operation guide</h3>
                    <p>How each plant state affects the IV system.</p>
                  </div>
                </div>
              </header>
              <div className="plant-control-guide-list">
                {Object.entries(statusConfig).map(([value, option]) => (
                  <article className={value} key={value}>
                    <span>
                      <StatusIcon status={value} size={18} />
                    </span>
                    <div>
                      <strong>{option.label}</strong>
                      <p>{option.description}</p>
                    </div>
                  </article>
                ))}
              </div>
              {!canControl ? (
                <div className="plant-control-view-note">
                  <ShieldCheck size={17} />
                  Your role has view-only access. A Plant Manager or Superadmin
                  can change status.
                </div>
              ) : null}
            </section>
          </div>

          <section className="plant-control-card plant-control-history-card">
            <header className="plant-control-history-header">
              <div>
                <span className="plant-control-card-icon">
                  <History size={18} />
                </span>
                <div>
                  <h3>Status history</h3>
                  <p>Maintenance and stoppage audit trail.</p>
                </div>
              </div>
              <div className="plant-control-history-tools">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All events</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="stopped">Stopped</option>
                </select>
                <label>
                  <Search size={15} />
                  <input
                    type="search"
                    value={search}
                    placeholder="Search title, message or person..."
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>
            </header>

            {filteredHistory.length ? (
              <div className="plant-control-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Title & message</th>
                      <th>Started</th>
                      <th>Expected restart</th>
                      <th>Ended</th>
                      <th>Duration</th>
                      <th>Started by</th>
                      <th>Ended by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span
                            className={`plant-control-status-pill ${item.status}`}
                          >
                            <StatusIcon status={item.status} size={13} />
                            {statusConfig[item.status]?.label || item.status}
                          </span>
                        </td>
                        <td className="plant-control-reason">
                          <strong>{item.title || "-"}</strong>
                          <span>{item.message || "-"}</span>
                        </td>
                        <td>{formatDateTime(item.started_at)}</td>
                        <td>{formatDateTime(item.expected_restart_at)}</td>
                        <td>
                          {item.ended_at ? (
                            formatDateTime(item.ended_at)
                          ) : (
                            <span className="plant-control-active-pill">
                              Active
                            </span>
                          )}
                        </td>
                        <td>{formatDuration(item.duration_minutes)}</td>
                        <td>
                          <span className="plant-control-person">
                            <UserRound size={13} />
                            {item.started_by_name || "System"}
                          </span>
                        </td>
                        <td>{item.ended_by_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="plant-control-empty">
                <History size={30} />
                <strong>No status records found</strong>
                <span>Try changing the search or event filter.</span>
              </div>
            )}
          </section>
        </>
      )}

      {confirmOpen ? (
        <div
          className="plant-control-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setConfirmOpen(false)
          }
        >
          <section
            className={`plant-control-confirm ${form.status}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plant-control-confirm-title"
          >
            <span className="plant-control-confirm-icon">
              <StatusIcon status={form.status} size={25} />
            </span>
            <span className="plant-control-overline">CONFIRM OPERATION</span>
            <h3 id="plant-control-confirm-title">
              Set plant to {statusConfig[form.status].label}?
            </h3>
            <p>{statusConfig[form.status].description}</p>
            {form.status !== "running" ? (
              <div>
                <strong>{form.title}</strong>
                <span>{form.message}</span>
              </div>
            ) : null}
            <footer>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={form.status}
                type="button"
                onClick={confirmStatusChange}
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw className="plant-control-spinning" size={16} />
                ) : (
                  <StatusIcon status={form.status} size={16} />
                )}
                {saving ? "Updating..." : "Confirm status change"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
