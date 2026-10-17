import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceUnit, loginDestination, signInToUnit } from '../src/portal/unitSession.js';
const storage = () => { const values = new Map([['token', 'existing-unit2'], ['ivs1_session', 'existing-unit1']]); return { values, setItem: (key, value) => values.set(key, value) }; };

test('workspace routing matches only complete unit prefixes', () => {
  assert.equal(workspaceUnit('/unit1/production/live'), 'unit1');
  assert.equal(workspaceUnit('/unit2'), 'unit2');
  for (const value of ['/', '/login', '/unit12', '/production']) assert.equal(workspaceUnit(value), null);
});
test('Unit 1 signs into its own endpoint and preserves Unit 2 session', async () => {
  const store = storage();
  const request = async (endpoint, credentials) => {
    assert.equal(endpoint, '/unit1/auth/login');
    assert.deepEqual(credentials, { email: 'dev@iv.com', password: 'secret' });
    return { data: { token: 'unit1-token', user: { id: 1, scope: 'unit1' } } };
  };
  await signInToUnit({ unit: 'unit1', email: ' DEV@IV.COM ', password: 'secret', request, storage: store });
  assert.equal(store.values.get('token'), 'existing-unit2');
  assert.equal(JSON.parse(store.values.get('ivs1_session')).token, 'unit1-token');
});
test('Unit 2 signs into its own endpoint and preserves Unit 1 session', async () => {
  const store = storage();
  await signInToUnit({ unit: 'unit2', email: 'dev@iv.com', password: 'secret', storage: store, request: async endpoint => {
    assert.equal(endpoint, '/auth/login');
    return { data: { token: 'unit2-token', user: { id: 1, role: 'superadmin' } } };
  } });
  assert.equal(store.values.get('ivs1_session'), 'existing-unit1');
  assert.equal(store.values.get('token'), 'unit2-token');
});
test('missing unit, invalid session, rejected credentials never replace sessions', async () => {
  const store = storage();
  const base = { email: 'a@b.com', password: 'wrong', storage: store };
  await assert.rejects(signInToUnit({ ...base, unit: '', request: () => { throw Error('should not request'); } }), /Select/);
  await assert.rejects(signInToUnit({ ...base, unit: 'unit2', request: async () => ({ data: { token: 'wrong', user: { scope: 'unit1' } } }) }), /valid session/);
  await assert.rejects(signInToUnit({ ...base, unit: 'unit1', request: async () => ({ data: { token: 'wrong', user: {} } }) }), /valid session/);
  await assert.rejects(signInToUnit({ ...base, unit: 'unit1', request: async () => { throw Error('Invalid credentials'); } }), /Invalid credentials/);
  assert.equal(store.values.get('token'), 'existing-unit2');
  assert.equal(store.values.get('ivs1_session'), 'existing-unit1');
});
test('return paths stay inside selected workspace and switching units resets destination', () => {
  assert.equal(loginDestination('unit1', 'unit1', '/coils/1/qr?number=2'), '/unit1/coils/1/qr?number=2');
  assert.equal(loginDestination('unit2', 'unit1', '/coils/1'), '/unit2/');
  for (const from of ['//evil.example', '/../../unit2/production', '/login', '/coils\\evil', '/coils\nother', 'https://evil.example', '/%2e%2e/unit2/']) assert.equal(loginDestination('unit1', 'unit1', from), '/unit1/');
});
