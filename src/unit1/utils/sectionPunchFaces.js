import { beamPunchProfiles } from './beamPunchProfiles.js';

export const FACE_LABELS = {
  web: 'Web', l_flange: 'Left flange', r_flange: 'Right flange',
  lr_flange: 'L & R FLANGE',
  l_lip: 'Left lip', r_lip: 'Right lip', lip: 'Lip (legacy)',
  beam: 'From end (0 mm)', ...beamPunchProfiles,
};

export const HAT_FACE_LABELS = {
  web: 'Crown', l_flange: 'Left sloping side', r_flange: 'Right sloping side',
  l_lip: 'Left mounting foot', r_lip: 'Right mounting foot',
};

const channelFaces = ['web', 'l_flange', 'r_flange'];
const lippedFaces = [...channelFaces, 'l_lip', 'r_lip'];
const sectionFaces = {
  flat: ['web'],
  angle: ['web', 'r_flange'],
  channel: channelFaces,
  c_lip: lippedFaces,
  z_lip: lippedFaces,
  gl_hat_purlin: lippedFaces,
  w_beam: Object.keys(beamPunchProfiles),
};

export function templateSectionProfile(template = {}) {
  if (template.structureType === 'w_beam_crash_barrier') return 'w_beam';
  if (template.sectionProfile) return template.sectionProfile;
  if (template.structureType === 'gl_hat_purlin') return 'gl_hat_purlin';
  const size = String(template.sectionSize ?? '').trim();
  if (!size) return '';
  const dimensions = size.split(/[x×*]/i).length;
  return dimensions >= 3 ? 'c_lip' : dimensions === 2 ? 'channel' : 'flat';
}

export function punchFaceLabel(face, sectionProfile) {
  const labels = sectionProfile === 'gl_hat_purlin' ? HAT_FACE_LABELS : FACE_LABELS;
  return labels[face] || FACE_LABELS[face] || face;
}

export function punchFaceOptions(sectionProfile, currentFace, { includeCombined = false } = {}) {
  const keys = Object.hasOwn(sectionFaces, sectionProfile) ? sectionFaces[sectionProfile] : [];
  const combined = includeCombined && keys.includes('l_flange') && keys.includes('r_flange') ? ['lr_flange'] : [];
  const keepLegacy = (currentFace === 'lip' && keys.includes('l_lip')) ||
    (currentFace === 'beam' && sectionProfile === 'w_beam');
  return [...keys, ...combined, ...(keepLegacy ? [currentFace] : [])]
    .map(value => ({ value, label: punchFaceLabel(value, sectionProfile) }));
}

export function selectTemplateSection(form, sectionProfile) {
  const structureType = sectionProfile === 'w_beam' ? 'w_beam_crash_barrier'
    : sectionProfile === 'gl_hat_purlin' ? 'gl_hat_purlin'
      : ['w_beam_crash_barrier', 'gl_hat_purlin'].includes(form.structureType)
        ? 'solar_mounting_structure' : form.structureType;
  const options = punchFaceOptions(sectionProfile);
  return {
    ...form,
    structureType,
    sectionProfile,
    punchRows: form.punchRows.map(row => {
      if (punchFaceOptions(sectionProfile, row.profile, { includeCombined: true }).some(face => face.value === row.profile)) return row;
      return { ...row, profile: row.punchSize || row.dimensions ? '' : options[0]?.value || '' };
    }),
  };
}

export function sectionDimensionsHint(template, { forInspection = false } = {}) {
  const profile = templateSectionProfile(template);
  if (profile === 'gl_hat_purlin' && forInspection &&
      String(template.sectionSize ?? '').split(/[x×*]/i).length === 3) {
    return 'Crown width × depth × foot width';
  }
  const hints = {
    w_beam: 'Finished width × depth',
    gl_hat_purlin: 'Crown width × depth × foot width × return lip',
    c_lip: 'Web × flange × lip',
    z_lip: 'Web × flange × lip',
    channel: 'Web × flange',
    angle: 'Web × flange',
    flat: 'Strip width',
  };
  return hints[profile] || 'Dimensions in job card order';
}
