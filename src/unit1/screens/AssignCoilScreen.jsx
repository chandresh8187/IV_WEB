import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  getLiveProduction,
  getJobCards,
  verifyProductionCoil,
  startProductionRun,
  changeProductionRun,
  unassignJobCard,
} from "../api/productionApi";
import { getScannedCoil, lookupCoilCode } from "../api/coilApi";
import { jobCardChangeKeys } from "../utils/jobCardChangeKeys";
import { machineControls } from "../utils/machineControls";
import LoadingIndicator from "../../components/LoadingIndicator";
import {createQrVideoReader} from '../utils/qrVideoReader';
import "../components/TableFirstProduction.css";
const errorText = (e) =>
  e?.response?.data?.error || e?.response?.data?.message || e?.message;
export default function AssignCoilScreen({
  initialMachineId = "",
  onBusyChange,
  onDone,
}) {
  const user = useSelector((s) => s.auth.user),
    controls = machineControls(user),
    client = useQueryClient();
  const [machineId, setMachineId] = useState(String(initialMachineId)),
    [jobId, setJobId] = useState(""),
    [code, setCode] = useState(""),
    [verified, setVerified] = useState(null),
    [qrStock,setQrStock]=useState(null),
    [scanning, setScanning] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const video = useRef(null),
    scanCallback = useRef(null);
  const live = useQuery({
    queryKey: ["production-live"],
    queryFn: getLiveProduction,
    enabled: controls.canScanCoil,
    refetchInterval: 10000,
  });
  const jobs = useQuery({
    queryKey: ["unit1-job-cards", "coil-assignment", machineId],
    queryFn: () => getJobCards({status:"open",machineId}),
    enabled: controls.canScanCoil && Boolean(machineId),
    refetchInterval: 10000,
  });
  const job = jobs.data?.find(
      (j) =>
        j.status === "open" &&
        (jobId ? String(j.id) === jobId : String(j.machineId) === machineId)
    ),
    run = live.data?.runs?.find((r) => String(r.machineId) === machineId);
  const refresh = () =>
    Promise.all(
      jobCardChangeKeys.map((key) =>
        client.invalidateQueries({ queryKey: [key] })
      )
    );
  const assign = useMutation({
    mutationFn: startProductionRun,
    onSuccess: async () => {
      setVerified(null);setQrStock(null);
      setCode("");
      await refresh();
      onDone?.();
      window.alert(
        "Coil assigned. Record the first-piece inspection before adding production."
      );
    },
  });
  const release = useMutation({
    mutationFn: changeProductionRun,
    onSuccess: refresh,
  });
  useEffect(() => {
    onBusyChange?.(busy || assign.isPending || release.isPending);
  }, [busy, assign.isPending, release.isPending, onBusyChange]);
  const unassign = useMutation({
    mutationFn: unassignJobCard,
    onSuccess: async () => {
      setJobId("");
      setVerified(null);setQrStock(null);
      setCode("");
      await refresh();
    },
  });
  const verify = async (payload) => {
    if (!job || run || (!payload && !controls.canEnterCoilId)) return;
    setScanning(false);
    setBusy(true);
    setVerified(null);setQrStock(null);
    setError("");
    try {
      let coil;
      if (payload) {
        const match = String(payload).match(
          /(?:^|\/)scan\/coil\/([^/?#]+)\/(\d+)(?:[?#]|$)/i
        );
        if (!match) throw new Error("Scan a valid Unit 1 coil QR label.");
        coil = await getScannedCoil(
          decodeURIComponent(match[1]),
          Number(match[2])
        );
      } else coil = await lookupCoilCode(code);
      if(coil.stockQrId){const result=await verifyProductionCoil({jobCardId:job.id,stockQrId:coil.stockQrId,scanProof:coil.scanProof});if(!result.requiresInward){setVerified({...result,jobCardId:job.id,scanProof:coil.scanProof});return;}setQrStock({...result,jobCardId:job.id,scanProof:coil.scanProof});return;}
      await verifyProductionCoil({
        jobCardId: job.id,
        coilId: coil.coilId,
        coilNumber: coil.coilNumber,
        scanProof: coil.scanProof,
      });
      setVerified({ ...coil, jobCardId: job.id });
    } catch (e) {
      setError(errorText(e));
      window.alert(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const selectStockInward=async inwardId=>{if(!inwardId){setVerified(null);return;}if(!qrStock||Number(qrStock.jobCardId)!==Number(job?.id))return;setBusy(true);setVerified(null);setError('');try{const result=await verifyProductionCoil({jobCardId:job.id,stockQrId:qrStock.stockQrId,inwardId:Number(inwardId),scanProof:qrStock.scanProof});setVerified({...result,scanProof:qrStock.scanProof});}catch(e){setError(errorText(e));}finally{setBusy(false);}};
  useEffect(() => {
    scanCallback.current = verify;
  });
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false,
      stream,
      frame;
    const detector=createQrVideoReader();
    const scan = async () => {
      if (cancelled) return;
      try {
        if (video.current?.readyState >= 2) {
          const values = await detector.detect(video.current);
          if (cancelled) return;
          if (values[0]?.rawValue) {
            scanCallback.current(values[0].rawValue);
            return;
          }
        }
      } catch (e) {
        setError(e.message);
        setScanning(false);
        return;
      }
      frame = requestAnimationFrame(scan);
    };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Camera requires HTTPS or localhost. You can enter the coil number below."
          );
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        if (!cancelled) scan();
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setScanning(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);
  if (!controls.canScanCoil)
    return (
      <p className="notice error">
        Coil assignment is unavailable for your role.
      </p>
    );
  return (
    <section className="u1-coil-assignment">
      <section className="content-card u1-coil-form">
        <p className="u1-form-description">
          Select a machine, scan its coil QR{controls.canEnterCoilId ? ' or enter the printed Coil ID' : ''}, then confirm assignment.
        </p>
        <label className="form-field">
          Machine
          <select
            value={machineId}
            disabled={busy || assign.isPending || release.isPending || scanning}
            onChange={(e) => {
              setMachineId(e.target.value);
              setJobId("");
              setVerified(null);setQrStock(null);
              setCode("");
              setError("");
              assign.reset();
            }}
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
        {((machineId && jobs.isPending) || live.isPending) && (
          <LoadingIndicator label="Loading assigned jobs…" />
        )}
        {(jobs.isError || live.isError) && (
          <p className="notice error">{errorText(jobs.error || live.error)}</p>
        )}
        {machineId && !job && !jobs.isPending && (
          <p>Select a planning material for this machine below.</p>
        )}
        {machineId && !run && (
          <label className="form-field">
            Planning / material
            <select
              value={String(job?.id || "")}
              disabled={busy || assign.isPending || scanning}
              onChange={(e) => {
                setJobId(e.target.value);
                setVerified(null);setQrStock(null);
                setCode("");
                setError("");
              }}
            >
              <option value="">Select planning material</option>
              {(jobs.data || [])
                .filter(
                  (j) =>
                    j.status === "open" &&
                    String(j.machineId || j.plannedMachineId) === machineId
                )
                .map((j) => (
                  <option key={j.id} value={j.id}>
                    U1-PL-{j.planningId || j.id} · {j.customerName} ·{" "}
                    {j.memberName}
                  </option>
                ))}
            </select>
          </label>
        )}
        {job && (
          <>
            <p>
              <strong>
                U1-PL-{job.planningId || job.id} · {job.customerName} ·{" "}
                {job.memberName}
              </strong>
            </p>
            {!job.allowedCoilSizes?.length && (
              <p>No allowed coil sizes. Add sizes to the Job Card template first.</p>
            )}
          </>
        )}
        {job?.machineId && !run && controls.canUnassign && (
          <button
            type="button"
            className="outline-button"
            disabled={
              unassign.isPending || busy || assign.isPending || scanning
            }
            onClick={() => {
              if (
                window.confirm(
                  "Unassign this job card? Existing production stays unchanged."
                )
              )
                unassign.mutate(job.id);
            }}
          >
            Unassign job card
          </button>
        )}
        {unassign.isError && (
          <p className="notice error" role="alert">
            {errorText(unassign.error)}
          </p>
        )}
        {run ? (
          <>
            <p>
              Current coil: {run.coilInternalId}. Release it before assigning
              another coil.
            </p>
            {controls.canRemoveCoil && (
              <button
                type="button"
                className="outline-button"
                disabled={release.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Record all produced quantities first. Release this coil?"
                    )
                  )
                    release.mutate({
                      id: run.id,
                      action: run.status === "setup" ? "remove" : "return-coil",
                    });
                }}
              >
                {run.status === "setup"
                  ? "Remove setup coil"
                  : "Remove coil from machine"}
              </button>
            )}
            {controls.canControl && run.status !== "setup" && (
              <button
                type="button"
                className="outline-button"
                disabled={release.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Complete the coil? It will no longer be reusable."
                    )
                  )
                    release.mutate({ id: run.id, action: "complete" });
                }}
              >
                Complete coil
              </button>
            )}
          </>
        ) : (
          job && (
            <>
              <div className="live-heading-actions">
                <button
                  type="button"
                  className="outline-button"
                  disabled={
                    busy || assign.isPending || !job.allowedCoilSizes?.length
                  }
                  onClick={() => {
                    setError("");
                    setScanning((v) => !v);
                  }}
                >
                  {scanning ? "Stop camera" : "Scan coil QR"}
                </button>
              </div>
              {scanning && (
                <video
                  ref={video}
                  muted
                  playsInline
                  style={{ width: "100%", maxHeight: 320, marginTop: 16 }}
                  aria-label="Coil QR camera"
                />
              )}
              <p className="u1-coil-divider">
                Or enter the number printed on the coil label
              </p>
              {controls.canEnterCoilId && <>
              <label className="form-field">
                Coil QR ID
                <input
                  inputMode="text"
                  autoCapitalize="characters"
                  maxLength={10}
                  value={code}
                  disabled={busy || assign.isPending || scanning}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                    setVerified(null);setQrStock(null);
                  }}
                />
              </label>
              <button
                type="button"
                className="outline-button"
                disabled={
                  busy ||
                  assign.isPending ||
                  scanning ||
                  !/^(?:\d{6}|CQ\d{8})$/i.test(code) ||
                  !job.allowedCoilSizes?.length
                }
                onClick={() => verify()}
              >
                {busy ? "Verifying…" : "Verify coil number"}
              </button>
              </>}
              {qrStock&&Number(qrStock.jobCardId)===Number(job.id)&&<label className="form-field">Stock inward / rate<select value={verified?.coilId?String(verified.coilId):''} disabled={busy||assign.isPending} onChange={e=>selectStockInward(e.target.value)}><option value="">Select inward and rate</option>{qrStock.inwards.map(r=><option value={r.id} key={r.id}>{r.invoice||'Inward #'+r.id} · {r.vendorCode||'Vendor not recorded'} · ₹{r.ratePerKg??'Not recorded'}/kg · {r.remainingKg==null?'Weight pending':r.remainingKg+' kg'}</option>)}</select></label>}
              {verified && (
                <>
                  <p>
                    Verified coil: {verified.internalId || verified.reference}
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      assign.isPending ||
                      busy ||
                      Number(verified.jobCardId) !== Number(job.id)
                    }
                    onClick={() =>
                      assign.mutate({
                        ...(controls.canAssign
                          ? { machineId: Number(machineId) }
                          : {}),
                        jobCardId: job.id,
                        ...(verified.stockQrId?{stockQrId:verified.stockQrId,selectedRatePerKg:verified.ratePerKg}:{}),
                        coilId: verified.coilId,
                        coilNumber: verified.coilNumber,
                        scanProof: verified.scanProof,
                      })
                    }
                  >
                    {assign.isPending ? "Assigning…" : "Assign verified coil"}
                  </button>
                </>
              )}
            </>
          )
        )}
        {(error || assign.isError || release.isError) && (
          <p className="notice error" role="alert">
            {error || errorText(assign.error || release.error)}
          </p>
        )}
      </section>
    </section>
  );
}


