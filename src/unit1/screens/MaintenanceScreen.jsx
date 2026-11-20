import { FileDown, RotateCcw } from "lucide-react";
import MaintenanceWorkflow from "../components/MaintenanceWorkflow";
import { durationText } from "../maintenance/timing";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import { hasAccess } from "../utils/access";
import {
  maintenanceOverview,
  maintenanceHistory,
  saveMaintenance,
  maintenancePdf,
} from "../api/maintenanceApi";
import { planFields, recordFields, errorMessage } from "../maintenance/forms";
import "./MaintenanceScreen.css";
function Dialog({ title, onClose, children, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      className="maintenance-dialog"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          disabled={busy}
          onClick={onClose}
          type="button"
          aria-label="Close maintenance dialog"
        >
          Close
        </button>
      </header>
      {children}
    </dialog>
  );
}
const amount = (v) =>
  v == null ? "Not recorded" : Number(v).toLocaleString("en-IN");
export default function MaintenanceScreen() {
  const user = useSelector((s) => s.auth.user),
    view = hasAccess(user, "unit1.maintenance.view"),
    manage = hasAccess(user, "unit1.maintenance.manage"),
    record = hasAccess(user, "unit1.maintenance.record");
  const client = useQueryClient(),
    navigate = useNavigate();
  const saved = useLocation().state?.maintenanceFilters || {};
  const [tab, setTab] = useState(
      saved.tab === "completed" || saved.tab === "history"
        ? "completed"
        : "running"
    ),
    [machine, setMachine] = useState(saved.machine || ""),
    [from, setFrom] = useState(saved.from || ""),
    [to, setTo] = useState(saved.to || ""),
    [state, setState] = useState(saved.state || "valid"),
    [page, setPage] = useState(saved.page || 1);
  const [adding, setAdding] = useState(false);
  const [editor, setEditor] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const filters = { machine_id: machine, from, to, state, page };
  const overview = useQuery({
    queryKey: ["unit1-maintenance", "overview"],
    queryFn: maintenanceOverview,
    enabled: view,
    refetchInterval: 60000,
  });
  const history = useQuery({
    queryKey: ["unit1-maintenance", "history", filters],
    queryFn: () => maintenanceHistory(filters),
    enabled: view && tab === "completed",
    refetchInterval: 60000,
  });
  const data = overview.data,
    logs = history.data;
  const set = (key, value) =>
    setEditor((e) => ({ ...e, form: { ...e.form, [key]: value } }));
  const open = (kind, form, voiding = false) => {
    setError("");
    setEditor({
      kind,
      form: { ...form, is_active: !!form.is_active, reason: "" },
      voiding,
    });
  };
  const close = () => {
    if (!busy) setEditor(null);
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveMaintenance(editor.kind, editor.form, editor.voiding);
      await client.invalidateQueries({ queryKey: ["unit1-maintenance"] });
      setEditor(null);
      setNotice("Maintenance saved. Schedules and reports updated.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const pdf = async () => {
    setBusy(true);
    setError("");
    try {
      const blob = await maintenancePdf({ ...filters, page: undefined });
      navigate("/production/reports/preview", {
        state: {
          blob,
          filename: `unit1-maintenance-${tab}.pdf`,
          reportTitle: "Maintenance report",
          printable: true,
          returnTo: "/production/maintenance",
          returnState: {
            maintenanceFilters: { tab, machine, from, to, state, page },
          },
        },
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  if (!view) return <p>Maintenance access is required.</p>;
  const stamp = (v) =>
    v
      ? new Date(v)
          .toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })
          .toUpperCase()
      : "Not recorded";
  const day = (v) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v || "")
      ? v.split("-").reverse().join("/")
      : "Not recorded";
  const savedMaintenance = (next) => {
    setTab(next);
    setMachine("");
    setFrom("");
    setTo("");
    setState("valid");
    setPage(1);
  };
  return (
    <section className="maintenance-page">
      <div className="maintenance-heading">
        <div>
          <p className="eyebrow">UNIT 1 / MACHINE CARE</p>
          <h1>Maintenance</h1>
          <p>
            Track machine breakdowns and completed maintenance. All times use
            IST.
          </p>
        </div>
        {record && (
          <button
            className="maintenance-add"
            disabled={!data}
            onClick={() => setAdding(true)}
          >
            Add Maintenance
          </button>
        )}
      </div>
      <div
        className="maintenance-tabs"
        role="tablist"
        aria-label="Maintenance sections"
      >
        <button
          role="tab"
          aria-selected={tab === "running"}
          onClick={() => setTab("running")}
        >
          Running maintenance
        </button>
        <button
          role="tab"
          aria-selected={tab === "completed"}
          onClick={() => setTab("completed")}
        >
          Completed maintenance
        </button>
      </div>
      <div className="maintenance-filters">
        <label>
          Machine filter
          <select
            value={machine}
            onChange={(e) => {
              setMachine(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All machines</option>
            {data?.machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} · {m.name}
              </option>
            ))}
          </select>
        </label>
        {tab === "completed" && (
          <>
            <label>
              From
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Records
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setPage(1);
                }}
              >
                <option value="valid">Valid records</option>
                <option value="voided">Voided records</option>
                <option value="all">All records</option>
              </select>
            </label>
            <div className="maintenance-filter-actions">
              <button
                type="button"
                className="maintenance-button-secondary"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setPage(1);
                }}
              >
                <RotateCcw size={16} aria-hidden="true" /> Clear dates
              </button>
              <button
                type="button"
                className="maintenance-button-primary"
                disabled={busy || !logs}
                onClick={pdf}
              >
                <FileDown size={17} aria-hidden="true" />
                {busy ? "Please wait…" : "Maintenance report PDF"}
              </button>
            </div>
          </>
        )}
      </div>
      {(error || overview.error || history.error) && !editor && (
        <p role="alert" className="maintenance-error">
          {error || errorMessage(overview.error || history.error)}{" "}
          <button
            onClick={() => {
              overview.refetch();
              history.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {overview.isPending && <p>Loading maintenance…</p>}
      <MaintenanceWorkflow
        data={data}
        updatedAt={overview.dataUpdatedAt}
        canRecord={record}
        adding={adding}
        onCloseAdd={() => setAdding(false)}
        machineFilter={machine}
        tab={tab}
        onSaved={savedMaintenance}
      />
      {tab === "completed" &&
        (history.isPending ? (
          <p>Loading completed maintenance…</p>
        ) : (
          logs && (
            <>
              <p className="maintenance-help">
                {logs.summary.total} completed records · Recorded cost:{" "}
                {amount(logs.summary.cost_total)} INR (includes approximate
                costs; voided records excluded)
              </p>
              <div className="maintenance-table maintenance-grid">
                <table>
                  <thead>
                    <tr>
                      {[
                        "ID",
                        "Machine",
                        "Maintenance reason",
                        "Date",
                        "Breakdown start (IST)",
                        "Breakdown end (IST)",
                        "Total breakdown time",
                        "Replace part name",
                        "Cost INR / basis",
                        "Action taken to complete",
                        "Remark",
                        "Completed / recorded by",
                        "Status / actions",
                      ].map((label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.rows.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td>
                          {r.machine_code} · {r.machine_name}
                        </td>
                        <td>
                          {r.maintenance_reason ||
                            (r.start_note
                              ? `Earlier note: ${r.start_note}`
                              : "Not recorded")}
                        </td>
                        <td>{day(r.service_date)}</td>
                        <td>{stamp(r.started_at)}</td>
                        <td>{stamp(r.ended_at)}</td>
                        <td>
                          {r.duration_seconds != null
                            ? durationText(r.duration_seconds)
                            : r.downtime_minutes != null
                            ? `${r.downtime_minutes} min (recorded)`
                            : "Not recorded"}
                        </td>
                        <td>{r.parts_used || "—"}</td>
                        <td>
                          {amount(r.cost)}
                          {r.cost != null
                            ? r.cost_basis === "approximate"
                              ? " (approx.)"
                              : " (recorded)"
                            : ""}
                        </td>
                        <td>{r.work_done}</td>
                        <td>{r.notes || "—"}</td>
                        <td>{r.recorded_by || r.technician}</td>
                        <td>
                          {r.voided_at
                            ? `Voided: ${r.void_reason}`
                            : "Completed"}
                          {manage && (
                            <div className="maintenance-actions">
                              {!r.voided_at && (
                                <>
                                  <button onClick={() => open("records", r)}>
                                    Correct
                                  </button>
                                  <button
                                    onClick={() => open("records", r, true)}
                                  >
                                    Void
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!logs.rows.length && (
                      <tr>
                        <td colSpan="13">
                          No completed maintenance for these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="maintenance-pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {Math.max(1, logs.pages)}
                </span>
                <button
                  disabled={page >= logs.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )
        ))}
      {editor && (
        <Dialog
          busy={busy}
          title={
            editor.voiding
              ? "Void service record"
              : `${editor.form.id ? "Edit" : "Add"} ${
                  editor.kind === "plans"
                    ? "maintenance schedule"
                    : "service record"
                }`
          }
          onClose={close}
        >
          <form onSubmit={submit}>
            {!editor.voiding && (
              <>
                <label>
                  Machine
                  <select
                    required
                    disabled={
                      !!editor.form.id &&
                      (editor.kind === "plans" || !!editor.form.session_id)
                    }
                    value={editor.form.machine_id}
                    onChange={(e) => {
                      set("machine_id", e.target.value);
                      set("plan_id", "");
                    }}
                  >
                    <option value="">Choose machine</option>
                    {data?.machines
                      .filter(
                        (m) => m.is_active || m.id === editor.form.machine_id
                      )
                      .map((m) => (
                        <option value={m.id} key={m.id}>
                          {m.code} · {m.name}
                        </option>
                      ))}
                  </select>
                </label>
                {editor.kind === "records" && (
                  <>
                    <label>
                      Schedule
                      <select
                        value={editor.form.plan_id || ""}
                        onChange={(e) => set("plan_id", e.target.value)}
                      >
                        <option value="">Unscheduled service</option>
                        {data?.plans
                          .filter(
                            (p) =>
                              String(p.machine_id) ===
                              String(editor.form.machine_id)
                          )
                          .map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Service type
                      <select
                        value={editor.form.maintenance_type}
                        onChange={(e) =>
                          set("maintenance_type", e.target.value)
                        }
                      >
                        {["preventive", "breakdown", "inspection"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <div className="maintenance-form-grid">
                  {(editor.kind === "plans"
                    ? planFields
                    : recordFields.filter(
                        ([key]) =>
                          !editor.form.session_id ||
                          !["service_date", "downtime_minutes"].includes(key)
                      )
                  ).map(([key, label, type, required]) => (
                    <label
                      key={key}
                      className={type === "textarea" ? "wide" : ""}
                    >
                      {key === "cost" &&
                      editor.form.cost_basis === "approximate"
                        ? "Approx cost (INR)"
                        : label}
                      {required ? " *" : ""}
                      {type === "textarea" ? (
                        <textarea
                          required={required}
                          maxLength={10000}
                          rows={3}
                          value={editor.form[key] ?? ""}
                          onChange={(e) => set(key, e.target.value)}
                        />
                      ) : (
                        <input
                          required={required}
                          type={type}
                          min={
                            type === "number"
                              ? key === "interval_days"
                                ? 1
                                : 0
                              : undefined
                          }
                          step={key === "cost" ? ".01" : 1}
                          maxLength={150}
                          value={editor.form[key] ?? ""}
                          onChange={(e) => set(key, e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      )}
                    </label>
                  ))}
                </div>
                {editor.kind === "plans" && (
                  <>
                    <label>
                      Priority
                      <select
                        value={editor.form.priority}
                        onChange={(e) => set("priority", e.target.value)}
                      >
                        {["normal", "high", "critical"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Schedule status
                      <select
                        value={editor.form.is_active ? "active" : "paused"}
                        onChange={(e) =>
                          set("is_active", e.target.value === "active")
                        }
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                      </select>
                    </label>
                  </>
                )}
                <p className="maintenance-help">
                  {editor.kind === "records"
                    ? "Enter actual work only. Leave unknown cost or downtime blank. Completing a scheduled service sets its next due date from the latest valid service."
                    : "Reminders use calendar days. Paused schedules and inactive machines do not send reminders."}
                </p>
              </>
            )}
            {!!editor.form.id && (
              <label>
                {editor.voiding
                  ? "Reason for voiding"
                  : "Reason for correction"}{" "}
                *
                <textarea
                  required
                  maxLength={1000}
                  value={editor.form.reason}
                  onChange={(e) => set("reason", e.target.value)}
                />
              </label>
            )}
            {error && (
              <p className="maintenance-error" role="alert">
                {error}
              </p>
            )}
            <footer>
              <button type="button" disabled={busy} onClick={close}>
                Cancel
              </button>
              <button disabled={busy} type="submit">
                {busy ? "Saving…" : editor.voiding ? "Void record" : "Save"}
              </button>
            </footer>
          </form>
        </Dialog>
      )}
    </section>
  );
}
