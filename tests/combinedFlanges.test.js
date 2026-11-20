import test from 'node:test';
import assert from 'node:assert/strict';
import { templateForm, templatePayload } from '../src/unit1/utils/planningForms.js';
import { punchFaceOptions, selectTemplateSection } from '../src/unit1/utils/sectionPunchFaces.js';
import { buildMaterialSpec, templateViewerForm } from '../src/unit1/data/materialViewerModel.js';
import { groupPunchRequirements } from '../src/unit1/utils/punchRequirements.js';

const form = () => ({
  structureType: 'solar_mounting_structure', sectionProfile: 'c_lip',
  sectionSize: '150x65x20', cutLengthMm: 1000, allowedCoilSizes: [{ widthMm: 298, thicknessMm: 3 }],
  punchRows: [{ punchName: null, profile: 'lr_flange', punchSize: '12x20', dimensions: '100-500' }],
});

test('one combined flange entry creates matching physical holes and reopens as one editable row', () => {
  const template = templatePayload(form());
  assert.deepEqual(template.holes.map(hole => [hole.profile, hole.targetMm]), [
    ['l_flange', 100], ['l_flange', 500], ['r_flange', 100], ['r_flange', 500],
  ]);
  const editing = templateForm(template);
  assert.equal(editing.punchRows.length, 1);
  assert.equal(editing.punchRows[0].profile, 'lr_flange');
  assert.deepEqual(templatePayload(editing).holes, template.holes);
  const spec = buildMaterialSpec(templateViewerForm(template, groupPunchRequirements(template)));
  assert.deepEqual(spec.holes.map(hole => hole.face), ['l_flange', 'l_flange', 'r_flange', 'r_flange']);
  const different = templateForm({ ...template, holes: template.holes.map((hole, index) => index === 3 ? { ...hole, targetMm: 600 } : hole) });
  assert.equal(different.punchRows.length, 2);
});

test('combined flange selection follows the section profile and counts both sides toward hole limits', () => {
  for (const profile of ['c_lip', 'z_lip', 'channel', 'gl_hat_purlin']) {
    assert.ok(punchFaceOptions(profile, null, { includeCombined: true }).some(option => option.value === 'lr_flange'));
  }
  for (const sectionProfile of ['flat', 'angle', 'w_beam']) {
    assert.ok(!punchFaceOptions(sectionProfile, null, { includeCombined: true }).some(option => option.value === 'lr_flange'));
    assert.throws(() => templatePayload({ ...form(), sectionProfile }), /supported/);
  }
  assert.equal(selectTemplateSection(form(), 'z_lip').punchRows[0].profile, 'lr_flange');
  assert.equal(selectTemplateSection(form(), 'angle').punchRows[0].profile, '');
  assert.throws(() => templatePayload({ ...form(), punchRows: [{ ...form().punchRows[0], dimensions: Array(51).fill('100').join('-') }] }), /100 hole/);
});
