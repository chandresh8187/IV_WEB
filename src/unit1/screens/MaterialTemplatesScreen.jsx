import { punchFaceOptions, sectionDimensionsHint, selectTemplateSection, templateSectionProfile } from '../utils/sectionPunchFaces';
import { Box, Eye, Pencil, Printer, Trash2 } from "lucide-react";
import PlanningIconButton from "../components/PlanningIconButton";
import AllowedCoilSizes from '../components/AllowedCoilSizes';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import {
  getMaterialTemplates,
  saveMaterialTemplate,
  deleteMaterialTemplate,
  materialTemplatePdf,
} from "../api/planningApi";
import {
  templateFields,
  templateForm,
  templatePayload,
  blankPunch,
} from "../utils/planningForms";
import { jobCardChangeKeys } from "../utils/jobCardChangeKeys";
import { hasAccess } from "../utils/access";
import PlanningDialog from "../components/PlanningDialog";
import { JobCardDetails } from "./JobCardsScreen";
import TemplatePreview from "../components/MaterialPreview";
import { buildMaterialSpec, templateViewerForm, VIEWER_PROFILES } from "../data/materialViewerModel";
import { groupPunchRequirements } from "../utils/punchRequirements";
import "./ProductionPlanningScreen.css";
const message = (e) => e?.response?.data?.error || e?.message;
export default function MaterialTemplatesScreen() {
  const user = useSelector((s) => s.auth.user),
    manage = hasAccess(user, "unit1.jobcards.manage"),
    client = useQueryClient(),
    navigate = useNavigate();
  const data = useQuery({
    queryKey: ["unit1-material-templates"],
    queryFn: getMaterialTemplates,
    refetchInterval: 30000,
  });
  const [form, setForm] = useState(null),
    [selectedId, setSelectedId] = useState(null),
    [preview, setPreview] = useState(null),
    [q, setQ] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const canPreview = user?.role !== 'labour' && hasAccess(user, 'unit1.production.view');
  const sectionProfile = form ? templateSectionProfile(form) : '';
  const selectedProfile = VIEWER_PROFILES.find(profile => profile.key === sectionProfile);
  const selectedTemplate = data.data?.find(template => template.id === selectedId);
  const previewDraft = () => {
    setError("");
    try {
      const template = templatePayload({ ...form, sectionProfile });
      setPreview(buildMaterialSpec(templateViewerForm(template, groupPunchRequirements(template))));
    } catch (e) {
      setError(message(e));
    }
  };
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const punch = (index, key, value) =>
    setForm((f) => ({
      ...f,
      punchRows: f.punchRows.map((r, i) =>
        i === index ? { ...r, [key]: value } : r
      ),
    }));
  const save = async (e) => {
    e.preventDefault();
    if (preview) return;
    setBusy(true);
    setError("");
    try {
      await saveMaterialTemplate(templatePayload({ ...form, sectionProfile }));
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
  const print = async (r) => {
    setBusy(true);
    try {
      const blob = await materialTemplatePdf(r.id);
      navigate("/production/reports/preview", {
        state: {
          blob,
          filename: `material-job-card-${r.id}.pdf`,
          reportTitle: "Material Job Card",
          printable: true,
          returnTo: "/production/job-cards",
        },
      });
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
      await deleteMaterialTemplate(row);
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
        "Delete this Job Card template from the current list? Existing production, inspection and stock history will be kept."
      )
    )
      remove(row);
  };
  return (
    <section className="planning-page">
      <div className="page-heading">
        <div>
          <h1>Job Card templates</h1>
          <p>
            Reusable material specifications. Party, project and quantities
            belong to Production Planning.
          </p>
        </div>
        {manage && (
          <button
            className="primary-button"
            onClick={() => {
              setError("");
              setForm(templateForm());
            }}
          >
            Add Job Card template
          </button>
        )}
      </div>
      <label className="planning-search">
        Search material templates
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {(error || data.error) && (
        <p role="alert" className="notice error">
          {error || message(data.error)}
        </p>
      )}
      {data.isPending && <p>Loading templates…</p>}
      <div className="planning-table">
        <table>
          <thead>
            <tr>
              {[
                "Job Card",
                "Template",
                "Material / section",
                "Cut length",
                "Reference coil size",
                "Actions",
              ].map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.data || [])
              .filter((r) =>
                JSON.stringify([r.id, r.name, r.memberName, r.sectionSize])
                  .toLowerCase()
                  .includes(q.toLowerCase())
              )
              .map((r) => (
                <tr key={r.id}>
                  <td>U1-JC-{r.id}</td>
                  <td>{r.name}</td>
                  <td>
                    {r.materialType} · {r.memberName}
                    <br />
                    {r.sectionSize}
                  </td>
                  <td>{r.cutLengthMm} mm</td>
                  <td>
                    {r.coilWidthMm} × {r.coilThicknessMm} mm
                  </td>
                  <td>
                    <div className="planning-actions">
                      <PlanningIconButton
                        label="View Job Card"
                        Icon={Eye}
                        onClick={() => setSelectedId(r.id)}
                      />
                      {manage && (
                        <>
                          <PlanningIconButton
                            label="Edit template"
                            Icon={Pencil}
                            disabled={busy}
                            onClick={() => {
                              setError("");
                              setForm(templateForm(r));
                            }}
                          />
                          <PlanningIconButton
                            label="Delete template"
                            Icon={Trash2}
                            danger
                            disabled={busy}
                            onClick={() => confirmDelete(r)}
                          />
                        </>
                      )}
                      {r.holes?.some(hole => hole.centerOffsetMm != null) && user?.role !== 'labour' && hasAccess(user, 'unit1.production.view') && (
                        <PlanningIconButton
                          label="View job card in 3D"
                          Icon={Box}
                          onClick={() => navigate('/production/material-viewer', { state: { template: r } })}
                        />
                      )}
                      <PlanningIconButton
                        label="Print Job Card"
                        Icon={Printer}
                        disabled={busy}
                        onClick={() => print(r)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {selectedTemplate && (
        <JobCardDetails
          key={selectedId}
          job={{ ...selectedTemplate, isTemplate: true }}
          allowPreview={canPreview}
          onClose={() => setSelectedId(null)}
        />
      )}
      {form && (
        <PlanningDialog
          title={form.id ? "Edit material template" : "Add material template"}
          busy={busy}
          onClose={() => { setPreview(null); setForm(null); }}
          onSave={save}
          showSave={!preview}
          beforeSave={preview && (
            <button className="outline-button" type="button" onClick={() => setPreview(null)}>
              Back to details
            </button>
          )}
        >
          {canPreview && <div className="job-template-tabs" role="group" aria-label="Job card form views">
            <button type="button" className="outline-button" aria-pressed={!preview} onClick={() => setPreview(null)}>Details</button>
            <button type="button" className="outline-button" aria-pressed={!!preview} onClick={previewDraft}>3D Preview</button>
          </div>}
          {preview && <TemplatePreview spec={preview} />}
          <div hidden={!!preview}>
          <div className="planning-fields">
            <label>
              Section profile
              <select required value={sectionProfile} onChange={event => setForm(current => selectTemplateSection(current, event.target.value))}>
                <option value="" disabled>Choose a section profile</option>
                {VIEWER_PROFILES.map(profile => <option key={profile.key} value={profile.key}>{profile.label}</option>)}
              </select>
            </label>
            {templateFields.map(([key, label]) => (
              <label key={key}>
                {key === 'sectionSize' ? `${sectionDimensionsHint(form)} (mm)` : label}
                {key === "materialType" ? (
                  <select
                    required
                    value={form[key] || ""}
                    onChange={(e) => change(key, e.target.value)}
                  >
                    <option value="">Select</option>
                    {(["MS", "GL", "GP", "Posmac"].map((value) => ({
                          value,
                          label: value,
                        }))
                    ).map((o) => (
                      <option value={o.value} key={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={key !== "name"}
                    type={key.endsWith("Mm") ? "number" : "text"}
                    min={key.endsWith("Mm") ? "0.001" : undefined}
                    step={key.endsWith("Mm") ? "0.001" : undefined}
                    placeholder={key === 'sectionSize' ? selectedProfile?.example : undefined}
                    value={form[key] || ""}
                    onChange={(e) => change(key, e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                )}
              </label>
            ))}
          </div>
          <AllowedCoilSizes value={form.allowedCoilSizes} disabled={busy} onChange={value=>change('allowedCoilSizes',value)}/>
          <h3>{form.structureType === 'w_beam_crash_barrier' ? 'W-beam hole centres from end 0 (mm)' : 'Punch positions from starting end (mm)'}</h3>
          {form.structureType === 'w_beam_crash_barrier' && <p>Use the same end as 0 for every hole. Enter absolute centre distances, for example 100-200-400. These are not gaps between holes.</p>}
          {form.punchRows.map((r, i) => (
            <fieldset key={i} className="planning-material">
              <legend>Hole requirement {i+1}</legend>
              <div className="planning-fields">
                <label>
                  Punch size
                  <input
                    required
                    value={r.punchSize}
                    onChange={(e) => punch(i, "punchSize", e.target.value)}
                  />
                </label>
                <label>
                  Punch face
                  <select
                    required
                    disabled={!sectionProfile}
                    value={punchFaceOptions(sectionProfile, r.profile, { includeCombined: true }).some(option => option.value === r.profile) ? r.profile : ''}
                    onChange={event => punch(i, 'profile', event.target.value)}
                  >
                    <option value="" disabled>{sectionProfile ? 'Choose a punch face' : 'Choose a section profile first'}</option>
                    {punchFaceOptions(sectionProfile, r.profile, { includeCombined: true }).map(({ value, label }) =>
                      <option value={value} key={value}>{label.toUpperCase()}</option>
                    )}
                  </select>
                </label>
                <label>
                  Positions (mm), separated by hyphens
                  <input
                    required
                    value={r.dimensions}
                    onChange={(e) => punch(i, "dimensions", e.target.value)}
                  />
                </label>
                {form.structureType !== 'w_beam_crash_barrier' && r.profile === 'web' && (
                  <label>
                    Centre offset (mm)
                    <input
                      placeholder="0, -20 or +20"
                      value={r.centerOffsetMm ?? ''}
                      onChange={event => punch(i, 'centerOffsetMm', event.target.value)}
                    />
                  </label>
                )}
              </div>
              {form.punchRows.length > 1 && (
                <PlanningIconButton
                  label="Remove punch row"
                  Icon={Trash2}
                  danger
                  disabled={busy}
                  onClick={() =>
                    change(
                      "punchRows",
                      form.punchRows.filter((_, n) => n !== i)
                    )
                  }
                />
              )}
            </fieldset>
          ))}
          <button
            className="outline-button"
            type="button"
            onClick={() =>
              change("punchRows", [...form.punchRows, blankPunch(sectionProfile)])
            }
          >
            Add punch row
          </button>
          {form.id && (
            <p>
              Changes correct linked planning, reports and stock. Affected
              active production requires fresh inspection.
            </p>
          )}
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          </div>
        </PlanningDialog>
      )}
    </section>
  );
}

