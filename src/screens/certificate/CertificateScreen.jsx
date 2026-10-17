import LoadingIndicator from "../../components/LoadingIndicator";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FileCheck2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

import {
  createCertificateApi,
  deleteCertificatesApi,
  generateCertificatePdfApi,
  getCertificateByIdApi,
  getCertificatePlanningApi,
  getCertificateReadingsApi,
  getCertificatesApi,
} from "../../api/certificateApi";
import socket from "../../socket/socket";
import { formatDisplayDate, todayInputDate } from "../../utils/dateTime";
import { getCoatingRange } from "../../utils/coatingRange";
import "./CertificateScreen.css";

const REFERENCE_STANDARD = "IS 4759, IS 6745, IS 2633, IS 2629";
const FIXED_QUANTITY = "As per challan";
const STRUCTURES = [
  ["SOLAR MOUNTING STRUCTURE", "Solar Mounting Structure"],
  ["HIGHWAY / RAILWAY STRUCTURE", "Highway / Railway Structure"],
  ["GRATING", "Grating"],
  ["CABLE TRAY", "Cable Tray"],
  ["EARTHING STRIP", "Earthing Strip"],
  ["MS STRUCTURE", "MS Structure (General)"],
];
const CHECKLIST_DEFAULTS = [
  { key: "visual_check", label: "Visual Check (IS 2629)", result: "Free From Flux, Ash Dross Black soot", observation: "OK" },
  { key: "adhesion_test", label: "Adhesion Test (IS 2629)", result: "NO Flacking of Zinc Coating", observation: "OK" },
  { key: "knife_test", label: "Knife Test (IS 2629)", result: "NO Peeling of Zinc Coating", observation: "OK" },
  { key: "mass_test", label: "Mass of Zinc Coating Test (IS 4759 / IS 6745)", result: "", observation: "As per below mention" },
  { key: "preece_test", label: "Preece Test (IS 2633)", result: "NO Copper effect", observation: "NA" },
];
const initialForm = () => ({
  planning_id: "",
  structure: "",
  material_description: "",
  inspection_date: todayInputDate(),
  client_name: "",
  client_address: "",
  third_party_name: "",
  invoice_no: "",
  minimum_coating: "",
  maximum_coating: "",
  remarks: "The average coating found within limit, so found satisfactory.",
});

const getUser = () => {
  for (const key of ["iv_user", "user", "auth"]) {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "null");
      if (stored?.user) return stored.user;
      if (stored?.role) return stored;
    } catch { /* Try the next storage key. */ }
  }
  return {};
};
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const safeFileName = value => String(value || "certificate").replace(/[^a-z0-9_-]+/gi, "-");
const savedReadings = certificate => {
  const value = certificate?.coating_readings_json;
  try { return Array.isArray(value) ? value : JSON.parse(value || "[]"); }
  catch { return []; }
};

function ReadingRow({ row, index }) {
  const values = [row.c1, row.c2, row.c3, row.c4, row.c5].map(Number);
  const average = Number.isFinite(Number(row.avg_coating)) && row.avg_coating != null
    ? Number(row.avg_coating)
    : values.reduce((sum, value) => sum + value, 0) / 5;
  return (
    <tr>
      <td>{index + 1}</td>
      {values.map((value, column) => <td key={column}>{Number.isFinite(value) ? Math.round(value) : "—"}</td>)}
      <td>{Number.isFinite(average) ? Math.round(average) : "—"}</td>
      <td>{Number.isFinite(average) ? Math.round(average * 7.14) : "—"}</td>
    </tr>
  );
}

export default function CertificateScreen() {
  const user = useMemo(() => getUser(), []);
  const canCreate = ["superadmin", "admin"].includes(String(user?.role || "").toLowerCase());
  const [certificates, setCertificates] = useState([]);
  const [planning, setPlanning] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [checklist, setChecklist] = useState(CHECKLIST_DEFAULTS);
  const [readings, setReadings] = useState([]);
  const [matchingCount, setMatchingCount] = useState(0);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [readingsError, setReadingsError] = useState("");
  const [reshuffle, setReshuffle] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState([]);
  const [deletingCertificates, setDeletingCertificates] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const openCreateForm = () => {
    setForm(initialForm());
    setChecklist(CHECKLIST_DEFAULTS.map(item => ({ ...item })));
    setReadings([]);
    setMatchingCount(0);
    setReadingsError("");
    setReshuffle(0);
    setMessage(null);
    setFormOpen(true);
  };

  const updateForm = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const selectedPlanning = useMemo(
    () => planning.find(item => String(item.id) === String(form.planning_id)) || null,
    [planning, form.planning_id],
  );
  const coatingRange = useMemo(
    () => getCoatingRange(form.minimum_coating, form.maximum_coating),
    [form.minimum_coating, form.maximum_coating],
  );
  const filteredCertificates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return certificates.filter(item =>
      [item.tc_no, item.challan_no, item.party_name, item.client_name, item.structure, item.third_party_name]
        .some(value => String(value || "").toLowerCase().includes(term)),
    );
  }, [certificates, search]);

  const loadData = useCallback(async () => {
    try {
      const [certificateResponse, planningResponse] = await Promise.all([
        getCertificatesApi(), getCertificatePlanningApi(),
      ]);
      const nextCertificates = Array.isArray(certificateResponse?.data) ? certificateResponse.data : [];
      setCertificates(nextCertificates);
      setSelectedCertificateIds(previous => previous.filter(id => nextCertificates.some(item => item.id === id)));
      setPlanning(Array.isArray(planningResponse?.data) ? planningResponse.data : []);
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, "Could not load certificates.") });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const refresh = () => loadData();
    socket.on("certificate_updated", refresh);
    socket.on("production_planning_updated", refresh);
    return () => {
      socket.off("certificate_updated", refresh);
      socket.off("production_planning_updated", refresh);
    };
  }, [loadData]);

  useEffect(() => {
    if (!selectedPlanning?.id || coatingRange.error) {
      setReadings([]);
      setMatchingCount(0);
      setReadingsError("");
      setReadingsLoading(false);
      return;
    }
    let active = true;
    setReadingsLoading(true);
    setReadingsError("");
    getCertificateReadingsApi({
      planningId: selectedPlanning.id,
      minimum: coatingRange.minimum == null ? "" : String(coatingRange.minimum),
      maximum: coatingRange.maximum == null ? "" : String(coatingRange.maximum),
    }).then(response => {
      if (!active) return;
      setReadings(Array.isArray(response?.data?.readings) ? response.data.readings : []);
      setMatchingCount(Number(response?.data?.matching_count) || 0);
    }).catch(error => {
      if (!active) return;
      setReadings([]);
      setMatchingCount(0);
      setReadingsError(errorMessage(error, "Could not load production entries for this challan."));
    }).finally(() => { if (active) setReadingsLoading(false); });
    return () => { active = false; };
  }, [selectedPlanning?.id, coatingRange.minimum, coatingRange.maximum, coatingRange.error, reshuffle]);

  const selectPlanning = id => {
    const selected = planning.find(item => String(item.id) === String(id));
    setReadings([]);
    setMatchingCount(0);
    setForm(current => ({
      ...current,
      planning_id: id,
      material_description: selected?.material_description || "",
      client_name: current.client_name || selected?.party_name || "",
      third_party_name: current.third_party_name || selected?.third_party_name || "",
    }));
  };
  const updateChecklist = (key, field, value) => setChecklist(current =>
    current.map(item => item.key === key ? { ...item, [field]: value } : item));

  const openPdf = async (certificate, selectedReadings) => {
    setPdfUrl(previous => { if (previous) URL.revokeObjectURL(previous); return ""; });
    setPdfName("");
    setPdfLoading(true);
    try {
      const blob = await generateCertificatePdfApi({ certificate, readings: selectedReadings });
      const url = URL.createObjectURL(blob);
      setPdfUrl(previous => { if (previous) URL.revokeObjectURL(previous); return url; });
      setPdfName(`certificate-${safeFileName(certificate.tc_no)}.pdf`);
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, "Certificate was saved, but its PDF could not be opened.") });
    } finally { setPdfLoading(false); }
  };
  const closePdf = () => {
    setPdfUrl(previous => { if (previous) URL.revokeObjectURL(previous); return ""; });
    setPdfName("");
  };
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const openCertificate = async item => {
    setPdfLoading(true);
    try {
      const response = await getCertificateByIdApi(item.id);
      const certificate = response?.data || item;
      let selectedReadings = savedReadings(certificate);
      if (!selectedReadings.length && certificate.planning_id) {
        const result = await getCertificateReadingsApi({
          planningId: certificate.planning_id,
          minimum: certificate.minimum_coating ?? "",
          maximum: certificate.maximum_coating ?? "",
        });
        selectedReadings = result?.data?.readings || [];
      }
      await openPdf(certificate, selectedReadings);
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, "Could not open certificate.") });
    } finally { setPdfLoading(false); }
  };

  const toggleCertificateSelection = id => {
    setSelectedCertificateIds(previous => previous.includes(id)
      ? previous.filter(selectedId => selectedId !== id)
      : [...previous, id]);
  };
  const deleteSelectedCertificates = async ids => {
    if (!window.confirm(`Delete ${ids.length} selected TC${ids.length === 1 ? "" : "s"}? Issued TC numbers will not be reused.`)) return;
    setDeletingCertificates(true);
    try {
      for (let offset = 0; offset < ids.length; offset += 100) {
        await deleteCertificatesApi(ids.slice(offset, offset + 100));
      }
      setSelectedCertificateIds(previous => previous.filter(id => !ids.includes(id)));
      setMessage({ type: "success", text: `${ids.length} certificate${ids.length === 1 ? "" : "s"} deleted. TC numbers remain reserved.` });
      await loadData();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, "Could not delete certificates. Refresh the list and try again.") });
      await loadData();
    } finally { setDeletingCertificates(false); }
  };

  const submitCertificate = async event => {
    event.preventDefault();
    if (!selectedPlanning?.id) return setMessage({ type: "error", text: "Please select a challan number." });
    if (!form.structure) return setMessage({ type: "error", text: "Please select a structure." });
    if (!form.client_name.trim()) return setMessage({ type: "error", text: "Please enter the client name." });
    if (!form.invoice_no.trim()) return setMessage({ type: "error", text: "Please enter the invoice number." });
    if (!form.inspection_date) return setMessage({ type: "error", text: "Please select the date of inspection." });
    if (coatingRange.error) return setMessage({ type: "error", text: coatingRange.error });
    if (readingsLoading) return setMessage({ type: "error", text: "Wait for coating readings to load." });
    if (!readings.length) return setMessage({ type: "error", text: `No complete C1-C5 production readings found with ${coatingRange.description}.` });

    setSaving(true);
    const checklistPayload = checklist.reduce((result, item) => {
      result[`${item.key}_result`] = item.result;
      result[`${item.key}_observation`] = item.observation;
      return result;
    }, {});
    const details = {
      planning_id: selectedPlanning.id,
      certificate_type: "auto",
      client_name: form.client_name.trim(),
      client_address: form.client_address.trim(),
      third_party_name: form.third_party_name.trim(),
      invoice_no: form.invoice_no.trim(),
      structure: form.structure,
      material_description: form.material_description,
      minimum_coating: coatingRange.minimum,
      maximum_coating: coatingRange.maximum,
      quantity: FIXED_QUANTITY,
      inspection_date: form.inspection_date,
      reference_standard: REFERENCE_STANDARD,
      coating_readings: readings,
      remarks: form.remarks,
      ...checklistPayload,
    };
    try {
      const response = await createCertificateApi(details);
      const tcNo = response?.data?.tc_no;
      if (!tcNo) throw new Error("Server did not return a certificate number.");
      setMessage({ type: "success", text: `Certificate ${tcNo} generated successfully.` });
      await loadData();
      setFormOpen(false);
      await openPdf({ ...details, tc_no: tcNo, challan_no: selectedPlanning.challan_no }, readings);
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, "Could not generate certificate.") });
    } finally { setSaving(false); }
  };

  return (
    <main className="certificate-screen">
      <header className="certificate-header-card">
        <div><h1>Test Certificates</h1><p>View and manage generated coating test certificates</p></div>
        {canCreate && <button type="button" className="certificate-new-button" onClick={openCreateForm}><Plus size={18} /> Generate New</button>}
      </header>

      {message && <div role="status" className={`certificate-message ${message.type}`}>
        <span>{message.text}</span>
        <button type="button" aria-label="Close message" onClick={() => setMessage(null)}><X size={16} /></button>
      </div>}

      <section className="certificate-card">
        <div className="certificate-card-heading">
          <h2>Generated certificates</h2>
          <button type="button" className="certificate-light-button" onClick={loadData}><RefreshCw size={15} /> Refresh</button>
        </div>
        <label className="certificate-search"><Search size={17} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search TC, challan, party or structure" /></label>
        {canCreate && selectedCertificateIds.length > 0 && <button type="button" className="certificate-delete-selected" disabled={deletingCertificates} onClick={() => deleteSelectedCertificates(selectedCertificateIds)}>Delete selected ({selectedCertificateIds.length})</button>}
        {loading ? <LoadingIndicator label="Loading certificates…" /> : filteredCertificates.length ? (
          <div className="certificate-table-scroll"><table className="certificate-register-table"><thead><tr>
            {canCreate && <th scope="col">Select</th>}<th scope="col">TC No.</th><th scope="col">Inspection Date</th><th scope="col">Challan No.</th><th scope="col">Client / Party</th><th scope="col">Structure</th><th scope="col">Actions</th>
          </tr></thead><tbody>{filteredCertificates.map(item => (
            <tr key={item.id}>
              {canCreate && <td><input type="checkbox" aria-label={`Select ${item.tc_no}`} checked={selectedCertificateIds.includes(item.id)} onChange={() => toggleCertificateSelection(item.id)} /></td>}
              <td className="certificate-tc-number">{item.tc_no}</td>
              <td>{item.inspection_date ? formatDisplayDate(item.inspection_date) : "—"}</td>
              <td>{item.challan_no || "—"}</td>
              <td>{item.client_name || item.party_name || "—"}</td>
              <td>{item.structure || "—"}</td>
              <td><div className="certificate-row-actions">
                <button type="button" className="certificate-view-button" onClick={() => openCertificate(item)} disabled={pdfLoading || deletingCertificates}><Eye size={15} /> View</button>
                {canCreate && <button type="button" className="certificate-delete-button" onClick={() => deleteSelectedCertificates([item.id])} disabled={deletingCertificates}><Trash2 size={15} /> Delete</button>}
              </div></td>
            </tr>
          ))}</tbody></table></div>
        ) : <p className="certificate-muted">{search ? "No certificates match your search." : "Generated certificates will appear here."}</p>}
      </section>

      {canCreate && formOpen && <div className="certificate-form-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
        <div className="certificate-form-modal" role="dialog" aria-modal="true" aria-labelledby="certificate-form-title">
          <header className="certificate-form-header"><div><h2 id="certificate-form-title">Generate New Certificate</h2><p>TC No. is generated automatically when you save</p></div><button type="button" aria-label="Close form" onClick={() => setFormOpen(false)} disabled={saving}><X size={20} /></button></header>
          <form className="certificate-form" onSubmit={submitCertificate}>
          {message?.type === "error" && <div role="alert" className="certificate-message error"><span>{message.text}</span><button type="button" aria-label="Close message" onClick={() => setMessage(null)}><X size={16} /></button></div>}
        <section className="certificate-card">
          <h2>Challan &amp; Structure</h2>
          <label className="certificate-field"><span>Challan No. *</span><select value={form.planning_id} onChange={event => selectPlanning(event.target.value)}>
            <option value="">Select challan from planning</option>
            {planning.map(item => <option key={item.id} value={item.id}>{item.challan_no} • {item.party_name || "-"} [{String(item.status || "pending").toUpperCase()}]</option>)}
          </select></label>
          <label className="certificate-field"><span>Structure *</span><select value={form.structure} onChange={event => updateForm("structure", event.target.value)}>
            <option value="">Select structure</option>
            {STRUCTURES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></label>
          <label className="certificate-field"><span>Material Description (auto-filled from challan, editable)</span><textarea rows="2" value={form.material_description} onChange={event => updateForm("material_description", event.target.value)} /></label>
          <h3>Production Reading Range</h3>
          <div className="certificate-two-column">
            <label className="certificate-field"><span>Minimum Avg. Coating</span><input type="number" min="0" step="any" value={form.minimum_coating} onChange={event => updateForm("minimum_coating", event.target.value)} /></label>
            <label className="certificate-field"><span>Maximum Avg. Coating</span><input type="number" min="0" step="any" value={form.maximum_coating} onChange={event => updateForm("maximum_coating", event.target.value)} /></label>
          </div>
          <p className={coatingRange.error ? "certificate-error" : "certificate-muted"}>{coatingRange.error || `Leave both empty to randomly select entries with ${coatingRange.description}.`}</p>
        </section>

        <section className="certificate-card">
          <h2>Certificate Details</h2>
          <label className="certificate-field"><span>Date of Inspection *</span><input type="date" value={form.inspection_date} onChange={event => updateForm("inspection_date", event.target.value)} /></label>
          <label className="certificate-field"><span>Client Name *</span><input value={form.client_name} onChange={event => updateForm("client_name", event.target.value)} /></label>
          <label className="certificate-field"><span>Client Address (shown under client name on certificate)</span><textarea rows="2" value={form.client_address} onChange={event => updateForm("client_address", event.target.value)} /></label>
          <div className="certificate-two-column">
            <label className="certificate-field"><span>Third Party Name</span><input value={form.third_party_name} onChange={event => updateForm("third_party_name", event.target.value)} /></label>
            <label className="certificate-field"><span>Invoice No. *</span><input value={form.invoice_no} onChange={event => updateForm("invoice_no", event.target.value)} /></label>
          </div>
          <div className="certificate-fixed"><span>Supplier</span><strong>IV SQUARE STRUCTURE INDIA PVT LTD</strong></div>
          <div className="certificate-fixed"><span>Quantity</span><strong>{FIXED_QUANTITY}</strong></div>
          <div className="certificate-fixed"><span>Reference Standard</span><strong>{REFERENCE_STANDARD}</strong></div>
        </section>

        <section className="certificate-card">
          <div className="certificate-card-heading"><h2>Production Coating Readings</h2>{matchingCount > 1 && <button type="button" className="certificate-light-button" onClick={() => setReshuffle(value => value + 1)} disabled={readingsLoading}><RefreshCw size={15} /> Reshuffle</button>}</div>
          {!selectedPlanning ? <p className="certificate-muted">Select a challan to load its production coating readings.</p>
            : coatingRange.error ? <p className="certificate-error">{coatingRange.error}</p>
            : readingsLoading ? <LoadingIndicator label="Selecting random production entries…" />
            : readingsError ? <p className="certificate-error">{readingsError}</p>
            : <><p className="certificate-muted">{readings.length} random production {readings.length === 1 ? "entry" : "entries"} selected from {matchingCount} matching {matchingCount === 1 ? "entry" : "entries"} with {coatingRange.description}. A maximum of 10 will appear in the PDF.</p>
              {readings.length > 0 && <div className="certificate-table-scroll"><table className="certificate-readings"><thead><tr><th>Sr.</th><th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th><th>Avg. Micron</th><th>Avg. gm/m²</th></tr></thead><tbody>{readings.map((row, index) => <ReadingRow key={row.id || index} row={row} index={index} />)}</tbody></table></div>}
            </>}
        </section>

        <section className="certificate-card"><h2>QC Checklist</h2>{checklist.map(item => <div className="certificate-checklist" key={item.key}>
          <h3>{item.label}</h3>
          <label className="certificate-field"><span>Test Result</span><textarea rows="2" value={item.result} onChange={event => updateChecklist(item.key, "result", event.target.value)} /></label>
          <label className="certificate-field"><span>Observation</span><input value={item.observation} onChange={event => updateChecklist(item.key, "observation", event.target.value)} /></label>
        </div>)}</section>

        <section className="certificate-card"><h2>Remarks</h2><label className="certificate-field"><textarea rows="3" value={form.remarks} onChange={event => updateForm("remarks", event.target.value)} /></label></section>
          <div className="certificate-form-footer"><button type="button" className="certificate-cancel-button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="certificate-generate" disabled={saving || readingsLoading}><FileCheck2 size={20} /> {saving ? <LoadingIndicator label="GENERATING…" inline /> : "GENERATE CERTIFICATE"}</button></div>
          </form>
        </div>
      </div>}

      {(pdfLoading || pdfUrl) && <div className="certificate-pdf-backdrop" role="dialog" aria-modal="true" aria-label="Certificate PDF">
        <div className="certificate-pdf-panel"><header><strong>{pdfName || <LoadingIndicator label="Preparing certificate PDF…" inline />}</strong><div>{pdfUrl && <a href={pdfUrl} download={pdfName}>Download PDF</a>}<button type="button" onClick={closePdf} aria-label="Close PDF"><X size={19} /></button></div></header>
          {pdfUrl ? <iframe src={pdfUrl} title="Certificate PDF" /> : <LoadingIndicator label="Preparing certificate PDF…" />}
        </div>
      </div>}
    </main>
  );
}
