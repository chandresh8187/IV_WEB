import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Moon,
  Play,
  RefreshCw,
  Square,
  Sun,
} from "lucide-react";

import { getShiftStatusApi, toggleShiftApi } from "../../api/productionApi";
import { getStoredUser } from "../../api/authApi";
import socket from "../../socket/socket";
import "./ShiftScreen.css";

const formatDateTime = (value) => {
  if (!value) return "—";
  const normalized = String(value).includes("T")
    ? value
    : String(value).replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export default function ShiftScreen() {
  const user = useMemo(() => getStoredUser(), []);
  const [status, setStatus] = useState(null);
  const [selectedShift, setSelectedShift] = useState(
    user?.assigned_shift === "night" ? "night" : "day",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await getShiftStatusApi();
      setStatus(response?.data || null);
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Unable to load shift status.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    socket.on("shift_updated", loadStatus);
    socket.on("plant_status_updated", loadStatus);
    return () => {
      socket.off("shift_updated", loadStatus);
      socket.off("plant_status_updated", loadStatus);
    };
  }, [loadStatus]);

  const assigned = user?.assigned_shift || "both";
  const availableShifts = ["day", "night"].filter(
    (shift) => assigned === "both" || assigned === shift,
  );
  const active = Boolean(status?.is_shift_active);
  const ShiftIcon = status?.current_shift === "night" ? Moon : Sun;

  const handleToggle = async () => {
    const action = active ? "end" : "start";
    if (!window.confirm(`Are you sure you want to ${action} this shift?`)) return;

    setSaving(true);
    try {
      const response = await toggleShiftApi({ shift_name: selectedShift });
      setMessage({ type: "success", text: response?.message || "Shift updated." });
      await loadStatus();
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Unable to update the shift.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="shift-loading" role="status">
        <RefreshCw size={24} /> Loading shift status…
      </div>
    );
  }

  return (
    <div className="shift-screen">
      <header className="shift-page-heading">
        <div>
          <span>SHIFT CONTROL</span>
          <h2>Start or end your production shift</h2>
          <p>Your assigned shift: <strong>{assigned}</strong></p>
        </div>
        <button type="button" onClick={loadStatus} aria-label="Refresh shift status">
          <RefreshCw size={17} /> Refresh
        </button>
      </header>

      {message ? (
        <div className={`shift-message ${message.type}`} role="status">
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      ) : null}

      <section className={`shift-status-card ${active ? "active" : "inactive"}`}>
        <div className="shift-status-icon"><ShiftIcon size={31} /></div>
        <div>
          <span>CURRENT STATUS</span>
          <h3>{active ? `${status.current_shift} shift is active` : "No active manual shift"}</h3>
          <p>
            {status?.automatic
              ? "Shifts are currently controlled automatically by the schedule."
              : active
                ? "Production entry is available while the plant is running."
                : "Choose your assigned shift below to begin production."}
          </p>
        </div>
        <strong className="shift-state-pill">{active ? "Active" : "Inactive"}</strong>
      </section>

      <section className="shift-details-grid">
        <article><Clock3 size={18} /><span>Shift date</span><strong>{status?.shift_date || "—"}</strong></article>
        <article><Play size={18} /><span>Started at</span><strong>{formatDateTime(status?.active_shift?.start_time || status?.shift_start)}</strong></article>
        <article><Square size={18} /><span>Scheduled end</span><strong>{formatDateTime(status?.shift_end)}</strong></article>
      </section>

      {status?.plant_status !== "running" ? (
        <div className="shift-plant-warning">
          <AlertTriangle size={21} />
          <div><strong>{status?.plant_notice?.title || "Production is paused"}</strong><span>{status?.plant_notice?.message || "The plant is not marked as running."}</span></div>
        </div>
      ) : null}

      <section className="shift-control-card">
        <div>
          <span>MANUAL CONTROL</span>
          <h3>{active ? "End active shift" : "Select a shift to start"}</h3>
        </div>

        {!active ? (
          <div className="shift-selector" role="group" aria-label="Select shift">
            {availableShifts.map((shift) => {
              const Icon = shift === "night" ? Moon : Sun;
              return (
                <button key={shift} type="button" className={selectedShift === shift ? "selected" : ""} onClick={() => setSelectedShift(shift)}>
                  <Icon size={19} /> {shift} shift
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          className={`shift-toggle-button ${active ? "end" : "start"}`}
          type="button"
          disabled={saving || status?.automatic || (!active && status?.plant_status !== "running")}
          onClick={handleToggle}
        >
          {saving ? <RefreshCw className="shift-spin" size={18} /> : active ? <Square size={18} /> : <Play size={18} />}
          {saving ? "Updating…" : status?.automatic ? "Automatic shifts enabled" : active ? "End shift" : "Start shift"}
        </button>
      </section>
    </div>
  );
}
