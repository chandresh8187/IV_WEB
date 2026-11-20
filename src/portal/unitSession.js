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
  storage.setItem('iv_last_unit', unit);
  return data;
}

// Persistent sessions survive closing a tab; never mix credentials between units.
export function savedWorkspace(storage) {
  const hasSession = unit => {
    try {
      if (unit === 'unit1') {
        const session = JSON.parse(storage.getItem('ivs1_session') || 'null');
        return Boolean(session?.token && session?.user?.scope === 'unit1');
      }
      const user = JSON.parse(storage.getItem('user') || 'null');
      return Boolean(storage.getItem('token') && user?.role && user.scope !== 'unit1');
    } catch { return false; }
  };
  const preferred = storage.getItem('iv_last_unit');
  // A missing preferred session means that unit was logged out. Do not silently
  // sign into the other unit when opening the main URL afterward.
  if (units.includes(preferred)) return hasSession(preferred) ? preferred : null;
  return units.find(hasSession) || null;
}
