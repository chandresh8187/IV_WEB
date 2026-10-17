import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationSection } from '../src/portal/navigationSection.js';

test('every Unit 1 production, coil and QR route selects Production', () => {
  for (const route of ['/production', '/production/job-cards', '/production/live', '/production/live/12/entries', '/production/history', '/coils', '/coils/inward', '/coils/4/usage', '/coils/4/qr', '/scan/coil/U1-123/1']) assert.equal(navigationSection('unit1', route), '/production', route);
});
test('Unit 1 settings and home remain distinct', () => {
  for (const route of ['/settings', '/settings/materials-grades', '/settings/machines', '/settings/shifts', '/settings/users', '/settings/qr-scan']) assert.equal(navigationSection('unit1', route), '/settings', route);
  assert.equal(navigationSection('unit1', '/'), '/');
});
test('every Unit 2 operation and old production bookmark selects Production', () => {
  for (const name of ['planning', 'history', 'live', 'chat', 'labour-weights', 'contract-production', 'expenses', 'gas', 'gas/movements', 'zinc-stock', 'monthly-reports', 'rate-calculator', 'chemical-tracking', 'certificates', 'plant', 'shift']) assert.equal(navigationSection('unit2', '/production/' + name), '/production', name);
  for (const name of ['planning', 'history', 'contract-production', 'expenses', 'zinc-stock', 'monthly-reports', 'rate-calculator', 'chemical-tracking', 'certificates', 'plant', 'shift']) assert.equal(navigationSection('unit2', '/' + name), '/production', name);
});
test('Unit 2 settings, dashboard and profile select their own section', () => {
  for (const route of ['/settings', '/settings/user-access', '/settings/notification-test', '/settings/control-panel', '/settings/items', '/settings/contractors', '/settings/financial-years', '/users', '/control', '/system/ota-update']) assert.equal(navigationSection('unit2', route), '/settings', route);
  assert.equal(navigationSection('unit2', '/dashboard'), '/dashboard');
  assert.equal(navigationSection('unit2', '/profile'), '/profile');
});
test('unrelated paths do not activate similarly named sections', () => {
  for (const unit of ['unit1', 'unit2']) for (const route of ['/login', '/production-other', '/settings-other', '/coils-other', '/scan/coils']) assert.equal(navigationSection(unit, route), null, unit + route);
});
