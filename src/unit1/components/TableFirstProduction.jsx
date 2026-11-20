import ProductionEntryEditor from './ProductionEntryEditor';
import {Pencil} from 'lucide-react';
import {hasAccess} from '../utils/access';
import RejectedPiecesForm from './RejectedPiecesForm';
import { punchFaceLabel, sectionDimensionsHint, templateSectionProfile } from '../utils/sectionPunchFaces';
import {punchNameFor} from '../utils/punchNames';

import AssignCoilScreen from "../screens/AssignCoilScreen";

import ProductionCoilDetails from "./ProductionCoilDetails";

import { useEffect, useRef, useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSelector } from "react-redux";

import {

  getLiveProduction,

  getLiveEntries,

  getJobCard,

  addProductionBundle,

  approveHoleCheck,

} from "../api/productionApi";

import { machineControls } from "../utils/machineControls";

import { jobCardChangeKeys } from "../utils/jobCardChangeKeys";

import { validatePieceInspection } from "../utils/pieceInspection";

import { formatDate, formatTime } from "../utils/dateTime";

import ProductionCoilLink from "./ProductionCoilLink";

import { JobCardDetails } from "../screens/JobCardsScreen";

import "./TableFirstProduction.css";

const errorText = (e) =>

  e?.response?.data?.error || e?.response?.data?.message || e?.message;



function Measurements({run,job,mutation}) {
 const [kind,setKind]=useState('inspection');
 return <><label>Entry type<select value={kind} disabled={mutation.isPending} onChange={e=>{setKind(e.target.value);mutation.reset();}}><option value="inspection">Hole dimensions, section size &amp; cut length</option><option value="rejection">Rejected pieces</option></select></label>
 {kind==='inspection'?<InspectionMeasurements run={run} job={job} mutation={mutation}/>:<RejectedPiecesForm run={run} job={job} mutation={mutation}/>}</>;
}

function InspectionMeasurements({ run, job, mutation }) {

  const [cut, setCut] = useState(""),

    [section, setSection] = useState(""),

    [readings, setReadings] = useState({}),

    [remarks, setRemarks] = useState(""),

    [error, setError] = useState("");

  const [requestKey] = useState(() => crypto.randomUUID());

  const [step, setStep] = useState(0);

  const holes = job.holes || [];

  const next = () => {

    const h = holes[step];

    if (

      !/^\d+(?:\.\d{1,2})?$/.test(String(readings[h.id] ?? "")) ||

      Number(readings[h.id]) > 1000000

    ) {

      setError("Enter the actual hole measurement before continuing.");

      return;

    }

    setError("");

    setStep((v) => v + 1);

  };

  const save = (e) => {

    e.preventDefault();

    if (holes.length && step < holes.length - 1) {

      next();

      return;

    }

    try {

      const piece = validatePieceInspection(

        { measuredCutLengthMm: cut, measuredSectionSize: section },

        job.sectionSize

      );

      for (const h of job.holes || [])

        if (

          !/^\d+(?:\.\d{1,2})?$/.test(String(readings[h.id] ?? "")) ||

          Number(readings[h.id]) > 1000000

        )

          throw new Error("Enter actual measurements for every hole.");

      setError("");

      mutation.mutate({

        id: run.id,

        measurements: (job.holes || []).map((h) => ({

          holeId: h.id,

          measuredMm: Number(readings[h.id]),

        })),

        ...piece,

        remarks,



        requestKey,

      });

    } catch (e) {

      setError(e.message);

    }

  };

  return (

    <form onSubmit={save}>

      <h3>

        {run.status === "setup"

          ? "First-piece inspection"

          : "Material inspection"}

      </h3>

      <div className="u1-material-fields">

        <label>

          Section size · target {job.sectionSize} mm

          <input

            required

            value={section}

            onChange={(e) => setSection(e.target.value)}

            disabled={mutation.isPending}

            placeholder={sectionDimensionsHint(job, { forInspection: true })}

          />

        </label>

        <label>

          Cut length · target {job.cutLengthMm} mm

          <input

            required

            type="number"

            min="0.01"

            step="0.01"

            value={cut}

            onChange={(e) => setCut(e.target.value)}

            disabled={mutation.isPending}

          />

        </label>

      </div>

      {holes.slice(step, step + 1).map((h) => (

        <div className="u1-material-hole" key={h.id}>

          <div className="u1-inspection-progress" aria-live="polite">

            Hole {step + 1} of {holes.length}

          </div>

          <h4>

            Punch {punchNameFor(h,holes,job.punchSize)||'Legacy'} ·{" "}

            {h.punchSize || job.punchSize}

          </h4>

          <div className="u1-hole-target">

            <span>{punchFaceLabel(h.profile, templateSectionProfile(job))}</span>

            <strong>Target {h.targetMm} mm</strong>

          </div>

          <label>

            Measured position (mm)

            <input

              autoFocus

              required

              type="number"

              min="0"

              max="1000000"

              step="0.01"

              value={readings[h.id] ?? ""}

              onChange={(e) =>

                setReadings((v) => ({ ...v, [h.id]: e.target.value }))

              }

              disabled={mutation.isPending}

              aria-label={`Measured hole ${step + 1} (mm)`}

            />

          </label>

        </div>

      ))}

      {holes.length > 1 && (

        <div className="u1-form-navigation">

          <button

            type="button"

            className="outline-button"

            disabled={step === 0 || mutation.isPending}

            onClick={() => {

              setError("");

              setStep((v) => v - 1);

            }}

          >

            Previous

          </button>

          <span>

            {step + 1} / {holes.length}

          </span>

          <button

            type="button"

            className="outline-button"

            disabled={step === holes.length - 1 || mutation.isPending}

            onClick={next}

          >

            Next

          </button>

        </div>

      )}

      {(!holes.length || step === holes.length - 1) && (

        <label>

          Remarks

          <textarea

            maxLength={1000}

            value={remarks}

            onChange={(e) => setRemarks(e.target.value)}

            disabled={mutation.isPending}

          />

        </label>

      )}

      <p>

        Enter actual readings. Saving confirms your inspection; no automatic

        tolerance is applied.

      </p>

      {(error || mutation.isError) && (

        <p className="notice error" role="alert">

          {error || errorText(mutation.error)}

        </p>

      )}

      {(!holes.length || step === holes.length - 1) && (

        <button

          className="primary-button"

          type="submit"

          disabled={mutation.isPending}

        >

          {mutation.isPending

            ? "Saving…"

            : run.status === "setup"

            ? "Save & approve production"

            : "Save inspection"}

        </button>

      )}

    </form>

  );

}

function EntryDialog({

  mode,

  onClose,

  machines,

  runs,

  onSaved,

  initialMachineId = "",

}) {

  const [machineId, setMachineId] = useState(initialMachineId),

    [pieces, setPieces] = useState(""),

    [planningLineId, setPlanningLineId] = useState("");

  const run = runs.find(

    (r) =>

      String(r.machineId) === machineId &&

      String(r.jobCardId) === planningLineId

  );

  const record = useMutation({

      mutationFn: addProductionBundle,

      onSuccess: onSaved,

    }),

    check = useMutation({ mutationFn: approveHoleCheck, onSuccess: onSaved });

  const mutation = mode === "add" ? record : check;

  const job = useQuery({

    queryKey: ["job-card", run?.jobCardId],

    queryFn: () => getJobCard(run.jobCardId),

    enabled: mode === "check" && Boolean(run?.jobCardId),

  });

  const remaining = Math.max(

    0,

    Number(run?.productionQty || 0) -

      Number(run?.jobProducedPieces ?? run?.producedPieces ?? 0)

  );

  const valid =

    Number.isSafeInteger(Number(pieces)) &&

    Number(pieces) > 0 &&

    Number(pieces) <= Math.min(remaining, 100000);

  const ref = useRef(null),

    closeRef = useRef(onClose),

    busyRef = useRef(false);

  useEffect(() => {

    closeRef.current = onClose;

    busyRef.current = mutation.isPending;

  }, [onClose, mutation.isPending]);

  useEffect(() => {

    const previous = document.activeElement;

    const element = ref.current;

    element?.querySelector("select")?.focus();

    const handler = (e) => {

      if (e.key === "Escape" && !busyRef.current) closeRef.current();

      if (e.key === "Tab") {

        const nodes = [

          ...element.querySelectorAll(

            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)"

          ),

        ];

        const first = nodes[0],

          last = nodes[nodes.length - 1];

        if (e.shiftKey && document.activeElement === first) {

          e.preventDefault();

          last?.focus();

        } else if (!e.shiftKey && document.activeElement === last) {

          e.preventDefault();

          first?.focus();

        }

      }

    };

    document.addEventListener("keydown", handler);

    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {

      document.removeEventListener("keydown", handler);

      document.body.style.overflow = overflow;

      previous?.focus();

    };

  }, []);

  return (

    <div

      className="modal-backdrop u1-production-backdrop"

      onMouseDown={(e) => {

        if (e.target === e.currentTarget && !mutation.isPending) onClose();

      }}

    >

      <div

        ref={ref}

        className="inward-modal u1-production-dialog"

        role="dialog"

        aria-modal="true"

        aria-label={mode === "add" ? "Add production" : "Add inspections"}

      >

        <div className="modal-header">

          <h2>{mode === "add" ? "Add production" : "Add inspections"}</h2>

          <button

            type="button"

            className="icon-button modal-close"

            aria-label="Close"

            disabled={mutation.isPending}

            onClick={onClose}

          >

            <span aria-hidden="true">×</span>

          </button>

        </div>

        <div className="modal-body">

          <p className="u1-form-description">

            {mode === "add"

              ? "Choose a machine and enter the quantity produced."

              : "Check the section and cut length, then measure each hole using Next and Previous."}

          </p>

          <label>

            Machine

            <select

              value={machineId}

              disabled={mutation.isPending}

              onChange={(e) => {

                setMachineId(e.target.value);

                setPlanningLineId("");

                setPieces("");

                mutation.reset();

              }}

            >

              <option value="">Select machine</option>

              {machines.map((m) => (

                <option key={m.id} value={m.id}>

                  {m.name}

                  {m.maintenanceId ? " · Under maintenance" : ""}

                </option>

              ))}

            </select>

          </label>

          {machineId && (

            <label>

              Planning / material

              <select

                value={planningLineId}

                disabled={mutation.isPending}

                onChange={(e) => {

                  setPlanningLineId(e.target.value);

                  setPieces("");

                  mutation.reset();

                }}

              >

                <option value="">Select planning material</option>

                {runs

                  .filter((r) => String(r.machineId) === machineId)

                  .map((r) => (

                    <option key={r.id} value={r.jobCardId}>

                      U1-PL-{r.planningId || r.jobCardId} · {r.customerName} ·{" "}

                      {r.memberName}

                    </option>

                  ))}

              </select>

            </label>

          )}

          {machineId &&

            !runs.some((r) => String(r.machineId) === machineId) && (

              <p>

                No active job and coil on this machine. Create planning or

                assign a coil first.

              </p>

            )}

          {run && (

            <p className="u1-production-context">

              <strong>

                U1-PL-{run.planningId || run.jobCardId} · {run.memberName}

              </strong>

              <span>

                Coil {run.coilInternalId || "—"} ·{" "}

                {run.status === "setup"

                  ? "Waiting for first-piece approval"

                  : run.status}

              </span>

            </p>

          )}

          {mode === "add" &&

            run &&

            (run.status !== "running" || !run.holeCheckedAt ? (

              <p className="notice">

                {run.status === "paused"

                  ? "Resume production before entering quantity."

                  : "Complete the first-piece material check before entering quantity."}

              </p>

            ) : (

              <form

                onSubmit={(e) => {

                  e.preventDefault();

                  if (valid)

                    record.mutate({ id: run.id, pieces: Number(pieces) });

                }}

              >

                <p>Remaining quantity: {remaining} NOS</p>

                <label>

                  Produced Qty (NOS)

                  <input

                    type="number"

                    min="1"

                    max={Math.min(remaining, 100000)}

                    step="1"

                    required

                    value={pieces}

                    onChange={(e) => setPieces(e.target.value)}

                    disabled={record.isPending}

                  />

                </label>

                {record.isError && (

                  <p className="notice error" role="alert">

                    {errorText(record.error)}

                  </p>

                )}

                <button

                  className="primary-button"

                  disabled={!valid || record.isPending}

                >

                  {record.isPending ? "Saving…" : "Save production"}

                </button>

              </form>

            ))}

          {mode === "check" && run && (

            <>

              {job.isPending && <p role="status">Loading job dimensions…</p>}

              {job.isError && (

                <p className="notice error">{errorText(job.error)}</p>

              )}

              {job.data && (

                <Measurements

                  key={`${run.id}:${JSON.stringify(job.data)}`}

                  run={run}

                  job={job.data}

                  mutation={check}

                />

              )}

            </>

          )}

        </div>

      </div>

    </div>

  );

}

export default function TableFirstProduction() {
 const [editing,setEditing]=useState(null);

  const user = useSelector((s) => s.auth.user),

    controls = machineControls(user),

    client = useQueryClient();

  const [machineId, setMachineId] = useState(""),

    [page, setPage] = useState(1),

    [dialog, setDialog] = useState(null),

    [job, setJob] = useState(null),

    [coilSelection, setCoilSelection] = useState(null),

    [assignmentMachine, setAssignmentMachine] = useState(null);

  const live = useQuery({

    queryKey: ["production-live"],

    queryFn: getLiveProduction,

    refetchInterval: 10000,

  });

  const entries = useQuery({

    queryKey: ["unit1-live-entries", machineId, page],

    queryFn: () => getLiveEntries(machineId, page),

    refetchInterval: 10000,

  });

  useEffect(() => {

    setPage(1);

  }, [entries.data?.activeShift?.shiftDate, entries.data?.activeShift?.name]);

  const refresh = async () => {

    await Promise.all(

      [

        ...new Set([

          ...jobCardChangeKeys,

          "unit1-live-entries",

          "unit1-hole-reports",

          "unit1-history",

          "unit1-history-dates",

        ]),

      ].map((key) => client.invalidateQueries({ queryKey: [key] }))

    );

  };

  const saved = async (run) => {

    if (run?.id)

      client.setQueryData(["production-live"], (current) =>

        current

          ? {

              ...current,

              runs: (current.runs || []).map((item) =>

                Number(item.id) === Number(run.id) ? run : item

              ),

            }

          : current

      );

    setDialog(null);

    setPage(1);

    await refresh();

  };

  const viewJob = async (id) => {

    try {

      setJob(await getJobCard(id));

    } catch (e) {

      window.alert(errorText(e));

    }

  };

  const actionRuns = (live.data?.runs || []).filter(

    (run) => !machineId || String(run.machineId) === machineId

  );

  const inspectionsEnabled =

    !live.isError &&

    actionRuns.some((run) =>

      ["setup", "running", "paused"].includes(run.status)

    );

  const pages = Math.max(

    1,

    Math.ceil(

      Number(entries.data?.total || 0) / Number(entries.data?.pageSize || 50)

    )

  );

  return (

    <section className="u1-table-production">

      <div className="page-heading">

        <div>

          <p>

            {entries.data?.activeShift?.name === "night" ? "Night" : "Day"}{" "}

            shift · {entries.data?.activeShift?.shiftDate || ""}

          </p>

        </div>

        <div className="live-heading-actions">

          {controls.canBundle && (

            <button

              type="button"

              className="primary-button"

              onClick={() => setDialog("add")}

            >

              Add production

            </button>

          )}

          {controls.canCheck && (

            <button

              type="button"

              className="outline-button"

              disabled={!inspectionsEnabled}

              onClick={() => setDialog("check")}

            >

              Add inspections

            </button>

          )}

          {controls.canScanCoil && (

            <button

              type="button"

              className="outline-button"

              onClick={() => setAssignmentMachine("")}

            >

              Assign Planning &amp; Coil

            </button>

          )}

        </div>

      </div>

      <div className="content-card">

        <div className="u1-maintenance-badges">

          {(live.data?.machines || [])

            .filter((m) => m.maintenanceId)

            .map((m) => (

              <span className="u1-maintenance-badge" key={m.id}>

                {m.name} · Under maintenance

              </span>

            ))}

        </div>

        <div className="u1-production-toolbar">

          <label>

            Machine filter

            <select

              value={machineId}

              onChange={(e) => {

                setMachineId(e.target.value);

                setPage(1);

              }}

            >

              <option value="">All machines</option>

              {(live.data?.machines || []).map((m) => (

                <option key={m.id} value={m.id}>

                  {m.name}

                </option>

              ))}

            </select>

          </label>

          <button

            className="outline-button"

            type="button"

            disabled={entries.isFetching}

            onClick={() => {

              entries.refetch();

              live.refetch();

            }}

          >

            Refresh table

          </button>

        </div>

        {(entries.isPending || live.isPending) && (

          <p role="status">Loading production…</p>

        )}

        {(entries.isError || live.isError) && (

          <p className="notice error" role="alert">

            {errorText(entries.error || live.error)}

          </p>

        )}

        <div

          className="table-scroll u1-live-grid-scroll"

          tabIndex={0}

          role="region"

          aria-label="Live production table, scroll horizontally for all columns"

        >

          <table className="u1-live-grid u1-live-production-grid">

            <thead>

              <tr>

                {[

                  "Machine",

                  "Date / time",

                  "Customer / project",

                  "Material / section",

                  "Job card",

                  "Coil",

                  "NOS",

                  "Coil used (kg)",
                  "Hole scrap (kg)",
                  "Cut blade scrap (kg)",

                  "Entered by",
                  ...(hasAccess(user,'unit1.production.edit') ? ["Actions"] : []),

                ].map((t) => (

                  <th key={t}>{t}</th>

                ))}

              </tr>

            </thead>

            <tbody>

              {(entries.data?.entries || []).map((e) => (

                <tr key={e.id}>

                  <td>{e.machineName}</td>

                  <td>

                    {formatDate(e.createdAt)}

                    <small>{formatTime(e.createdAt)}</small>

                  </td>

                  <td>

                    {e.customerName}

                    <small>{e.projectName}</small>

                  </td>

                  <td>

                    {e.materialType} · {e.memberName}

                    <small>{e.sectionSize}</small>

                  </td>

                  <td>

                    {user?.role === "labour" ? (

                      `U1-PL-${e.planningId || e.jobCardId}`

                    ) : (

                      <button

                        type="button"

                        className="job-link-button"

                        onClick={() => viewJob(e.jobCardId)}

                      >

                        U1-PL-{e.planningId || e.jobCardId}

                      </button>

                    )}

                  </td>

                  <td>

                    <ProductionCoilLink

                      entry={e}

                      canView={controls.canViewCoil}

                      onView={(id, number) => setCoilSelection({ id, number })}

                    />

                  </td>

                  <td>

                    <strong>{e.pieces}</strong>

                  </td>

                  <td>{Number(e.theoreticalUsedKg || 0).toFixed(2)} KG</td>
                  <td>{e.holeScrapKg == null ? "Not available" : `${Number(e.holeScrapKg).toFixed(3)} KG`}</td>
                  <td>{e.cutBladeScrapKg == null ? "—" : Number(e.cutBladeScrapKg).toFixed(3)}</td>

                  <td>{e.enteredByName || "—"}</td>
 {hasAccess(user,'unit1.production.edit')&&<td><button type="button" className="outline-button stock-icon-button" aria-label="Edit production entry" title="Edit production entry" onClick={()=>setEditing(e)}><Pencil size={18}/></button></td>}

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {entries.isSuccess && !entries.data.entries.length && (

          <p>No production entries for this shift.</p>

        )}

        {pages > 1 && (

          <div className="modal-footer">

            <button

              type="button"

              className="outline-button"

              disabled={page <= 1}

              onClick={() => setPage((v) => v - 1)}

            >

              Previous

            </button>

            <span>

              Page {page} / {pages}

            </span>

            <button

              type="button"

              className="outline-button"

              disabled={page >= pages}

              onClick={() => setPage((v) => v + 1)}

            >

              Next

            </button>

          </div>

        )}

      </div>

      {assignmentMachine !== null && (

        <AssignmentDialog

          machineId={assignmentMachine}

          canAssign={controls.canAssign}

          onClose={() => setAssignmentMachine(null)}

        />

      )}

      {dialog && (

        <EntryDialog

          key={dialog}

          mode={dialog}

          initialMachineId={machineId}

          onClose={() => setDialog(null)}

          machines={live.data?.machines || []}

          runs={live.data?.runs || []}

          onSaved={saved}

        />

      )}

      {editing&&<ProductionEntryEditor entry={editing} onClose={()=>setEditing(null)}/>}
 {job && <JobCardDetails key={job.id} job={job} onClose={() => setJob(null)} allowPreview />}

      {coilSelection && (

        <ProductionCoilDetails

          selection={coilSelection}

          onClose={() => setCoilSelection(null)}

        />

      )}

    </section>

  );

}



function AssignmentDialog({ machineId, canAssign, onClose }) {

  const ref = useRef(null),

    [busy, setBusy] = useState(false);

  useEffect(() => {

    const dialog = ref.current;

    dialog.showModal();

    return () => dialog.close();

  }, []);

  return (

    <dialog

      ref={ref}

      className="inward-modal u1-coil-details-dialog"

      aria-labelledby="assignment-title"

      onCancel={(e) => {

        e.preventDefault();

        if (!busy) onClose();

      }}

    >

      <div className="modal-header">

        <h2 id="assignment-title">

          {canAssign ? "Assign planning & coil" : "Assign coil"}

        </h2>

        <button

          type="button"

          className="modal-close"

          disabled={busy}

          aria-label="Close assignment"

          onClick={onClose}

        >

          ×

        </button>

      </div>

      <div className="modal-body">

        <AssignCoilScreen

          embedded

          initialMachineId={machineId}

          onBusyChange={setBusy}

          onDone={onClose}

        />

      </div>

    </dialog>

  );

}
