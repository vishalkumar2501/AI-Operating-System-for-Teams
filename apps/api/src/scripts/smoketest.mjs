const BASE = 'http://localhost:5000/api/v1';

async function run() {
  // --- register ---
  const email = `smoketest+${Date.now()}@teamos.dev`;
  const reg = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', name: 'Smoke Test' }),
  });
  const regData = await reg.json();
  console.log('REGISTER', reg.status, JSON.stringify(regData).slice(0, 200));

  if (!regData.success) { process.exit(1); }
  const { accessToken } = regData.data;

  // --- get me ---
  const me = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meData = await me.json();
  console.log('GET ME', me.status, JSON.stringify(meData).slice(0, 200));

  // --- create workspace ---
  const ws = await fetch(`${BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name: 'Smoke Test Workspace' }),
  });
  const wsData = await ws.json();
  console.log('CREATE WS', ws.status, JSON.stringify(wsData).slice(0, 200));

  // --- list workspaces ---
  const list = await fetch(`${BASE}/workspaces`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const listData = await list.json();
  console.log('LIST WS', list.status, JSON.stringify(listData).slice(0, 200));

  // --- login ---
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  const loginData = await login.json();
  console.log('LOGIN', login.status, JSON.stringify(loginData).slice(0, 200));

  // --- duplicate register (should 409) ---
  const dup = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', name: 'Dup' }),
  });
  const dupData = await dup.json();
  console.log('DUPLICATE REGISTER (expect 409)', dup.status, JSON.stringify(dupData).slice(0, 200));

  // --- validation error (should 422) ---
  const bad = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: 'short', name: 'X' }),
  });
  const badData = await bad.json();
  console.log('BAD REGISTER (expect 422)', bad.status, JSON.stringify(badData).slice(0, 200));

  // --- google redirect (expect 503 since no credentials) ---
  const google = await fetch(`${BASE}/auth/google`, { redirect: 'manual' });
  console.log('GOOGLE REDIRECT (expect 503 or redirect)', google.status);

  console.log('\n✅ Smoke test complete');
}

run().catch(console.error);
