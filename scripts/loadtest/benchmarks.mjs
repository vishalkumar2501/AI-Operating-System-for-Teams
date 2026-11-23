import autocannon from 'autocannon';

const BASE_URL = 'http://localhost:5000/api/v1';

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vishal@teamos.dev', password: 'password123' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to login for benchmark: ' + JSON.stringify(data));
  return data.data.accessToken;
}

async function getContext(token) {
  const wsRes = await fetch(`${BASE_URL}/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const wsData = await wsRes.json();
  const workspaceId = wsData.data[0].id;

  const projRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const projData = await projRes.json();
  const projectId = projData.data[0].id;

  return { workspaceId, projectId };
}

function runAutocannon(opts) {
  return new Promise((resolve, reject) => {
    autocannon(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

async function main() {
  console.log('⚡ Starting TeamOS Autocannon Load & Benchmark Test...\n');

  console.log('1. Authenticating test user (vishal@teamos.dev)...');
  const token = await login();
  const { workspaceId, projectId } = await getContext(token);
  console.log(`   Connected to Workspace: ${workspaceId}, Project: ${projectId}\n`);

  const benchmarks = [
    {
      name: 'Health Check (DB + Redis Ping)',
      url: `${BASE_URL}/health`,
      headers: {},
      duration: 5,
      connections: 20,
    },
    {
      name: 'Project Tasks Query (Filtered & Paginated)',
      url: `${BASE_URL}/projects/${projectId}/tasks`,
      headers: { Authorization: `Bearer ${token}` },
      duration: 5,
      connections: 15,
    },
    {
      name: 'Unified Calendar Feed (Meetings + Tasks)',
      url: `${BASE_URL}/workspaces/${workspaceId}/calendar`,
      headers: { Authorization: `Bearer ${token}` },
      duration: 5,
      connections: 15,
    },
    {
      name: 'Hybrid Search (Postgres FTS + pgvector RRF)',
      url: `${BASE_URL}/workspaces/${workspaceId}/search?q=vector`,
      headers: { Authorization: `Bearer ${token}` },
      duration: 5,
      connections: 10,
    },
  ];

  const results = [];

  for (const b of benchmarks) {
    console.log(`🏃 Running: ${b.name} (${b.connections} concurrent clients for ${b.duration}s)...`);
    const res = await runAutocannon({
      url: b.url,
      headers: b.headers,
      duration: b.duration,
      connections: b.connections,
    });

    const summary = {
      name: b.name,
      requestsSec: res.requests.average,
      latencyAvgMs: res.latency.average,
      latencyP50Ms: res.latency.p50,
      latencyP95Ms: res.latency.p95,
      latencyP99Ms: res.latency.p99,
      totalRequests: res.requests.total,
      errors: res.errors,
      non2xx: res.non2xx,
    };
    results.push(summary);
    console.log(`   Req/Sec: ${summary.requestsSec.toFixed(1)} | Avg: ${summary.latencyAvgMs.toFixed(1)}ms | p95: ${summary.latencyP95Ms}ms | p99: ${summary.latencyP99Ms}ms | Errors: ${summary.errors}\n`);
  }

  console.log('========================================================================');
  console.log('                 TeamOS Official Measured Benchmarks                    ');
  console.log('========================================================================');
  console.table(
    results.map((r) => ({
      Endpoint: r.name,
      'Req/sec': r.requestsSec.toFixed(0),
      'Avg (ms)': r.latencyAvgMs.toFixed(1),
      'p95 (ms)': r.latencyP95Ms,
      'p99 (ms)': r.latencyP99Ms,
      Total: r.totalRequests,
      Errors: r.errors,
    }))
  );
}

main().catch(console.error);
