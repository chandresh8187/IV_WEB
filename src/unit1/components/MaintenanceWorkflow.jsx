import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startMaintenance, finishMaintenance } from "../api/maintenanceApi";
import { requestKey, errorMessage } from "../maintenance/forms";
import { durationText, elapsedSeconds } from "../maintenance/timing";
function WorkflowDialog({ busy, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="maintenance-workflow-dialog"
      aria-label="Machine maintenance"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
const stamp = (v) =>
  new Date(v)
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
    .toUpperCase();
export default function MaintenanceWorkflow({
  data,
  updatedAt,
  canRecord,
  adding,
  onCloseAdd,
  machineFilter,
  tab = "running",
  onSaved,
}) {
  const client = useQueryClient();
  const [machine, setMachine] = useState(""),
    [dialog, setDialog] = useState(null),
    [maintenanceReason, setMaintenanceReason] = useState(""),
    [key, setKey] = useState(""),
    [work, setWork] = useState(""),
    [cost, setCost] = useState(""),
    [parts, setParts] = useState(""),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!data?.activeSessions?.length) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [data?.activeSessions?.length]);
  const refresh = () =>
    Promise.all(
      ["unit1-maintenance", "production-live", "machines"].map((k) =>
        client.invalidateQueries({ queryKey: [k] })
      )
    );
  useEffect(() => {
    if (!adding) return;
    setMachine("");
    setMaintenanceReason("");
    setKey(requestKey());
    setError("");
    setDialog({ mode: "start" });
  }, [adding]);
  const close = () => {
    if (!busy) {
      setDialog(null);
      onCloseAdd();
    }
  };
  const done = (session) => {
    setWork("");
    setCost("");
    setParts("");
    setNotes("");
    setError("");
    setDialog({ mode: "done", session });
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (dialog.mode === "start")
        await startMaintenance({
          machine_id: machine,
          maintenance_reason: maintenanceReason,
          request_key: key,
        });
      else
        await finishMaintenance(dialog.session.id, {
          cost_basis: "approximate",
          work_done: work,
          cost,
          parts_used: parts,
          notes,
        });
      await refresh();
      setDialog(null);
      onCloseAdd();
      onSaved?.(dialog.mode === "start" ? "running" : "completed");
    } catch (err) {
      setError(errorMessage(err));
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  if (!data) return null;
  return (
    <section className="maintenance-workflow">
      {tab === "running" && (
        <div className="maintenance-table maintenance-grid">
          <table>
            <thead>
              <tr>
                {[
                  "ID",
                  "Machine",
                  "Maintenance reason",
                  "Breakdown start (IST)",
                  "Total breakdown time",
                  "Started by",
                  "Action",
                ].map((label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.activeSessions || [])
                .filter(
                  (s) =>
                    !machineFilter ||
                    String(s.machine_id) === String(machineFilter)
                )
                .map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td>
                      {s.machine_code} · {s.machine_name}
                    </td>
                    <td>
                      {s.maintenance_reason ||
                        (s.start_note
                          ? `Earlier note: ${s.start_note}`
                          : "Not recorded")}
                    </td>
                    <td>{stamp(s.started_at)} IST</td>
                    <td>
                      {durationText(
                        elapsedSeconds(
                          s.started_at,
                          data.serverTime,
                          updatedAt,
                          now
                        )
                      )}
                    </td>
                    <td>{s.started_by_name}</td>
                    <td>
                      {canRecord ? (
                        <button onClick={() => done(s)}>
                          Complete maintenance
                        </button>
                      ) : (
                        "Under maintenance"
                      )}
                    </td>
                  </tr>
                ))}
              {!(data.activeSessions || []).some(
                (s) =>
                  !machineFilter ||
                  String(s.machine_id) === String(machineFilter)
              ) && (
                <tr>
                  <td colSpan="7">No running maintenance.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {dialog && (
        <WorkflowDialog busy={busy} onClose={close}>
          <h2>
            {dialog.mode === "start"
              ? "Add Maintenance"
              : "Complete maintenance"}
          </h2>
          <form onSubmit={save}>
            {dialog.mode === "start" ? (
              <>
                <label>
                  Machine *
                  <select
                    required
                    autoFocus
                    disabled={busy}
                    value={machine}
                    onChange={(e) => setMachine(e.target.value)}
                  >
                    <option value="">Select machine</option>
                    {data.machines
                      .filter(
                        (m) =>
                          m.is_active &&
                          !data.activeSessions?.some(
                            (s) => Number(s.machine_id) === Number(m.id)
                          )
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} · {m.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Maintenance reason *
                  <textarea
                    disabled={busy}
                    maxLength={10000}
                    required
                    value={maintenanceReason}
                    onChange={(e) => setMaintenanceReason(e.target.value)}
                  />
                </label>
                <p>
                  Start time is recorded when you confirm. The machine stays
                  under maintenance until Done.
                </p>
              </>
            ) : (
              <>
                <p>
                  {dialog.session.machine_name} · Started{" "}
                  {stamp(dialog.session.started_at)} IST
                </p>
                <p>
                  Elapsed:{" "}
                  {durationText(
                    elapsedSeconds(
                      dialog.session.started_at,
                      data.serverTime,
                      updatedAt,
                      now
                    )
                  )}
                </p>
                <label>
                  Replace part name
                  <input
                    type="text"
                    maxLength={10000}
                    value={parts}
                    onChange={(e) => setParts(e.target.value)}
                  />
                </label>
                <label>
                  Approx cost (INR) *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </label>
                <label>
                  Action which was taken to complete *
                  <textarea
                    required
                    maxLength={10000}
                    value={work}
                    onChange={(e) => setWork(e.target.value)}
                  />
                </label>
                <label>
                  Remark
                  <textarea
                    maxLength={10000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <p>
                  The breakdown end date, time and total duration are saved
                  automatically. Enter 0 if there was no cost.
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="maintenance-error">
                {error}
              </p>
            )}
            <footer>
              <button type="button" disabled={busy} onClick={close}>
                Cancel
              </button>
              <button
                disabled={
                  busy ||
                  (dialog.mode === "start" &&
                    (!machine || !maintenanceReason.trim()))
                }
              >
                {busy
                  ? "Saving…"
                  : dialog.mode === "start"
                  ? "Confirm start maintenance"
                  : "Save Done"}
              </button>
            </footer>
          </form>
        </WorkflowDialog>
      )}
    </section>
  );
}
