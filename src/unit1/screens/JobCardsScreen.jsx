import { jobCardChangeKeys } from "../utils/jobCardChangeKeys";
import { jobPunchRows as punchRows } from "../utils/jobPunchRows";
import "./JobCardsScreen.css";
import { useLocation, useNavigate } from "react-router";
import LoadingIndicator from "../../components/LoadingIndicator";
import { hasAccess } from "../utils/access";
import { parsePunchRequirements,displaySize } from "../utils/punchRequirements";
import { useMemo, useState } from "react";
import { buildMaterialSpec, templateViewerForm } from "../data/materialViewerModel";
import { groupPunchRequirements } from "../utils/punchRequirements";
import JobCardPreview from "../components/MaterialPreview";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { ClipboardList, Pencil, Plus, Trash2, X } from "lucide-react";
import PageBack from "../components/PageBack";
import JobCoilPicker from "../components/JobCoilPicker";
import {
  deleteJobCard,
  getAvailableProductionCoils,
  getLiveProduction,
  getJobCards,
  getJobCard,
  getJobCardPdf,
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
  selectedCoils: [],
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
  lr_flange: "L & R FLANGE",
  web: "Web",
  lip: "Lip",
};
const errorText = (error) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message;

export function JobCardDetails({ job: suppliedJob, onClose, allowPreview = false }) {
  const [showPreview, setShowPreview] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const current = useQuery({
    queryKey: ["job-card", suppliedJob?.id],
    queryFn: () => getJobCard(suppliedJob.id),
    enabled: Boolean(suppliedJob?.id && !suppliedJob.isTemplate && user?.role !== "labour"),
  });
  const job =
    suppliedJob && !suppliedJob.isTemplate && current.data?.id === suppliedJob.id
      ? current.data
      : suppliedJob;
  const preview = useMemo(() => {
    if (!job || !showPreview) return {};
    try {
      return { spec: buildMaterialSpec(templateViewerForm(job, groupPunchRequirements(job))) };
    } catch (error) {
      return { error: error.message };
    }
  }, [job, showPreview]);
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
            <span className="eyebrow">{job.isTemplate ? "MATERIAL JOB CARD TEMPLATE" : "PRODUCTION JOB CARD"}</span>
            <h2>{job.isTemplate ? `U1-JC-${job.id} · ${job.name || job.memberName}` : `U1-PL-${job.planningId || job.id} · Material ${job.id}`}</h2>
            {!job.isTemplate && <p>{[job.customerName, job.projectNameCapacity].filter(Boolean).join(" · ")}</p>}
          </div>
          <button
            className="icon-button modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          {allowPreview && (
            <div className="job-template-tabs" role="group" aria-label="Job card views">
              <button type="button" className="outline-button" aria-pressed={!showPreview} onClick={() => setShowPreview(false)}>Details</button>
              <button type="button" className="outline-button" aria-pressed={showPreview} onClick={() => setShowPreview(true)}>3D Preview</button>
            </div>
          )}
          {showPreview ? (
            preview.error ? <p className="notice error" role="alert">{preview.error}</p> :
              <JobCardPreview spec={preview.spec} />
          ) : <>
          <p>Allowed coil sizes: {(job.allowedCoilSizes||[]).map(c=>`${c.widthMm} × ${c.thicknessMm} mm`).join(', ')||`${job.coilWidthMm} × ${job.coilThicknessMm} mm`}</p>
          <div className="job-detail-grid">
            {!job.isTemplate && <>
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
            </>}
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
            {!job.isTemplate && <><span>
              Shift <strong>{job.shift}</strong>
            </span>
            <span>
              Production{" "}
              <strong>
                {job.producedPieces || 0} / {job.productionQty} pcs
              </strong>
            </span>
            </>}
            <span>
              Planned coil{" "}
              <strong>
                {MATERIAL_LABELS[job.materialType]} · {job.coilWidthMm} ×{" "}
                {job.coilThicknessMm} mm
              </strong>
            </span>
          </div>
          <h3>Punch dimensions</h3>
          <div
            className="job-punch-table"
            role="region"
            aria-label="Punch dimensions"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Punch requirement - positions from start (mm)</th>
                </tr>
              </thead>
              <tbody>
                {punchRows(job).map((row) => (
                  <tr key={JSON.stringify([row.punchName, row.punchSize, row.profile, row.centerOffsetMm])}>
                    <td><strong className="job-requirement-line">{row.requirement}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!job.holes?.length && (
              <p className="job-punch-empty">No punch dimensions configured.</p>
            )}
          </div>
          </>}
        </div>

      </div>
    </div>
  );
}

export default function JobCardsScreen() {
  const navigate = useNavigate();
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
  const location=useLocation();
  const restored=location.state?.jobCardFilters||{};
  const [search,setSearch]=useState(restored.search||'');
  const [statusFilter,setStatusFilter]=useState(restored.statusFilter||'all');
  const [machineFilter,setMachineFilter]=useState(restored.machineFilter||'all');
  const allJobs=jobs.data||[];
  const filteredJobs=allJobs.filter(job=>{
    if(statusFilter!=='all'&&job.status!==(statusFilter==='pending'?'open':statusFilter))return false;
    if(machineFilter==='unassigned'&&job.machineId)return false;
    if(!['all','unassigned'].includes(machineFilter)&&String(job.machineId)!==machineFilter)return false;
    const normalize=value=>String(value??'').toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,' ').trim();
    const haystack=normalize([job.id,'U1-JC-'+job.id,job.customerName,job.projectNameCapacity,job.memberName,job.sectionSize,job.machineName,job.materialType,job.grade,job.jobDate,...(job.selectedCoils||[]).map(c=>c.internalId)].join(' '));
    return normalize(search).split(' ').every(token=>haystack.includes(token));
  });
  const resetFilters=()=>{setSearch('');setStatusFilter('all');setMachineFilter('all');};
  const [form, setForm] = useState(null);
  const stock = useQuery({
    queryKey: ["available-production-coils","physical"],
    queryFn: () => getAvailableProductionCoils(true),
    enabled: Boolean(form),
    refetchOnMount: "always",
  });
  const [selected, setSelected] = useState(null);
  const [printingId, setPrintingId] = useState(null);
  const printJob = async (job) => {
    setPrintingId(job.id);
    try {
      const blob = await getJobCardPdf(job.id);
      navigate("/production/reports/preview", {
        state: {
          blob,
          filename: "unit1-job-card-" + job.id + ".pdf",
          reportTitle: "Production job card",
          returnTo: "/production/job-cards",
          printable: true,
          returnState:{jobCardFilters:{search,statusFilter,machineFilter}},
        },
      });
    } catch (error) {
      let message = errorText(error);
      if (error.response?.data instanceof Blob) {
        try {
          message =
            JSON.parse(await error.response.data.text()).error || message;
        } catch {
          /* Keep transport error. */
        }
      }
      window.alert(message);
    } finally {
      setPrintingId(null);
    }
  };
  const save = useMutation({
    mutationFn: saveJobCard,
    onSuccess: async () => {
      setForm(null);
      await Promise.all(
        jobCardChangeKeys.map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
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
  const selectCoils=selectedCoils=>setForm(previous=>({...previous,selectedCoils,...(selectedCoils[0]&&!previous.id?{materialType:selectedCoils[0].materialType,coilWidthMm:selectedCoils[0].widthMm,coilThicknessMm:selectedCoils[0].thicknessMm}:{})}));
  const updatePunchSize=(index,value)=>setForm(previous=>({...previous,punchSizes:previous.punchSizes.map((size,i)=>i===index?value:size)}));
  const addRequirement=()=>setForm(previous=>({...previous,punchSizes:[...previous.punchSizes,''],punchRows:[...previous.punchRows,{punchIndex:previous.punchSizes.length,profile:'l_flange',dimensions:''}]}));
  const updatePunchRow = (index, key, value) =>
    setForm((previous) => ({
      ...previous,
      punchRows: previous.punchRows.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));
  const openEdit = (job) => {
    const rows = punchRows(job);
    const punchSizes = rows.map((row) => row.punchSize);
    if (!punchSizes.length) punchSizes.push(job.punchSize || "");
    setForm({
      ...job,
      plannedMachineId: job.plannedMachineId || job.machineId || "",
      stockCoilId: "",
      jobDate: String(job.jobDate).slice(0, 10),
      punchSizes,
      punchRows: rows.length
        ? rows.map((row) => ({
            punchIndex: rows.indexOf(row),
            profile: row.profile,
            dimensions: row.dimensions,
            centerOffsetMm: row.centerOffsetMm,
          }))
        : [{ punchIndex: 0, profile: "l_flange", dimensions: "" }],
    });
  };
  const submit = () => {
    try {
      if(!form.id&&!form.selectedCoils?.length)throw new Error('Select at least one physical coil.');
      const holes=parsePunchRequirements(form.punchRows.map(row=>({punchSize:form.punchSizes[row.punchIndex],profile:row.profile,dimensions:row.dimensions,centerOffsetMm:row.centerOffsetMm})),form.cutLengthMm);
      save.mutate({...form,punchSize:holes[0].punchSize,holes});
    } catch(error) {window.alert(error.message);}
  };
  return (
    <section className="job-cards-page">
      <PageBack to="/production" current="Job cards">
        Production
      </PageBack>
      <div className="page-heading">

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
        <div className="job-list-controls">
          <div className="job-list-filters" role="group" aria-label="Job card status">{[['all','All'],['pending','Pending'],['completed','Completed']].map(([value,label])=><button key={value} type="button" className="job-status-filter" aria-pressed={statusFilter===value} onClick={()=>setStatusFilter(value)}><span>{label}</span><span className="job-filter-count">{allJobs.filter(job=>value==='all'||job.status===(value==='pending'?'open':value)).length}</span></button>)}</div>
          <div className="job-list-search-row"><label className="form-field job-list-search"><span>Search job cards</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Job number, customer, project, member or coil ID"/></label><label className="form-field job-list-machine"><span>Machine</span><select value={machineFilter} onChange={e=>setMachineFilter(e.target.value)}><option value="all">All machines</option><option value="unassigned">Unassigned</option>{(live.data?.machines||[]).map(m=><option key={m.id} value={String(m.id)}>{m.name}</option>)}</select></label>{(search||statusFilter!=='all'||machineFilter!=='all')&&<button type="button" className="outline-button" onClick={resetFilters}>Clear filters</button>}</div>
          <div className="job-list-count" role="status">{jobs.isPending?<LoadingIndicator label="Loading job cards…" inline/>:filteredJobs.length+' of '+allJobs.length+' job cards'}</div>
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
              {filteredJobs.map((job) => (
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
                    <span className="status-pill">{job.status==='open'?'Pending':job.status==='completed'?'Completed':job.status}</span>
                  </td>
                  <td>
                    <div
                      className="job-card-row-actions"
                      role="group"
                      aria-label={`Actions for U1-JC-${job.id}`}
                    >
                      <button
                        className="outline-button"
                        onClick={() => setSelected(job)}
                      >
                        Job card
                      </button>
                      {user?.role !== "labour" && (
                        <button
                          className="outline-button"
                          type="button"
                          disabled={printingId !== null}
                          onClick={() => printJob(job)}
                        >
                          {printingId === job.id
                            ? "Creating…"
                            : "Print job card"}
                        </button>
                      )}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jobs.isSuccess && filteredJobs.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={25} />
            <strong>{allJobs.length?'No matching job cards':'No job cards yet'}</strong>
            <span>{allJobs.length?'Try another search or clear your filters.':'Create a job card to schedule production.'}</span>
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
                <p>
                  Edit all fields and punch dimensions. Specification changes
                  require a fresh first-piece check. Return the active coil
                  before changing coil specifications.
                </p>
              </div>
              <button
                className="icon-button modal-close"
                type="button"
                onClick={() => setForm(null)}
                aria-label="Close"
              >
                <X size={24} />
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
                      onChange={(e) => set("customerName", e.target.value.toUpperCase())}
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
                  {
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

                      {form.id && (
                        <>
                          <label className="form-field">
                            <span>Material</span>
                            <select
                              required
                              value={form.materialType}
                              onChange={(event) => {
                                set("materialType", event.target.value);
                                set("stockCoilId", "");
                              }}
                            >
                              {Object.entries(MATERIAL_LABELS).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          <label className="form-field">
                            <span>Coil width (mm)</span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              value={form.coilWidthMm}
                              onChange={(event) => {
                                set("coilWidthMm", event.target.value);
                                set("stockCoilId", "");
                              }}
                            />
                          </label>
                          <label className="form-field">
                            <span>Coil thickness (mm)</span>
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              required
                              value={form.coilThicknessMm}
                              onChange={(event) => {
                                set("coilThicknessMm", event.target.value);
                                set("stockCoilId", "");
                              }}
                            />
                          </label>
                        </>
                      )}
                      <JobCoilPicker coils={stock.data||[]} value={form.selectedCoils||[]} onChange={selectCoils} disabled={save.isPending}/>
                      <div className="form-field">
                        <span>Reference coil specification</span>
                        <strong>
                          {form.materialType
                            ? `${MATERIAL_LABELS[form.materialType] || form.materialType} · ${form.coilWidthMm} × ${form.coilThicknessMm} mm`
                            : "Select an available coil"}
                        </strong>
                        <small>
                          Save this card, then use Assign job & coil on a machine in Live production.</small>
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
                  }
                </div>
                {
                  <>
                    <div className="job-holes-heading"><h3>Punch requirements</h3><button className="outline-button" type="button" onClick={addRequirement}><Plus size={14}/> Add requirement</button></div>
                    <p className="live-form-hint">One line per punch size and profile. Positions are measured from the starting end, not between holes.</p>
                    <div className="job-punch-groups">{form.punchRows.map((row,index)=><div className="job-punch-group" key={row.punchIndex}>
                      <div className="job-punch-group-header"><strong>Requirement {index+1}</strong></div>
                      <div className="job-requirement-inputs">
                        <label><span>Punch size (mm)</span><input required aria-label={'Requirement '+(index+1)+' punch size'} placeholder="9*20" value={form.punchSizes[row.punchIndex]} onChange={e=>updatePunchSize(row.punchIndex,e.target.value)}/></label>
                        <label><span>Profile</span><select aria-label={'Requirement '+(index+1)+' profile'} value={row.profile} onChange={e=>updatePunchRow(index,'profile',e.target.value)}>{Object.entries(profiles).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
                        <label><span>Hole positions from start (mm)</span><input required aria-label={'Requirement '+(index+1)+' hole positions'} placeholder="56-187-259-398-448" value={row.dimensions} onChange={e=>updatePunchRow(index,'dimensions',e.target.value)}/></label>
                      </div>
                      <p className="job-requirement-line">{displaySize(form.punchSizes[row.punchIndex])||'Size'} - {profiles[row.profile]} - {row.dimensions||'Positions'} mm</p>
                      {form.punchRows.length>1&&<button className="outline-button" type="button" onClick={()=>set('punchRows',form.punchRows.filter((_,i)=>i!==index))}>Remove requirement</button>}
                    </div>)}</div>
                  </>
                }
                {save.isError && (
                  <div className="notice error" role="alert">
                    {errorText(save.error)}
                  </div>
                )}
              </div>
              <div className="modal-footer">

                <button
                  className="primary-button"
                  disabled={save.isPending}
                  type="submit"
                >
                  {save.isPending ? (
                    <LoadingIndicator label="Saving…" inline />
                  ) : (
                    "Save job card"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
