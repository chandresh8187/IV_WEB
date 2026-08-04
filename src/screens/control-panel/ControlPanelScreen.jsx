import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileClock,
  History,
  Info,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Wrench,
  X,
} from "lucide-react";

import {
  getAndroidUpdateApi,
  getAuditLogsApi,
  getControlPanelSettingsApi,
  updateAndroidUpdateApi,
  updateControlPanelSettingApi,
  uploadAndroidApkApi,
} from "../../api/controlPanelApi";
import socket from "../../socket/socket";
import "./ControlPanelScreen.css";

const EMPTY_UPDATE = {
  enabled: false,
  latestVersionCode: "",
  latestVersionName: "",
  minimumVersionCode: "0",
  mandatory: false,
  apkUrl: "",
  sha256: "",
  releaseNotes: "",
  updatedAt: null,
};

const EMPTY_SETTINGS = {
  zinc_alert_threshold: {
    enabled: true,
    percentage: "7.50",
  },
  shift_schedule: {
    automatic: true,
    day_start: "08:00",
    night_start: "20:00",
  },
  maintenance_mode: {
    enabled: false,
    message: "",
  },
};

const TABS = [
  { key: "overview", label: "Overview", icon: SlidersHorizontal },
  { key: "update", label: "Native Update", icon: Smartphone },
  { key: "settings", label: "App Settings", icon: Settings2 },
  { key: "audit", label: "Audit Log", icon: History },
];

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
  if (!value) return "Not updated yet";
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

function parseMetadata(value) {
  if (!value) return "-";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Object.entries(parsed)
      .map(([key, item]) => `${key}: ${String(item ?? "-")}`)
      .join(" • ");
  } catch {
    return String(value);
  }
}

function Message({ value, onClose }) {
  if (!value) return null;
  const Icon = value.type === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`control-message ${value.type}`}>
      <Icon size={18} />
      <span>{value.text}</span>
      <button type="button" onClick={onClose} aria-label="Close message">
        <X size={16} />
      </button>
    </div>
  );
}

function Switch({ checked, onChange, disabled = false, label }) {
  return (
    <label className={`control-switch-row ${disabled ? "disabled" : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`control-switch ${checked ? "active" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
      <span>{label}</span>
    </label>
  );
}

function StatusPill({
  active,
  activeText = "Enabled",
  inactiveText = "Disabled",
}) {
  return (
    <span className={`control-status-pill ${active ? "active" : "inactive"}`}>
      <span />
      {active ? activeText : inactiveText}
    </span>
  );
}

function OverviewCard({
  icon: Icon,
  eyebrow,
  title,
  children,
  tone = "blue",
  onOpen,
}) {
  return (
    <article className="control-overview-card">
      <div className={`control-overview-icon ${tone}`}>
        <Icon size={20} />
      </div>
      <div className="control-overview-copy">
        <small>{eyebrow}</small>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      <button type="button" onClick={onOpen} aria-label={`Open ${eyebrow}`}>
        <ChevronRight size={17} />
      </button>
    </article>
  );
}

export default function ControlPanelScreen() {
  const user = useMemo(() => getLoggedUser(), []);
  const isSuperadmin = user?.role === "superadmin";
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState(null);
  const [updateForm, setUpdateForm] = useState(EMPTY_UPDATE);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState("");

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => {
      setMessage((current) => (current?.text === text ? null : current));
    }, 4500);
  }, []);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const requests = [getControlPanelSettingsApi(), getAndroidUpdateApi()];
        if (isSuperadmin) requests.push(getAuditLogsApi(100));

        const [settingsResponse, updateResponse, auditResponse] =
          await Promise.all(requests);
        const serverSettings = settingsResponse?.data || {};

        setSettings({
          zinc_alert_threshold: {
            ...EMPTY_SETTINGS.zinc_alert_threshold,
            ...(serverSettings.zinc_alert_threshold || {}),
            percentage: String(
              serverSettings.zinc_alert_threshold?.percentage ?? "7.50",
            ),
          },
          shift_schedule: {
            ...EMPTY_SETTINGS.shift_schedule,
            ...(serverSettings.shift_schedule || {}),
          },
          maintenance_mode: {
            ...EMPTY_SETTINGS.maintenance_mode,
            ...(serverSettings.maintenance_mode || {}),
          },
        });

        setUpdateForm({
          ...EMPTY_UPDATE,
          ...(updateResponse || {}),
          latestVersionCode: String(updateResponse?.latestVersionCode ?? ""),
          minimumVersionCode: String(updateResponse?.minimumVersionCode ?? "0"),
        });

        if (isSuperadmin) {
          setAuditLogs(
            Array.isArray(auditResponse?.data) ? auditResponse.data : [],
          );
        }
      } catch (error) {
        showMessage(
          "error",
          getErrorMessage(error, "Unable to load control panel."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSuperadmin, showMessage],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const refreshScreen = () => loadData({ silent: true });
    socket.on("app_setting_changed", refreshScreen);
    socket.on("app_update_configuration_changed", refreshScreen);
    return () => {
      socket.off("app_setting_changed", refreshScreen);
      socket.off("app_update_configuration_changed", refreshScreen);
    };
  }, [loadData]);

  const updateSettingState = (group, key, value) => {
    setSettings((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }));
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadData({ silent: true });
    showMessage("success", "Control panel refreshed.");
  };

  const saveAndroidUpdate = async (event) => {
    event.preventDefault();
    const latest = Number(updateForm.latestVersionCode);
    const minimum = Number(updateForm.minimumVersionCode);
    if (
      !Number.isInteger(latest) ||
      latest < 1 ||
      !updateForm.latestVersionName.trim()
    ) {
      showMessage(
        "error",
        "Enter a valid latest version name and version code.",
      );
      return;
    }
    if (!Number.isInteger(minimum) || minimum < 0 || minimum > latest) {
      showMessage(
        "error",
        "Minimum version code must be between 0 and latest version code.",
      );
      return;
    }
    if (
      updateForm.enabled &&
      (!/^https:\/\//i.test(updateForm.apkUrl.trim()) ||
        !/^[a-f0-9]{64}$/i.test(updateForm.sha256.trim()))
    ) {
      showMessage(
        "error",
        "Enabled updates require an HTTPS APK URL and 64-character SHA-256.",
      );
      return;
    }

    setSaving("update");
    try {
      const response = await updateAndroidUpdateApi({
        ...updateForm,
        latestVersionCode: latest,
        minimumVersionCode: minimum,
        latestVersionName: updateForm.latestVersionName.trim(),
        apkUrl: updateForm.apkUrl.trim(),
        sha256: updateForm.sha256.trim().toLowerCase(),
        releaseNotes: updateForm.releaseNotes.trim(),
      });
      if (response?.data) {
        setUpdateForm((current) => ({ ...current, ...response.data }));
      }
      showMessage(
        "success",
        response?.message || "Android update configuration saved.",
      );
      await loadData({ silent: true });
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(error, "Unable to save Android update."),
      );
    } finally {
      setSaving("");
    }
  };

  const uploadApk = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apk")) {
      showMessage("error", "Please select an Android .apk file.");
      return;
    }
    setSaving("apk-upload");
    setUploadProgress(0);
    try {
      const response = await uploadAndroidApkApi(file, (event) => {
        if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      });
      setUpdateForm((current) => ({
        ...current,
        apkUrl: response.data.apkUrl,
        sha256: response.data.sha256,
      }));
      showMessage("success", "APK uploaded. Confirm the version details and save the Android update.");
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Unable to upload APK."));
    } finally {
      setSaving("");
    }
  };

  const saveSetting = async (key) => {
    let body = settings[key];
    if (key === "zinc_alert_threshold") {
      const percentage = Number(body.percentage);
      if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
        showMessage(
          "error",
          "Zinc threshold must be greater than 0 and not more than 100.",
        );
        return;
      }
      body = { enabled: Boolean(body.enabled), percentage };
    }
    if (key === "maintenance_mode" && body.enabled && !body.message.trim()) {
      showMessage("error", "Enter a message before enabling maintenance mode.");
      return;
    }

    setSaving(key);
    try {
      const response = await updateControlPanelSettingApi({ key, body });
      showMessage("success", response?.message || "Setting saved.");
      await loadData({ silent: true });
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Unable to save setting."));
    } finally {
      setSaving("");
    }
  };

  const filteredAuditLogs = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();
    if (!query) return auditLogs;
    return auditLogs.filter((item) =>
      [
        item.actor_name,
        item.actor_email,
        item.action,
        item.entity_type,
        item.entity_id,
        parseMetadata(item.metadata),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [auditLogs, auditSearch]);

  if (!isSuperadmin) {
    return (
      <div className="control-access-card">
        <ShieldAlert size={34} />
        <strong>Superadmin access required</strong>
        <p>Only a superadmin can open and change Control Panel settings.</p>
      </div>
    );
  }

  return (
    <div className="control-panel-screen">
      <div className="control-toolbar">
        <div>
          <span className="control-overline">SYSTEM ADMINISTRATION</span>
          <h2>Control Panel</h2>
          <p>
            Manage mobile releases, plant rules and system-wide application
            settings.
          </p>
        </div>
        <button type="button" disabled={refreshing} onClick={refresh}>
          <RefreshCw
            size={16}
            className={refreshing ? "control-spinning" : ""}
          />
          Refresh
        </button>
      </div>

      <Message value={message} onClose={() => setMessage(null)} />

      <div className="control-layout">
        <aside className="control-tabs" aria-label="Control panel sections">
          <div className="control-admin-card">
            <span>
              <ShieldCheck size={19} />
            </span>
            <div>
              <small>Signed in as</small>
              <strong>{user?.name || "Superadmin"}</strong>
              <em>Full system access</em>
            </div>
          </div>
          <nav>
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={activeTab === item.key ? "active" : ""}
                  onClick={() => setActiveTab(item.key)}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </nav>
          <div className="control-warning-note">
            <Info size={16} />
            <p>Changes here affect every connected mobile and web user.</p>
          </div>
        </aside>

        <main className="control-content">
          {loading ? (
            <div className="control-state">
              <RefreshCw size={29} className="control-spinning" />
              <strong>Loading control panel...</strong>
            </div>
          ) : null}

          {!loading && activeTab === "overview" ? (
            <section className="control-section">
              <header className="control-section-header">
                <div>
                  <span>SYSTEM SNAPSHOT</span>
                  <h3>Current configuration</h3>
                </div>
                <StatusPill active activeText="Backend connected" />
              </header>
              <div className="control-overview-grid">
                <OverviewCard
                  icon={Smartphone}
                  eyebrow="Android update"
                  title={updateForm.latestVersionName || "Not configured"}
                  tone="blue"
                  onOpen={() => setActiveTab("update")}
                >
                  {updateForm.enabled
                    ? `${updateForm.mandatory ? "Mandatory" : "Optional"} release • Code ${updateForm.latestVersionCode}`
                    : "Native update publishing is disabled."}
                </OverviewCard>
                <OverviewCard
                  icon={BellRing}
                  eyebrow="Zinc alert"
                  title={`${settings.zinc_alert_threshold.percentage}%`}
                  tone="amber"
                  onOpen={() => setActiveTab("settings")}
                >
                  {settings.zinc_alert_threshold.enabled
                    ? "Supervisors are warned above this consumption."
                    : "Zinc threshold notifications are disabled."}
                </OverviewCard>
                <OverviewCard
                  icon={Clock3}
                  eyebrow="Automatic shifts"
                  title={
                    settings.shift_schedule.automatic ? "Active" : "Manual"
                  }
                  tone="violet"
                  onOpen={() => setActiveTab("settings")}
                >
                  Day {settings.shift_schedule.day_start} • Night{" "}
                  {settings.shift_schedule.night_start}
                </OverviewCard>
                <OverviewCard
                  icon={Wrench}
                  eyebrow="Maintenance mode"
                  title={
                    settings.maintenance_mode.enabled
                      ? "Enabled"
                      : "Application online"
                  }
                  tone={settings.maintenance_mode.enabled ? "red" : "green"}
                  onOpen={() => setActiveTab("settings")}
                >
                  {settings.maintenance_mode.enabled
                    ? settings.maintenance_mode.message ||
                      "Access is temporarily restricted."
                    : "All users can access the application normally."}
                </OverviewCard>
              </div>
              <div className="control-overview-footer">
                <FileClock size={17} />
                <div>
                  <strong>Latest native-release configuration</strong>
                  <span>{formatDateTime(updateForm.updatedAt)}</span>
                </div>
                <button type="button" onClick={() => setActiveTab("audit")}>
                  View audit history
                </button>
              </div>
            </section>
          ) : null}

          {!loading && activeTab === "update" ? (
            <form className="control-section" onSubmit={saveAndroidUpdate}>
              <header className="control-section-header">
                <div>
                  <span>MOBILE DISTRIBUTION</span>
                  <h3>Android native update</h3>
                </div>
                <StatusPill active={updateForm.enabled} />
              </header>
              <div className="control-section-body">
                <div className="control-setting-intro">
                  <span className="blue">
                    <Smartphone size={20} />
                  </span>
                  <div>
                    <strong>Publish a new APK outside Google Play</strong>
                    <p>
                      The installed app checks this configuration and shows the
                      unified update popup when a newer native version is
                      available.
                    </p>
                  </div>
                  <Switch
                    checked={updateForm.enabled}
                    onChange={(value) =>
                      setUpdateForm((current) => ({
                        ...current,
                        enabled: value,
                      }))
                    }
                    label="Update available"
                  />
                </div>

                <div className="control-form-grid">
                  <label className="control-field control-wide">
                    <span>Upload release APK</span>
                    <input type="file" accept=".apk,application/vnd.android.package-archive" disabled={saving === "apk-upload"} onChange={(event) => { uploadApk(event.target.files?.[0]); event.target.value = ""; }} />
                    <small>{saving === "apk-upload" ? `Uploading ${uploadProgress}%...` : "The download URL and SHA-256 are filled automatically after upload."}</small>
                  </label>
                  <label className="control-field">
                    <span>Latest Version Name *</span>
                    <input
                      value={updateForm.latestVersionName}
                      placeholder="Example: 1.4.0"
                      onChange={(event) =>
                        setUpdateForm((current) => ({
                          ...current,
                          latestVersionName: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="control-field">
                    <span>Latest Version Code *</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={updateForm.latestVersionCode}
                      placeholder="Example: 14"
                      onChange={(event) =>
                        setUpdateForm((current) => ({
                          ...current,
                          latestVersionCode: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="control-field">
                    <span>Minimum Supported Version Code *</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={updateForm.minimumVersionCode}
                      onChange={(event) =>
                        setUpdateForm((current) => ({
                          ...current,
                          minimumVersionCode: event.target.value,
                        }))
                      }
                    />
                    <small>
                      Users below this code must install the update.
                    </small>
                  </label>
                  <div className="control-toggle-field">
                    <span>Update Requirement</span>
                    <Switch
                      checked={updateForm.mandatory}
                      onChange={(value) =>
                        setUpdateForm((current) => ({
                          ...current,
                          mandatory: value,
                        }))
                      }
                      label={
                        updateForm.mandatory
                          ? "Mandatory update"
                          : "Optional update"
                      }
                    />
                    <small>
                      Mandatory prevents users from dismissing the popup.
                    </small>
                  </div>
                  <label className="control-field control-wide">
                    <span>APK Download URL *</span>
                    <input
                      type="url"
                      value={updateForm.apkUrl}
                      placeholder="https://app.ivsquarestructure.com/downloads/iv-app.apk"
                      onChange={(event) =>
                        setUpdateForm((current) => ({
                          ...current,
                          apkUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="control-field control-wide">
                    <span>APK SHA-256 *</span>
                    <input
                      className="control-mono"
                      maxLength="64"
                      value={updateForm.sha256}
                      placeholder="64-character SHA-256 checksum"
                      onChange={(event) =>
                        setUpdateForm((current) => ({
                          ...current,
                          sha256: event.target.value,
                        }))
                      }
                    />
                    <small>{updateForm.sha256.length}/64 characters</small>
                  </label>
                  <label className="control-field control-wide">
                    <span>Release Notes</span>
                    <textarea
                      rows="5"
                      value={updateForm.releaseNotes}
                      placeholder="Describe improvements, fixes and important changes..."
                      onChange={(event) =>
                        setUpdateForm((current) => ({
                          ...current,
                          releaseNotes: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="control-security-note">
                  <ShieldCheck size={18} />
                  <p>
                    <strong>APK verification:</strong> the mobile app must
                    compare the downloaded file with this SHA-256 value before
                    installation.
                  </p>
                </div>
              </div>
              <footer className="control-section-footer">
                <span>
                  Last updated: {formatDateTime(updateForm.updatedAt)}
                </span>
                <button type="submit" disabled={saving === "update"}>
                  {saving === "update" ? (
                    <RefreshCw size={16} className="control-spinning" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Android Update
                </button>
              </footer>
            </form>
          ) : null}

          {!loading && activeTab === "settings" ? (
            <section className="control-section">
              <header className="control-section-header">
                <div>
                  <span>GLOBAL RULES</span>
                  <h3>Application settings</h3>
                </div>
              </header>
              <div className="control-settings-stack">
                <article className="control-setting-card">
                  <div className="control-setting-card-head">
                    <span className="amber">
                      <BellRing size={19} />
                    </span>
                    <div>
                      <strong>Zinc consumption alert</strong>
                      <p>
                        Notify when the current month's total zinc consumption exceeds this limit. Individual challan alerts use each planning target.
                      </p>
                    </div>
                    <Switch
                      checked={settings.zinc_alert_threshold.enabled}
                      onChange={(value) =>
                        updateSettingState(
                          "zinc_alert_threshold",
                          "enabled",
                          value,
                        )
                      }
                      label="Enabled"
                    />
                  </div>
                  <div className="control-setting-card-body">
                    <label className="control-field">
                      <span>Alert Threshold (%)</span>
                      <div className="control-input-suffix">
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={settings.zinc_alert_threshold.percentage}
                          onChange={(event) =>
                            updateSettingState(
                              "zinc_alert_threshold",
                              "percentage",
                              event.target.value,
                            )
                          }
                        />
                        <span>%</span>
                      </div>
                    </label>
                    <button
                      type="button"
                      disabled={saving === "zinc_alert_threshold"}
                      onClick={() => saveSetting("zinc_alert_threshold")}
                    >
                      {saving === "zinc_alert_threshold" ? (
                        <RefreshCw size={15} className="control-spinning" />
                      ) : (
                        <Save size={15} />
                      )}
                      Save Zinc Alert
                    </button>
                  </div>
                </article>

                <article className="control-setting-card">
                  <div className="control-setting-card-head">
                    <span className="violet">
                      <Clock3 size={19} />
                    </span>
                    <div>
                      <strong>Shift schedule</strong>
                      <p>
                        Control automatic day and night shift start boundaries.
                      </p>
                    </div>
                    <Switch
                      checked={settings.shift_schedule.automatic}
                      onChange={(value) =>
                        updateSettingState("shift_schedule", "automatic", value)
                      }
                      label="Automatic"
                    />
                  </div>
                  <div className="control-setting-card-body control-shift-fields">
                    <label className="control-field">
                      <span>Day Shift Starts</span>
                      <input
                        type="time"
                        value={settings.shift_schedule.day_start}
                        onChange={(event) =>
                          updateSettingState(
                            "shift_schedule",
                            "day_start",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <label className="control-field">
                      <span>Night Shift Starts</span>
                      <input
                        type="time"
                        value={settings.shift_schedule.night_start}
                        onChange={(event) =>
                          updateSettingState(
                            "shift_schedule",
                            "night_start",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={saving === "shift_schedule"}
                      onClick={() => saveSetting("shift_schedule")}
                    >
                      {saving === "shift_schedule" ? (
                        <RefreshCw size={15} className="control-spinning" />
                      ) : (
                        <Save size={15} />
                      )}
                      Save Schedule
                    </button>
                  </div>
                </article>

                <article
                  className={`control-setting-card ${settings.maintenance_mode.enabled ? "danger" : ""}`}
                >
                  <div className="control-setting-card-head">
                    <span className="red">
                      <Wrench size={19} />
                    </span>
                    <div>
                      <strong>Maintenance mode</strong>
                      <p>
                        Temporarily block normal application use while
                        maintenance is in progress.
                      </p>
                    </div>
                    <Switch
                      checked={settings.maintenance_mode.enabled}
                      onChange={(value) =>
                        updateSettingState("maintenance_mode", "enabled", value)
                      }
                      label={
                        settings.maintenance_mode.enabled
                          ? "Maintenance active"
                          : "Application online"
                      }
                    />
                  </div>
                  <div className="control-setting-card-body control-maintenance-body">
                    <label className="control-field">
                      <span>User Message</span>
                      <textarea
                        rows="3"
                        value={settings.maintenance_mode.message}
                        placeholder="Example: The application is under maintenance. Please try again after 08:30 PM."
                        onChange={(event) =>
                          updateSettingState(
                            "maintenance_mode",
                            "message",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={saving === "maintenance_mode"}
                      onClick={() => saveSetting("maintenance_mode")}
                    >
                      {saving === "maintenance_mode" ? (
                        <RefreshCw size={15} className="control-spinning" />
                      ) : (
                        <Save size={15} />
                      )}
                      Save Maintenance Mode
                    </button>
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          {!loading && activeTab === "audit" ? (
            <section className="control-section">
              <header className="control-section-header control-audit-header">
                <div>
                  <span>SECURITY HISTORY</span>
                  <h3>Recent administrative activity</h3>
                </div>
                <label className="control-search">
                  <Search size={16} />
                  <input
                    type="search"
                    value={auditSearch}
                    placeholder="Search actor, action or setting..."
                    onChange={(event) => setAuditSearch(event.target.value)}
                  />
                </label>
              </header>
              {filteredAuditLogs.length ? (
                <div className="control-table-scroll">
                  <table className="control-audit-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Administrator</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Changed Values</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.map((item) => (
                        <tr key={item.id}>
                          <td>{formatDateTime(item.created_at)}</td>
                          <td>
                            <strong>{item.actor_name || "System"}</strong>
                            <span>{item.actor_email || "-"}</span>
                          </td>
                          <td>
                            <em>
                              {String(item.action || "-").replaceAll("_", " ")}
                            </em>
                          </td>
                          <td>
                            {item.entity_type || "-"}
                            {item.entity_id ? ` / ${item.entity_id}` : ""}
                          </td>
                          <td title={parseMetadata(item.metadata)}>
                            {parseMetadata(item.metadata)}
                          </td>
                          <td>{item.ip_address || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="control-state">
                  <History size={31} />
                  <strong>No audit entries found</strong>
                  <span>
                    {auditSearch
                      ? "Try another search."
                      : "Administrative changes will appear here."}
                  </span>
                </div>
              )}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
