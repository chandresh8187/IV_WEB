import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  createCertificateApi,
  getCertificateByIdApi,
  getCertificatePlanningApi,
  getCertificatesApi,
  getProductionsByChallanApi,
} from "../../api/certificateApi";

import socket from "../../socket/socket";
import "./CertificateScreen.css";

const REFERENCE_STANDARD = "IS 4759, IS 6745, IS 2633, IS 2629";

const MAX_READINGS = 10;
const ZINC_DENSITY = 7.14;

const STRUCTURES = [
  "SOLAR MOUNTING STRUCTURE",
  "HIGHWAY / RAILWAY STRUCTURE",
  "GRATING",
  "CABLE TRAY",
  "EARTHING STRIP",
  "MS STRUCTURE",
];

const CHECKLIST_DEFAULTS = [
  {
    key: "visual_check",
    specification: "IS 2629",
    test: "Visual Check",
    result: "Free From Flux, Ash Dross Black soot",
    observation: "OK",
  },
  {
    key: "adhesion_test",
    specification: "IS 2629",
    test: "Adhesion Test (wt. of Hammer 210 gms)",
    result: "NO Flacking of Zinc Coating",
    observation: "OK",
  },
  {
    key: "knife_test",
    specification: "IS 2629",
    test: "Knife Test (Sharp edge)",
    result: "NO Peeling of Zinc Coating",
    observation: "OK",
  },
  {
    key: "mass_test",
    specification: "IS 4759 / IS 6745",
    test: "Mass of Zinc Coating Test",
    result: "",
    observation: "As per below mention",
  },
  {
    key: "preece_test",
    specification: "IS 2633",
    test: "Preece Test (Copper Sulphate)",
    result: "NO Copper effect",
    observation: "NA",
  },
];

const createInitialForm = () => ({
  planning_id: "",
  structure: "",
  quantity: "As per challan",
  inspection_date: new Date().toLocaleDateString("en-CA"),
  reference_standard: REFERENCE_STANDARD,
  needed_coating: "",
  remarks: "The average coating found within limit, so found satisfactory.",
});

function getLoggedUser() {
  const keys = ["iv_user", "user", "auth"];

  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");

      if (value?.user) {
        return value.user;
      }

      if (value?.role) {
        return value;
      }
    } catch {
      // Try the next storage key.
    }
  }

  return {};
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}

function getProductionRows(response) {
  const rows = response?.data?.table_data || response?.data || [];

  return Array.isArray(rows) ? rows : [];
}

function prepareReadings(response, neededCoating = "") {
  const threshold = neededCoating === "" ? null : Number(neededCoating);
  return getProductionRows(response)
    .filter((row) =>
      [row.c1, row.c2, row.c3, row.c4, row.c5].some(
        (value) => value !== null && value !== undefined && value !== "",
      ),
    )
    .filter((row) => threshold == null || Number(row.avg_coating ?? calculateAverage(row)) >= threshold)
    .slice(0, threshold == null ? MAX_READINGS : 5);
}

function calculateAverage(row) {
  const readings = [row.c1, row.c2, row.c3, row.c4, row.c5]
    .map(Number)
    .filter(Number.isFinite);

  if (!readings.length) {
    return null;
  }

  return readings.reduce((total, value) => total + value, 0) / readings.length;
}

function Message({ value, onClose }) {
  if (!value) {
    return null;
  }

  const Icon = value.type === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`certificate-message ${value.type}`}>
      <Icon size={18} />

      <span>{value.text}</span>

      <button type="button" aria-label="Close message" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

function ReadingsTable({ rows, printMode = false }) {
  return (
    <div className="certificate-table-scroll">
      <table
        className={
          printMode ? "certificate-print-readings" : "certificate-readings"
        }
      >
        <thead>
          <tr>
            <th>Sr.</th>
            <th>C1</th>
            <th>C2</th>
            <th>C3</th>
            <th>C4</th>
            <th>C5</th>
            <th>Avg. Micron</th>
            <th>Avg. gm/m²</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => {
            const average = calculateAverage(row);

            return (
              <tr key={row.id || `${index}-${row.sr_no || ""}`}>
                <td>{index + 1}</td>

                <td>{formatNumber(row.c1)}</td>

                <td>{formatNumber(row.c2)}</td>

                <td>{formatNumber(row.c3)}</td>

                <td>{formatNumber(row.c4)}</td>

                <td>{formatNumber(row.c5)}</td>

                <td>{average === null ? "-" : Math.round(average)}</td>

                <td>
                  {average === null ? "-" : Math.round(average * ZINC_DENSITY)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CertificateDocument({ certificate, readings }) {
  const checklist = CHECKLIST_DEFAULTS.map((item) => ({
    ...item,

    result: certificate?.[`${item.key}_result`] || "-",

    observation: certificate?.[`${item.key}_observation`] || "-",
  }));

  const information = [
    ["TC No.", certificate?.tc_no],
    ["Date of Inspection", formatDate(certificate?.inspection_date)],
    ["Supplier", "IV SQUARE STRUCTURE INDIA PVT LTD"],
    ["Client Name", certificate?.party_name],
    ["Third Party Name", certificate?.third_party_name || "-"],
    ["Structure", certificate?.structure],
    ["Invoice / Challan No.", certificate?.challan_no],
    ["Quantity", certificate?.quantity],
    ["Reference Standard", certificate?.reference_standard],
  ];

  return (
    <article className="certificate-document" id="printable-certificate">
      <header className="certificate-letterhead">
        <div>
          <h1>IV SQUARE STRUCTURE INDIA PVT LTD</h1>

          <p>PLANT-4, PLOT NO. 2526, NEAR MASCUT POLYMER, NEAR RADHE FORGE,</p>

          <p>VERAVAL-SHAPAR RAJKOT - 360024 (Guj) INDIA.</p>
        </div>

        <div className="certificate-logo">IV</div>
      </header>

      <div className="certificate-accent" />

      <h2>GALVANIZING COATING TEST CERTIFICATE</h2>

      <table className="certificate-info-table">
        <tbody>
          {information.map(([label, value]) => (
            <tr key={label}>
              <th>{label}</th>

              <td>
                :&nbsp;&nbsp;
                {value || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="certificate-checklist-print">
        <thead>
          <tr>
            <th>Sr.</th>
            <th>Specification</th>
            <th>Test</th>
            <th>Test Result</th>
            <th>Observation</th>
          </tr>
        </thead>

        <tbody>
          {checklist.map((item, index) => (
            <tr key={item.key}>
              <td>{index + 1}</td>

              <td>{item.specification}</td>

              <td>{item.test}</td>

              <td>{item.result}</td>

              <td>{item.observation}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>COATING THICKNESS READINGS</h3>

      {readings.length ? (
        <ReadingsTable rows={readings} printMode />
      ) : (
        <p className="certificate-no-readings">
          No coating readings are available for this challan.
        </p>
      )}

      <div className="certificate-remarks">
        <strong>Remarks:</strong> {certificate?.remarks || "-"}
      </div>

      <footer>
        <div>
          <span>Prepared By</span>

          <strong>{certificate?.created_by_name || "Authorized Person"}</strong>
        </div>

        <div>
          <span>For IV Square Structure India Pvt Ltd</span>

          <strong>Authorized Signatory</strong>
        </div>
      </footer>
    </article>
  );
}

export default function CertificateScreen() {
  const user = useMemo(() => getLoggedUser(), []);

  const canCreate = ["superadmin", "admin"].includes(user?.role);

  const [certificates, setCertificates] = useState([]);

  const [planning, setPlanning] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [message, setMessage] = useState(null);

  const [formOpen, setFormOpen] = useState(false);

  const [form, setForm] = useState(createInitialForm);

  const [checklist, setChecklist] = useState(CHECKLIST_DEFAULTS);

  const [readings, setReadings] = useState([]);
  const [availableReadings, setAvailableReadings] = useState([]);

  const [loadingReadings, setLoadingReadings] = useState(false);

  const [saving, setSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);

  const [selectedCertificate, setSelectedCertificate] = useState(null);

  const [previewReadings, setPreviewReadings] = useState([]);

  const showMessage = useCallback((type, text) => {
    setMessage({
      type,
      text,
    });

    window.setTimeout(() => {
      setMessage((current) => (current?.text === text ? null : current));
    }, 4500);
  }, []);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const [certificateResponse, planningResponse] = await Promise.all([
          getCertificatesApi(),
          getCertificatePlanningApi(),
        ]);

        setCertificates(
          Array.isArray(certificateResponse?.data)
            ? certificateResponse.data
            : [],
        );

        setPlanning(
          Array.isArray(planningResponse?.data) ? planningResponse.data : [],
        );
      } catch (error) {
        showMessage(
          "error",
          getErrorMessage(error, "Unable to load certificates."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showMessage],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const refreshScreen = () =>
      loadData({
        silent: true,
      });

    socket.on("production_planning_updated", refreshScreen);

    socket.on("production_updated", refreshScreen);

    return () => {
      socket.off("production_planning_updated", refreshScreen);

      socket.off("production_updated", refreshScreen);
    };
  }, [loadData]);

  const filteredCertificates = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return certificates;
    }

    return certificates.filter((item) =>
      [
        item.tc_no,
        item.challan_no,
        item.party_name,
        item.third_party_name,
        item.structure,
        item.created_by_name,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [certificates, search]);

  const selectedPlanning = useMemo(
    () => planning.find((item) => String(item.id) === String(form.planning_id)),
    [planning, form.planning_id],
  );

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  useEffect(() => {
    setReadings(prepareReadings({ data: availableReadings }, form.needed_coating));
  }, [availableReadings, form.needed_coating]);

  const selectPlanning = async (planningId) => {
    const selected = planning.find(
      (item) => String(item.id) === String(planningId),
    );

    setForm((current) => ({
      ...current,

      planning_id: planningId,

      structure: selected?.material_description || current.structure,
    }));

    setReadings([]);

    if (!selected?.challan_no) {
      return;
    }

    setLoadingReadings(true);

    try {
      const response = await getProductionsByChallanApi(selected.challan_no);

      setAvailableReadings(getProductionRows(response));
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(error, "Unable to load coating readings."),
      );
    } finally {
      setLoadingReadings(false);
    }
  };

  const updateChecklist = (key, field, value) => {
    setChecklist((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const openCreate = () => {
    setForm(createInitialForm());
    setChecklist(CHECKLIST_DEFAULTS);
    setReadings([]);
    setAvailableReadings([]);
    setFormOpen(true);
  };

  const openPreview = async (certificateOrId) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewReadings([]);

    try {
      const id = certificateOrId?.id || certificateOrId;

      const detailResponse = await getCertificateByIdApi(id);

      const certificate = detailResponse?.data || certificateOrId;

      setSelectedCertificate(certificate);

      if (certificate?.challan_no) {
        const saved = typeof certificate.coating_readings_json === "string"
          ? JSON.parse(certificate.coating_readings_json || "[]")
          : certificate.coating_readings_json;
        if (Array.isArray(saved) && saved.length) setPreviewReadings(saved);
        else {
          const response = await getProductionsByChallanApi(certificate.challan_no);
          setPreviewReadings(prepareReadings(response, certificate.needed_coating ?? ""));
        }
      }
    } catch (error) {
      setPreviewOpen(false);

      showMessage(
        "error",
        getErrorMessage(error, "Unable to open certificate."),
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const submitCertificate = async (event) => {
    event.preventDefault();

    if (!form.planning_id) {
      showMessage("error", "Please select a challan number.");

      return;
    }

    if (!form.structure.trim()) {
      showMessage("error", "Please enter or select the structure.");

      return;
    }

    if (!form.inspection_date || !form.reference_standard.trim()) {
      showMessage(
        "error",
        "Inspection date and reference standard are required.",
      );

      return;
    }

    if (!readings.length) {
      showMessage("error", "No coating readings were found for this challan.");

      return;
    }

    setSaving(true);

    try {
      const checklistPayload = checklist.reduce((result, item) => {
        result[`${item.key}_result`] = item.result.trim();

        result[`${item.key}_observation`] = item.observation.trim();

        return result;
      }, {});

      const response = await createCertificateApi({
        ...form,

        planning_id: Number(form.planning_id),
        coating_readings: readings,

        ...checklistPayload,
      });

      const createdCertificate = {
        ...form,
        ...checklistPayload,

        id: response?.data?.id,

        tc_no: response?.data?.tc_no,

        challan_no: selectedPlanning?.challan_no,

        party_name: selectedPlanning?.party_name,

        third_party_name: selectedPlanning?.third_party_name,

        created_by_name: user?.name,
      };

      setFormOpen(false);

      setSelectedCertificate(createdCertificate);

      setPreviewReadings(readings);
      setPreviewOpen(true);

      showMessage("success", "Certificate generated successfully.");

      await loadData({
        silent: true,
      });
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(error, "Unable to generate certificate."),
      );
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);

    await loadData();

    showMessage("success", "Certificate register refreshed.");
  };

  return (
    <div className="certificate-screen">
      <div className="certificate-toolbar">
        <div>
          <span className="certificate-overline">QUALITY DOCUMENTS</span>

          <h2>Coating test certificates</h2>

          <p>
            Generate, review and print galvanizing coating test certificates.
          </p>
        </div>

        <div className="certificate-toolbar-actions">
          <button
            className="certificate-secondary-button"
            type="button"
            disabled={refreshing}
            onClick={refresh}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "certificate-spinning" : ""}
            />
            Refresh
          </button>

          {canCreate ? (
            <button
              className="certificate-primary-button"
              type="button"
              onClick={openCreate}
            >
              <Plus size={16} />
              Generate Certificate
            </button>
          ) : null}
        </div>
      </div>

      <Message value={message} onClose={() => setMessage(null)} />

      <section className="certificate-register-card">
        <header>
          <div>
            <span>CERTIFICATE REGISTER</span>

            <h3>Generated certificates</h3>
          </div>

          <label className="certificate-search">
            <Search size={16} />

            <input
              type="search"
              value={search}
              placeholder="Search TC, challan, party or structure..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </header>

        {loading ? (
          <div className="certificate-state">
            <RefreshCw className="certificate-spinning" size={28} />

            <strong>Loading certificates...</strong>
          </div>
        ) : filteredCertificates.length ? (
          <div className="certificate-table-scroll">
            <table className="certificate-register-table">
              <thead>
                <tr>
                  <th>TC Number</th>
                  <th>Inspection Date</th>
                  <th>Challan No.</th>
                  <th>Client / Party</th>
                  <th>Structure</th>
                  <th>Third Party</th>
                  <th>Prepared By</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCertificates.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.tc_no}</strong>
                    </td>

                    <td>{formatDate(item.inspection_date)}</td>

                    <td>{item.challan_no || "-"}</td>

                    <td>{item.party_name || "-"}</td>

                    <td>{item.structure || "-"}</td>

                    <td>{item.third_party_name || "-"}</td>

                    <td>{item.created_by_name || "-"}</td>

                    <td>{formatDateTime(item.created_at)}</td>

                    <td>
                      <button
                        className="certificate-view-button"
                        type="button"
                        onClick={() => openPreview(item)}
                      >
                        <Eye size={14} />
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="certificate-state">
            <FileText size={32} />

            <strong>No certificates found</strong>

            <span>
              {search
                ? "Try another search."
                : "Generated certificates will appear here."}
            </span>
          </div>
        )}
      </section>

      {formOpen ? (
        <div className="certificate-modal-backdrop">
          <div
            className="certificate-form-modal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>NEW QUALITY DOCUMENT</span>

                <h3>Generate coating certificate</h3>

                <p>The TC number is assigned automatically.</p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setFormOpen(false)}
              >
                <X size={19} />
              </button>
            </header>

            <form onSubmit={submitCertificate}>
              <div className="certificate-form-body">
                <section className="certificate-form-section">
                  <div className="certificate-section-title">
                    <span>1</span>

                    <div>
                      <strong>Challan and certificate details</strong>

                      <small>
                        Select the production plan used for this TC.
                      </small>
                    </div>
                  </div>

                  <div className="certificate-form-grid">
                    <label className="certificate-field certificate-wide">
                      <span>Challan No. *</span>

                      <select
                        value={form.planning_id}
                        onChange={(event) => selectPlanning(event.target.value)}
                      >
                        <option value="">Select challan from planning</option>

                        {planning.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.challan_no} — {item.party_name} [{item.status}
                            ]
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="certificate-field">
                      <span>Inspection Date *</span>

                      <input
                        type="date"
                        value={form.inspection_date}
                        onChange={(event) =>
                          updateForm("inspection_date", event.target.value)
                        }
                      />
                    </label>

                    <label className="certificate-field">
                      <span>Quantity</span>

                      <input
                        value={form.quantity}
                        onChange={(event) =>
                          updateForm("quantity", event.target.value)
                        }
                      />
                    </label>

                    <label className="certificate-field certificate-wide">
                      <span>Structure *</span>

                      <input
                        list="certificate-structures"
                        value={form.structure}
                        placeholder="Select or enter structure"
                        onChange={(event) =>
                          updateForm("structure", event.target.value)
                        }
                      />

                      <datalist id="certificate-structures">
                        {STRUCTURES.map((item) => (
                          <option key={item} value={item} />
                        ))}
                      </datalist>
                    </label>

                    <label className="certificate-field certificate-wide">
                      <span>Reference Standard *</span>

                      <input
                        value={form.reference_standard}
                        onChange={(event) =>
                          updateForm("reference_standard", event.target.value)
                        }
                      />
                    </label>

                    <label className="certificate-field">
                      <span>Needed Coating (µm)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.needed_coating}
                        placeholder="Empty = first 10 entries"
                        onChange={(event) => updateForm("needed_coating", event.target.value)}
                      />
                    </label>
                  </div>

                  {selectedPlanning ? (
                    <div className="certificate-planning-info">
                      <div>
                        <span>Client / Party</span>

                        <strong>{selectedPlanning.party_name || "-"}</strong>
                      </div>

                      <div>
                        <span>Material</span>

                        <strong>
                          {selectedPlanning.material_description || "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Third Party</span>

                        <strong>
                          {selectedPlanning.third_party_name || "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Produced</span>

                        <strong>
                          {selectedPlanning.completed_qty || 0} /{" "}
                          {selectedPlanning.planned_qty || 0} Nos
                        </strong>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="certificate-form-section">
                  <div className="certificate-section-title">
                    <span>2</span>

                    <div>
                      <strong>Production coating readings</strong>

                      <small>
                        {form.needed_coating ? `Up to 5 rows with average coating ${form.needed_coating}+ µm are included.` : "Maximum 10 measured production rows are included."}
                      </small>
                    </div>
                  </div>

                  {loadingReadings ? (
                    <div className="certificate-inline-state">
                      <RefreshCw className="certificate-spinning" size={19} />
                      Loading readings...
                    </div>
                  ) : readings.length ? (
                    <ReadingsTable rows={readings} />
                  ) : (
                    <div className="certificate-inline-state">
                      Select a challan to load coating readings.
                    </div>
                  )}
                </section>

                <section className="certificate-form-section">
                  <div className="certificate-section-title">
                    <span>3</span>

                    <div>
                      <strong>QC checklist</strong>

                      <small>Confirm test results before generating.</small>
                    </div>
                  </div>

                  <div className="certificate-checklist-editor">
                    {checklist.map((item, index) => (
                      <article key={item.key}>
                        <div className="certificate-test-name">
                          <span>{index + 1}</span>

                          <div>
                            <strong>{item.test}</strong>

                            <small>{item.specification}</small>
                          </div>
                        </div>

                        <label className="certificate-field">
                          <span>Test Result</span>

                          <textarea
                            rows="2"
                            value={item.result}
                            onChange={(event) =>
                              updateChecklist(
                                item.key,
                                "result",
                                event.target.value,
                              )
                            }
                          />
                        </label>

                        <label className="certificate-field">
                          <span>Observation</span>

                          <textarea
                            rows="2"
                            value={item.observation}
                            onChange={(event) =>
                              updateChecklist(
                                item.key,
                                "observation",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="certificate-form-section">
                  <div className="certificate-section-title">
                    <span>4</span>

                    <div>
                      <strong>Final remarks</strong>

                      <small>Printed on the certificate.</small>
                    </div>
                  </div>

                  <label className="certificate-field">
                    <textarea
                      rows="3"
                      value={form.remarks}
                      onChange={(event) =>
                        updateForm("remarks", event.target.value)
                      }
                    />
                  </label>
                </section>
              </div>

              <footer className="certificate-form-footer">
                <button type="button" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>

                <button type="submit" disabled={saving}>
                  {saving ? (
                    <RefreshCw className="certificate-spinning" size={16} />
                  ) : (
                    <FileCheck2 size={16} />
                  )}
                  Generate Certificate
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="certificate-modal-backdrop certificate-preview-backdrop">
          <div className="certificate-preview-modal">
            <header className="certificate-preview-toolbar">
              <div>
                <span>CERTIFICATE PREVIEW</span>

                <strong>{selectedCertificate?.tc_no || "Loading..."}</strong>
              </div>

              <div>
                <button
                  type="button"
                  disabled={previewLoading}
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  Print / Save PDF
                </button>

                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="certificate-preview-canvas">
              {previewLoading ? (
                <div className="certificate-state">
                  <RefreshCw className="certificate-spinning" size={28} />

                  <strong>Preparing certificate...</strong>
                </div>
              ) : (
                <CertificateDocument
                  certificate={selectedCertificate}
                  readings={previewReadings}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
