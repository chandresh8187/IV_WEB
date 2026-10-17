import LoadingIndicator from "../../components/LoadingIndicator";
import { hasAccess } from "../utils/access";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { ClipboardList, Pencil, Plus, Trash2, X } from "lucide-react";
import PageBack from "../components/PageBack";
import CoilStockSelect from "../components/CoilStockSelect";
import {
  deleteJobCard,
  getAvailableProductionCoils,
  getLiveProduction,
  getJobCards,
  saveJobCard,
} from "../api/productionApi";
import { MATERIAL_LABELS } from "../data/materialGrades";
import { getShiftSettings } from "../api/shiftApi";
import { formatDate, todayIso } from "../utils/dateTime";

const blank = () => ({
  jobDate: todayIso(),
  customerName: "",
  projectNameCapacity: "",
  productionQty: "",
  structureType: "",
  memberName: "",
  sectionSize: "",
  shift: "day",
  cutLengthMm: "",
  plannedMachineId: "",
  stockCoilId: "",
  materialType: "",
  coilWidthMm: "",
  coilThicknessMm: "",
  punchSize: "",
  holes: [],
  punchSizes: [""],
  punchRows: [{ punchIndex: 0, profile: "l_flange", dimensions: "" }],
});
const products = [
  { key: "w_beam_crash_barrier", label: "W beam crash barrier" },
  { key: "solar_mounting_structure", label: "Solar mounting structure" },
  { key: "gl_hat_purlin", label: "GL Hat Purlin" },
  { key: "purlin_c_lip", label: "Purlin C Lip" },
];
const profiles = {
  l_flange: "L Flange",
  r_flange: "R Flange",
  web: "Web",
  lip: "Lip",
};
const errorText = (error) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message;
const punchRows = (job) => {
  const rows = new Map();
  for (const hole of job.holes || []) {
    const size = hole.punchSize || job.punchSize;
    const key = `${size}|${hole.profile}`;
    if (!rows.has(key))
      rows.set(key, { punchSize: size, profile: hole.profile, dimensions: [] });
    rows.get(key).dimensions.push(hole.targetMm);
  }
  return [...rows.values()].map((row) => ({
    ...row,
    dimensions: row.dimensions.join(", "),
  }));
};

export function JobCardDetails({ job, onClose }) {
  if (!job) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="inward-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Job card ${job.id}`}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">PRODUCTION JOB CARD</span>
            <h2>U1-JC-{job.id}</h2>
            <p>
              {job.customerName} · {job.projectNameCapacity}
            </p>
          </div>
          <button
            className="icon-button modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="job-detail-grid">
            <span>
              Date <strong>{formatDate(job.jobDate)}</strong>
            </span>
            <span>
              Planned machine{" "}
              <strong>
                {job.plannedMachineName || job.machineName || "Not specified"}
              </strong>
            </span>
            <span>
              Assigned machine{" "}
              <strong>{job.machineName || "Unassigned"}</strong>
            </span>
            <span>
              Structure{" "}
              <strong>
                {products.find((p) => p.key === job.structureType)?.label}
              </strong>
            </span>
            <span>
              Member <strong>{job.memberName}</strong>
            </span>
            <span>
              Section size <strong>{job.sectionSize}</strong>
            </span>
            <span>
              Cut length <strong>{job.cutLengthMm} mm</strong>
            </span>
            <span>
              Shift <strong>{job.shift}</strong>
            </span>
            <span>
              Production{" "}
              <strong>
                {job.producedPieces || 0} / {job.productionQty} pcs
              </strong>
            </span>
            <span>
              Planned coil{" "}
              <strong>
                {MATERIAL_LABELS[job.materialType]} · {job.coilWidthMm} ×{" "}
                {job.coilThicknessMm} mm
              </strong>
            </span>
          </div>
          <h3>Hole positions</h3>
          <div className="job-hole-list">
            {job.holes?.map((hole, index) => (
              <span key={hole.id || index}>
                {hole.punchSize || job.punchSize} · {profiles[hole.profile]} ·{" "}
                {hole.targetMm} mm
              </span>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="outline-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobCardsScreen() {
  const user = useSelector((state) => state.auth.user);
  const canManage = hasAccess(user, "unit1.jobcards.manage");
  const client = useQueryClient();
  const jobs = useQuery({
    queryKey: ["unit1-job-cards"],
    queryFn: getJobCards,
  });
  const live = useQuery({
    queryKey: ["production-live"],
    queryFn: getLiveProduction,
  });
  const shifts = useQuery({
    queryKey: ["unit1-shifts"],
    queryFn: getShiftSettings,
    refetchInterval: 30000,
  });
  const [form, setForm] = useState(null);
  const stock = useQuery({
    queryKey: ["available-production-coils"],
    queryFn: getAvailableProductionCoils,
    enabled: Boolean(form),
    refetchOnMount: "always",
  });
  const [selected, setSelected] = useState(null);
  const save = useMutation({
    mutationFn: saveJobCard,
    onSuccess: async () => {
      setForm(null);
      await client.invalidateQueries({ queryKey: ["unit1-job-cards"] });
    },
  });
  const remove = useMutation({
    mutationFn: deleteJobCard,
    onSuccess: async () => {
      setSelected(null);
      await client.invalidateQueries({ queryKey: ["unit1-job-cards"] });
      await client.invalidateQueries({ queryKey: ["production-live"] });
    },
  });
  const set = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const selectStockCoil = (id) => {
    const coil = stock.data?.find((item) => String(item.id) === id);
    setForm((previous) => ({
      ...previous,
      stockCoilId: id,
      materialType: coil?.materialType || "",
      coilWidthMm: coil?.widthMm ?? "",
      coilThicknessMm: coil?.thicknessMm ?? "",
    }));
  };
  const updatePunchSize = (index, value) =>
    setForm((previous) => ({
      ...previous,
      punchSizes: previous.punchSizes.map((size, i) =>
        i === index ? value : size,
      ),
    }));
  const removePunchSize = (index) =>
    setForm((previous) => ({
      ...previous,
      punchSizes: previous.punchSizes.filter((_, i) => i !== index),
      punchRows: previous.punchRows
        .filter((row) => row.punchIndex !== index)
        .map((row) => ({
          ...row,
          punchIndex:
            row.punchIndex > index ? row.punchIndex - 1 : row.punchIndex,
        })),
    }));
  const updatePunchRow = (index, key, value) =>
    setForm((previous) => ({
      ...previous,
      punchRows: previous.punchRows.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));
  const openEdit = (job) => {
    const rows = punchRows(job);
    const punchSizes = [...new Set(rows.map((row) => row.punchSize))];
    if (!punchSizes.length) punchSizes.push(job.punchSize || "");
    setForm({
      ...job,
      plannedMachineId: job.plannedMachineId || job.machineId || "",
      stockCoilId: "",
      jobDate: String(job.jobDate).slice(0, 10),
      punchSizes,
      punchRows: rows.length
        ? rows.map((row) => ({
            punchIndex: punchSizes.indexOf(row.punchSize),
            profile: row.profile,
            dimensions: row.dimensions,
          }))
        : [{ punchIndex: 0, profile: "l_flange", dimensions: "" }],
    });
  };
  const submit = () => {
    if (Number(form.runCount)) return save.mutate(form);
    const holes = [];
    const sizes = form.punchSizes.map((size) => size.trim());
    if (
      sizes.some((size) => !size) ||
      new Set(sizes.map((size) => size.toLowerCase())).size !== sizes.length
    )
      return window.alert("Enter each different punch size once.");
    if (
      sizes.some(
        (_, index) => !form.punchRows.some((row) => row.punchIndex === index),
      )
    )
      return window.alert("Add hole dimensions for every punch size.");
    for (const row of form.punchRows) {
      const dimensions = row.dimensions.split(/[\s,;-]+/).filter(Boolean);
      if (
        !sizes[row.punchIndex] ||
        !row.profile ||
        !dimensions.length ||
        dimensions.some(
          (value) =>
            !Number.isFinite(Number(value)) ||
            Number(value) < 0 ||
            Number(value) > Number(form.cutLengthMm),
        )
      )
        return window.alert(
          "Enter a profile and valid hole dimensions within the cut length for every punch size.",
        );
      holes.push(
        ...dimensions.map((value) => ({
          punchSize: sizes[row.punchIndex],
          profile: row.profile,
          targetMm: Number(value),
        })),
      );
    }
    if (holes.length > 100)
      return window.alert("A job card can have at most 100 hole positions.");
    save.mutate({ ...form, punchSize: sizes[0], holes });
  };
  return (
    <section className="job-cards-page">
      <PageBack to="/production" current="Job cards">
        Production
      </PageBack>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRODUCTION PLANNING</span>
          <h1>Job cards</h1>
          <p>
            Plan the member, coil specification, punch and hole positions.
            Assign the card from Live Production.
          </p>
        </div>
        {canManage && (
          <button
            className="primary-button"
            onClick={() =>
              setForm({
                ...blank(),
                shift: shifts.data?.current?.name || "day",
              })
            }
          >
            <Plus size={16} /> New job card
          </button>
        )}
      </div>
      {jobs.isError && (
        <div className="notice error" role="alert">
          {errorText(jobs.error)}
        </div>
      )}
      <div className="content-card table-card">
        <div className="table-toolbar">
          <strong>Production plan</strong>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Job card</th>
                <th>Customer / project</th>
                <th>Member</th>
                <th>Machine / shift</th>
                <th>Pieces</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.data?.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>U1-JC-{job.id}</strong>
                    <small>{formatDate(job.jobDate)}</small>
                  </td>
                  <td>
                    <strong>{job.customerName}</strong>
                    <small>{job.projectNameCapacity}</small>
                  </td>
                  <td>
                    <strong>{job.memberName}</strong>
                    <small>
                      {job.sectionSize} · {job.cutLengthMm} mm
                    </small>
                  </td>
                  <td>
                    <strong>{job.machineName || "Unassigned"}</strong>
                    <small>{job.shift}</small>
                  </td>
                  <td>
                    {job.producedPieces} / {job.productionQty}
                  </td>
                  <td>
                    <span className="status-pill">{job.status}</span>
                  </td>
                  <td>
                    <button
                      className="outline-button"
                      onClick={() => setSelected(job)}
                    >
                      Job card
                    </button>
                    {canManage &&
                      ["open", "completed"].includes(job.status) && (
                        <button
                          className="job-edit-button"
                          onClick={() => openEdit(job)}
                          aria-label={`Edit U1-JC-${job.id}`}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    {canManage && (
                      <button
                        className="job-edit-button"
                        style={{ color: "#BA3E45" }}
                        disabled={
                          remove.isPending ||
                          Boolean(
                            live.data?.runs.some(
                              (run) => run.jobCardId === job.id,
                            ),
                          )
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              Number(job.runCount)
                                ? `Remove U1-JC-${job.id} from the list while keeping production history?`
                                : `Delete U1-JC-${job.id}?`,
                            )
                          )
                            remove.mutate(job.id);
                        }}
                        aria-label={`Delete U1-JC-${job.id}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jobs.data?.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={25} />
            <strong>No job cards yet</strong>
            <span>Create a job card to schedule production.</span>
          </div>
        )}
      </div>
      <JobCardDetails job={selected} onClose={() => setSelected(null)} />
      {form && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setForm(null);
          }}
        >
          <div
            className="inward-modal job-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Production job card"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">PRODUCTION PLANNING</span>
                <h2>{form.id ? `Edit U1-JC-${form.id}` : "New job card"}</h2>
                <p>Set the plan and each required hole position.</p>
              </div>
              <button
                className="icon-button modal-close"
                type="button"
                onClick={() => setForm(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form
              className="modal-form"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <div className="modal-body">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Date</span>
                    <input
                      type="date"
                      required
                      value={form.jobDate}
                      onChange={(e) => set("jobDate", e.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>Customer name</span>
                    <input
                      required
                      maxLength="150"
                      value={form.customerName}
                      onChange={(e) => set("customerName", e.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>Project name / capacity</span>
                    <input
                      required
                      maxLength="180"
                      value={form.projectNameCapacity}
                      onChange={(e) =>
                        set("projectNameCapacity", e.target.value)
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Production qty (pieces)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={form.productionQty}
                      onChange={(e) => set("productionQty", e.target.value)}
                    />
                  </label>
                  {!Number(form.runCount) && (
                    <>
                      <label className="form-field">
                        <span>Structure type</span>
                        <select
                          required
                          value={form.structureType}
                          onChange={(e) => set("structureType", e.target.value)}
                        >
                          <option value="">Select structure</option>
                          {products.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="form-field">
                        <span>Member / item name</span>
                        <input
                          required
                          value={form.memberName}
                          onChange={(e) => set("memberName", e.target.value)}
                          placeholder="Column L-2600"
                        />
                      </label>
                      <label className="form-field">
                        <span>Section size</span>
                        <input
                          required
                          value={form.sectionSize}
                          onChange={(e) => set("sectionSize", e.target.value)}
                          placeholder="80x40x15x3mm"
                        />
                      </label>
                      <label className="form-field">
                        <span>Shift</span>
                        <select
                          value={form.shift}
                          onChange={(e) => set("shift", e.target.value)}
                        >
                          <option value="day">Day</option>
                          <option value="night">Night</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span>Planned machine</span>
                        <select
                          required
                          disabled={Boolean(form.machineId)}
                          value={form.plannedMachineId || ""}
                          onChange={(e) =>
                            set("plannedMachineId", e.target.value)
                          }
                        >
                          <option value="">Select machine</option>
                          {live.data?.machines
                            ?.filter(
                              (machine) =>
                                machine.isActive ||
                                String(machine.id) ===
                                  String(form.plannedMachineId),
                            )
                            .map((machine) => (
                              <option key={machine.id} value={machine.id}>
                                {machine.name} ({machine.code})
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="form-field">
                        <span>Cut length (mm)</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={form.cutLengthMm}
                          onChange={(e) => set("cutLengthMm", e.target.value)}
                        />
                      </label>

                      <CoilStockSelect
                        coils={stock.data || []}
                        value={form.stockCoilId}
                        onChange={selectStockCoil}
                        editing={Boolean(form.id)}
                        loading={stock.isLoading}
                      />
                      <div className="form-field">
                        <span>Planned coil specification</span>
                        <strong>
                          {form.materialType
                            ? `${MATERIAL_LABELS[form.materialType] || form.materialType} · ${form.coilWidthMm} × ${form.coilThicknessMm} mm`
                            : "Select an available coil"}
                        </strong>
                        <small>
                          The physical coil is assigned by QR scan when
                          production starts.
                        </small>
                        {stock.isError && (
                          <span className="notice error">
                            {errorText(stock.error)}
                          </span>
                        )}
                        {stock.data?.length === 0 && (
                          <span>No coils are available in stock.</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {!Number(form.runCount) && (
                  <>
                    <div className="job-holes-heading">
                      <h3>1. Add each punch size once</h3>
                      <button
                        className="outline-button"
                        type="button"
                        onClick={() =>
                          set("punchSizes", [...form.punchSizes, ""])
                        }
                      >
                        <Plus size={14} /> Add punch size
                      </button>
                    </div>
                    <div className="job-punch-sizes">
                      {form.punchSizes.map((size, index) => (
                        <label key={index} className="job-punch-size">
                          <span>Punch size {index + 1}</span>
                          <input
                            aria-label={`Punch size ${index + 1}`}
                            required
                            value={size}
                            onChange={(e) =>
                              updatePunchSize(index, e.target.value)
                            }
                          />
                          {form.punchSizes.length > 1 && (
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={`Remove punch size ${index + 1}`}
                              onClick={() => removePunchSize(index)}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </label>
                      ))}
                    </div>
                    <div className="job-holes-heading">
                      <h3>2. Add hole dimensions for each punch size</h3>
                    </div>
                    <div className="job-punch-groups">
                      {form.punchSizes.map((size, punchIndex) => (
                        <div className="job-punch-group" key={punchIndex}>
                          <div className="job-punch-group-header">
                            <strong>
                              {size.trim() || `Punch size ${punchIndex + 1}`}
                            </strong>
                            <small>
                              Enter all positions for this punch size in
                              millimetres.
                            </small>
                          </div>
                          {form.punchRows.map(
                            (row, index) =>
                              row.punchIndex === punchIndex && (
                                <div className="job-punch-row" key={index}>
                                  <label>
                                    <span>Profile</span>
                                    <select
                                      aria-label={`${size || `Punch size ${punchIndex + 1}`} profile ${index + 1}`}
                                      value={row.profile}
                                      onChange={(e) =>
                                        updatePunchRow(
                                          index,
                                          "profile",
                                          e.target.value,
                                        )
                                      }
                                    >
                                      {Object.entries(profiles).map(
                                        ([key, label]) => (
                                          <option key={key} value={key}>
                                            {label}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </label>
                                  <label>
                                    <span>Hole dimensions (mm)</span>
                                    <input
                                      aria-label={`${size || `Punch size ${punchIndex + 1}`} hole dimensions ${index + 1}`}
                                      required
                                      value={row.dimensions}
                                      onChange={(e) =>
                                        updatePunchRow(
                                          index,
                                          "dimensions",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </label>
                                  {form.punchRows.length > 1 && (
                                    <button
                                      className="icon-button"
                                      type="button"
                                      aria-label={`Remove dimensions for ${size || `punch size ${punchIndex + 1}`}`}
                                      onClick={() =>
                                        set(
                                          "punchRows",
                                          form.punchRows.filter(
                                            (_, i) => i !== index,
                                          ),
                                        )
                                      }
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>
                              ),
                          )}
                          <button
                            className="outline-button"
                            type="button"
                            onClick={() =>
                              set("punchRows", [
                                ...form.punchRows,
                                { punchIndex, profile: "web", dimensions: "" },
                              ])
                            }
                          >
                            <Plus size={14} /> Add dimensions for this size
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="live-form-hint">
                      Enter 10 positions as 10 comma-separated numbers. Each
                      position counts as one hole per piece. Use 9×20 for a
                      rounded slot or Ø9 for a circular hole to calculate scrap.
                    </p>
                  </>
                )}
                {save.isError && (
                  <div className="notice error" role="alert">
                    {errorText(save.error)}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setForm(null)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={save.isPending}
                  type="submit"
                >
                  {save.isPending ? <LoadingIndicator label="Saving…" inline /> : "Save job card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
