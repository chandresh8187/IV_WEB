export const units = ['unit1', 'unit2'];

export function workspaceUnit(pathname) {
  return pathname.match(/^\/(unit1|unit2)(?:\/|$)/)?.[1] || null;
}

export function loginDestination(unit, requestedUnit, from) {
  if (!units.includes(unit)) throw new Error('Select a unit.');
  const home = '/' + unit + '/';
  if (unit !== requestedUnit || typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || Array.from(from).some(char => char === '\\' || char.charCodeAt(0) <= 32)) return home;
  // Resolve against a fixed origin and enforce the selected workspace prefix.
  const url = new URL('/' + unit + from, 'https://iv.invalid');
  if (url.origin !== 'https://iv.invalid' || !url.pathname.startsWith(home) || url.pathname === home + 'login') return home;
  return url.pathname + url.search + url.hash;
}

export async function signInToUnit({ unit, email, password, request, storage }) {
  if (!units.includes(unit)) throw new Error('Select a unit.');
  const endpoint = unit === 'unit1' ? '/unit1/auth/login' : '/auth/login';
  const { data } = await request(endpoint, { email: email.trim().toLowerCase(), password });
  if (!data?.token || !data?.user || (unit === 'unit1' && data.user.scope !== 'unit1') || (unit === 'unit2' && data.user.scope === 'unit1')) throw new Error('The server did not return a valid session for this unit.');
  if (unit === 'unit1') storage.setItem('ivs1_session', JSON.stringify({ token: data.token, user: data.user }));
  else {
    storage.setItem('user', JSON.stringify(data.user));
    storage.setItem('token', data.token);
  }
  return data;
}
