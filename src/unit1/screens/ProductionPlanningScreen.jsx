import { Eye, Pencil, Trash2 } from "lucide-react";
import PlanningIconButton from "../components/PlanningIconButton";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  getProductionPlans,
  getMaterialTemplates,
  saveProductionPlan,
  deleteProductionPlan,
} from "../api/planningApi";
import {
  getLiveProduction,
  getJobCard,
} from "../api/productionApi";
import LoadingIndicator from "../../components/LoadingIndicator";
import { JobCardDetails } from "./JobCardsScreen";
import { planForm, blankLine } from "../utils/planningForms";
import { jobCardChangeKeys } from "../utils/jobCardChangeKeys";
import { todayIso, formatDate } from "../utils/dateTime";
import { hasAccess } from "../utils/access";

import PlanningDialog from "../components/PlanningDialog";
import "./ProductionPlanningScreen.css";
const message = (e) => e?.response?.data?.error || e?.message;
export default function ProductionPlanningScreen() {
  const user = useSelector((s) => s.auth.user),
    manage = hasAccess(user, "unit1.jobcards.manage"),
    client = useQueryClient();
  const plans = useQuery({
      queryKey: ["unit1-production-plans"],
      queryFn: getProductionPlans,
      refetchInterval: 10000,
    }),
    templates = useQuery({
      queryKey: ["unit1-material-templates"],
      queryFn: getMaterialTemplates,
      refetchInterval: 30000,
    }),
    live = useQuery({
      queryKey: ["production-live"],
      queryFn: getLiveProduction,
    });
  const [form, setForm] = useState(null),
    [selectedJobId, setSelectedJobId] = useState(null),
    [q, setQ] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const jobDetails = useQuery({
    queryKey: ["job-card", selectedJobId],
    queryFn: () => getJobCard(selectedJobId),
    enabled: selectedJobId != null,
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const line = (index, key, value) =>
    setForm((f) => ({
      ...f,
      lines: f.lines.map((r, i) =>
        i === index
          ? {
              ...r,
              [key]: value,
              ...(key === "templateId" ? { selectedCoils: [] } : {}),
            }
          : r
      ),
    }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveProductionPlan(form);
      setForm(null);
      await Promise.all(
        jobCardChangeKeys.map((k) =>
          client.invalidateQueries({ queryKey: [k] })
        )
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => {
    setBusy(true);
    setError("");
    try {
      await deleteProductionPlan(row);
      await Promise.all(
        jobCardChangeKeys.map((k) =>
          client.invalidateQueries({ queryKey: [k] })
        )
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = (row) => {
    if (
      window.confirm(
        "Delete this production planning from the current list? Existing production, inspection and stock history will be kept."
      )
    )
      remove(row);
  };
  return (
    <section className="planning-page">
      <div className="page-heading">
        <div>
          <h1>Production Planning</h1>
          <p>
            One party, multiple materials. Each material has its own quantity
            and machine.
          </p>
        </div>
        {manage && (
          <button
            className="primary-button"
            disabled={!templates.data?.length}
            onClick={() => {
              setError("");
              setForm(planForm(todayIso()));
            }}
          >
            Add planning
          </button>
        )}
      </div>
      {!templates.isPending && !templates.data?.length && (
        <p>Create a Job Card material template first.</p>
      )}
      <label className="planning-search">
        Search planning / party / project
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {(error || plans.error || templates.error) && (
        <p role="alert" className="notice error">
          {error || message(plans.error || templates.error)}
        </p>
      )}
      {plans.isPending && <p>Loading planning…</p>}
      {selectedJobId != null && jobDetails.isPending && (
        <LoadingIndicator label="Loading job card details…" />
      )}
      {selectedJobId != null && jobDetails.isError && (
        <div className="notice error" role="alert">
          {message(jobDetails.error)}
          <button className="text-link" type="button" onClick={() => jobDetails.refetch()}>Retry</button>
          <button className="text-link" type="button" onClick={() => setSelectedJobId(null)}>Dismiss</button>
        </div>
      )}
      {(plans.data || [])
        .filter((p) =>
          `${p.id} ${p.partyName} ${p.projectName}`
            .toLowerCase()
            .includes(q.toLowerCase())
        )
        .map((p) => (
          <section className="content-card planning-card" key={p.id}>
            <header>
              <div>
                <h2>
                  U1-PL-{p.id} · {p.partyName}
                </h2>
                <p>
                  {formatDate(p.planDate)} · {p.shift} ·{" "}
                  {p.projectName || "No project"}
                </p>
              </div>
              {manage && (
                <div className="planning-actions">
                  <PlanningIconButton
                    label="Edit planning"
                    Icon={Pencil}
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setForm(planForm(todayIso(), p));
                    }}
                  />
                  <PlanningIconButton
                    label="Delete planning"
                    Icon={Trash2}
                    danger
                    disabled={busy}
                    onClick={() => confirmDelete(p)}
                  />
                </div>
              )}
            </header>
            <div className="planning-table">
              <table>
                <thead>
                  <tr>
                    {[
                      "Material template",
                      "Section",
                      "Cut length mm",
                      "Machine",
                      "Planned NOS",
                      "Produced NOS",
                      "Remaining NOS",
                      "Actions",
                    ].map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.lines.map((r) => (
                    <tr key={r.id}>
                      <td>{r.templateName}</td>
                      <td>{r.sectionSize}</td>
                      <td>{r.cutLengthMm}</td>
                      <td>{r.machineName || "Not assigned"}</td>
                      <td>{r.quantity}</td>
                      <td>{r.producedPieces}</td>
                      <td>
                        {Math.max(
                          0,
                          Number(r.quantity) - Number(r.producedPieces)
                        )}
                      </td>
                      <td>
                        <PlanningIconButton
                          label="View Job Card"
                          Icon={Eye}
                          onClick={() => setSelectedJobId(r.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      {selectedJobId != null && jobDetails.data && (
        <JobCardDetails
          key={selectedJobId}
          job={jobDetails.data}
          allowPreview={user?.role !== "labour" && hasAccess(user, "unit1.production.view")}
          onClose={() => setSelectedJobId(null)}
        />
      )}
      {form && (
        <PlanningDialog
          title={form.id ? "Edit planning" : "Add production planning"}
          busy={busy}
          onClose={() => setForm(null)}
          onSave={save}
        >
          <div className="planning-fields">
            <label>
              Party / customer name
              <input
                required
                maxLength={150}
                value={form.partyName}
                onChange={(e) => set("partyName", e.target.value.toUpperCase())}
              />
            </label>
            <label>
              Project / capacity (optional)
              <input
                maxLength={180}
                value={form.projectName}
                onChange={(e) => set("projectName", e.target.value)}
              />
            </label>
            <label>
              Planning date
              <input
                required
                type="date"
                value={form.planDate}
                onChange={(e) => set("planDate", e.target.value)}
              />
            </label>
            <label>
              Shift
              <select
                value={form.shift}
                onChange={(e) => set("shift", e.target.value)}
              >
                <option value="day">Day</option>
                <option value="night">Night</option>
              </select>
            </label>
          </div>
          {form.lines.map((r, i) => {
            const t =
              templates.data?.find(
                (t) => Number(t.id) === Number(r.templateId)
              ) ||
              (r.id ? { ...r, id: r.templateId, name: r.templateName } : null);
            return (
              <fieldset className="planning-material" key={r.id || `new-${i}`}>
                <legend>Material {i + 1}</legend>
                <div className="planning-fields">
                  <label>
                    Job Card material template
                    <select
                      required
                      disabled={!!r.id}
                      value={r.templateId}
                      onChange={(e) => line(i, "templateId", e.target.value)}
                    >
                      <option value="">Select template</option>
                      {(templates.data || [])
                        .concat(
                          r.id &&
                            !templates.data?.some(
                              (t) => Number(t.id) === Number(r.templateId)
                            )
                            ? [
                                {
                                  id: r.templateId,
                                  name: r.templateName + " (archived)",
                                },
                              ]
                            : []
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            U1-JC-{t.id} · {t.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Planning quantity (NOS)
                    <input
                      required
                      type="number"
                      min="1"
                      max="10000000"
                      step="1"
                      value={r.quantity}
                      onChange={(e) => line(i, "quantity", e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </label>
                  <label>
                    Machine
                    <select
                      required
                      value={r.machineId || ""}
                      onChange={(e) => line(i, "machineId", e.target.value)}
                    >
                      <option value="">Select machine</option>
                      {(live.data?.machines || [])
                        .filter((m) => m.isActive)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                {t && (
                  <>
                    <p>
                      {t.materialType} · {t.sectionSize} · Cut {t.cutLengthMm}{" "}
                      mm
                    </p>
                    <p>Allowed coil sizes come from this template. Scan the installed coil when starting production.</p>
                  </>
                )}
                {!r.id && form.lines.length > 1 && (
                  <PlanningIconButton
                    label="Remove material line"
                    Icon={Trash2}
                    danger
                    disabled={busy}
                    onClick={() =>
                      set(
                        "lines",
                        form.lines.filter((_, n) => n !== i)
                      )
                    }
                  />
                )}
              </fieldset>
            );
          })}
          <button
            type="button"
            className="outline-button"
            disabled={form.lines.length >= 50}
            onClick={() => set("lines", [...form.lines, blankLine()])}
          >
            Add material
          </button>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
        </PlanningDialog>
      )}
    </section>
  );
}

