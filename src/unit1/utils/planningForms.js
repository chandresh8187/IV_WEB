import { punchFaceOptions } from './sectionPunchFaces.js';
import { isBeamPunchProfile } from './beamPunchProfiles.js';
import {punchNameFor} from './punchNames.js';
import { parsePunchRequirements } from "./punchRequirements.js";
export const templateFields = [
  ["name", "Template name"],
  ["memberName", "Structure Type"],
  ["sectionSize", "Section (web x flange x lip)"],
  ["cutLengthMm", "Cut length (mm)"],
  ["materialType", "Coil material"],
];
export const products = [
  { value: "w_beam_crash_barrier", label: "W beam crash barrier" },
  { value: "solar_mounting_structure", label: "Solar mounting structure" },
  { value: "gl_hat_purlin", label: "GL Hat Purlin" },
  { value: "purlin_c_lip", label: "Purlin C Lip" },
];
export const blankPunch = sectionProfile => ({
  punchName: null,
  punchSize: "",
  profile: punchFaceOptions(sectionProfile)[0]?.value || "web",
  dimensions: "",
});
function combineFlangeRows(rows) {
  const paired = new Set();
  const sizeKey = value => String(value).replace(/\s+/g, '').replace(/[×*X]/g, 'x');
  return rows.flatMap((row, index) => {
    if (paired.has(index)) return [];
    if (row.profile !== 'l_flange') return [row];
    const right = rows.findIndex((other, otherIndex) =>
      otherIndex > index && !paired.has(otherIndex) && other.profile === 'r_flange' &&
      other.punchName === row.punchName && sizeKey(other.punchSize) === sizeKey(row.punchSize) &&
      other.dimensions === row.dimensions && other.centerOffsetMm === row.centerOffsetMm);
    if (right < 0) return [row];
    paired.add(right);
    return [{ ...row, profile: 'lr_flange' }];
  });
}
export function templateForm(row = {}) {
  const groups = new Map();
  for (const h of row.holes || []) {
    const punchName = h.punchName === null ? null : punchNameFor(h,row.holes,row.punchSize);
    const key = JSON.stringify([punchName, h.punchSize, h.profile, h.centerOffsetMm ?? null]);
    if (!groups.has(key))
      groups.set(key, {
        punchName,
        punchSize: h.punchSize,
        profile: h.profile,
        centerOffsetMm: h.centerOffsetMm == null ? "" : String(h.centerOffsetMm),
        positions: [],
      });
    groups.get(key).positions.push(h.targetMm);
  }
  return {
    ...row,
    structureType: row.structureType || "solar_mounting_structure",
    allowedCoilSizes: Array.isArray(row.allowedCoilSizes) ? row.allowedCoilSizes : [{widthMm:row.coilWidthMm || '',thicknessMm:row.coilThicknessMm || ''}],
    punchRows: groups.size
      ? combineFlangeRows([...groups.values()].map((g) => ({
          ...g,
          dimensions: g.positions.join("-"),
        })))
      : [blankPunch(row.sectionProfile || (row.structureType === "w_beam_crash_barrier" ? "w_beam" : ""))],
  };
}
export function templatePayload(form) {
  if (form.sectionProfile && form.punchRows.some(row =>
    !punchFaceOptions(form.sectionProfile, row.profile, { includeCombined: true }).some(option => option.value === row.profile))) {
    throw new Error('Choose a punch face supported by the selected section profile.');
  }
  const rows = !form.sectionProfile && form.structureType === 'w_beam_crash_barrier'
    ? form.punchRows.map(row => ({ ...row, profile: isBeamPunchProfile(row.profile) ? row.profile : 'beam' }))
    : form.punchRows;
  const holes = parsePunchRequirements(rows, form.cutLengthMm);
  return { ...form, structureType:form.structureType||"solar_mounting_structure", ...(form.allowedCoilSizes?.length ? {coilWidthMm:form.allowedCoilSizes[0].widthMm,coilThicknessMm:form.allowedCoilSizes[0].thicknessMm} : {}), holes, punchSize: holes[0]?.punchSize };
}
export const blankLine = () => ({
  templateId: "",
  machineId: "",
  quantity: "",
  selectedCoils: [],
});
export const requestKey = () =>
  `planning_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
export const planForm = (today, row) =>
  row
    ? {
        ...row,
        lines: row.lines.map((l) => ({
          ...l,
          quantity: String(l.quantity),
          selectedCoils: [],
        })),
      }
    : {
        partyName: "",
        projectName: "",
        planDate: today,
        shift: "day",
        requestKey: requestKey(),
        lines: [blankLine()],
      };


