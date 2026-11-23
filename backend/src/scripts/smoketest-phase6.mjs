// Phase 6 Smoke Test: Docs, GitHub Webhooks & Hybrid Reciprocal Rank Fusion Search
const API_URL = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('🚀 Starting Phase 6 Smoke Test (Docs, GitHub Activity & Hybrid Search)...');

  const timestamp = Date.now();
  const email = `phase6-${timestamp}@example.com`;
  const password = 'Password123!';

  // 1. Register user
  console.log('1. Registering user...');
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'Phase 6 Engineer' }),
  });
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  const token = regRes.data.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Create Workspace & Project
  console.log('2. Creating workspace & project...');
  const wsRes = await request('/workspaces', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: `Search Workspace ${timestamp}` }),
  });
  if (!wsRes.ok) throw new Error(`Workspace creation failed: ${JSON.stringify(wsRes.data)}`);
  const workspaceId = wsRes.data.data.id;

  const projectKey = `D${timestamp.toString().slice(-4)}`;
  const projRes = await request(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Docs & Search Module', key: projectKey }),
  });
  if (!projRes.ok) throw new Error(`Project creation failed: ${JSON.stringify(projRes.data)}`);
  const projectId = projRes.data.data.id;

  // 3. Create Document
  console.log('3. Creating Document...');
  const docRes = await request(`/workspaces/${workspaceId}/docs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Hybrid Search Architecture & Vector Indexing',
      content: 'This specification outlines how PostgreSQL pgvector cosine distance integrates with lexical full-text search using Reciprocal Rank Fusion (RRF).',
      projectId,
    }),
  });
  if (!docRes.ok) throw new Error(`Doc creation failed: ${JSON.stringify(docRes.data)}`);
  const docId = docRes.data.data.id;
  console.log(`   ✅ Document created: "${docRes.data.data.title}" (ID: ${docId})`);

  // 4. Create Task
  console.log(`4. Creating Task ${projectKey}-1...`);
  const taskRes = await request(`/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Implement pgvector cosine distance and RRF ranking algorithm',
      description: 'Need to add vector similarity search with 768-dim embeddings and fuse results with full-text search.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    }),
  });
  if (!taskRes.ok) throw new Error(`Task creation failed: ${JSON.stringify(taskRes.data)}`);
  const task = taskRes.data.data;
  console.log(`   ✅ Task created: ${projectKey}-${task.number} (Status: ${task.status})`);

  // 5. Test GitHub Webhook (Push / Commit linking)
  console.log('5. Testing GitHub Webhook commit linking...');
  const pushRes = await request('/webhooks/github', {
    method: 'POST',
    headers: {
      'x-github-event': 'push',
    },
    body: JSON.stringify({
      repository: { full_name: 'vishalkumar2501/AI-Operating-System-for-Teams' },
      commits: [
        {
          id: 'a1b2c3d4e5f6',
          message: `feat(search): add pgvector query builder for ${projectKey}-${task.number}`,
          author: { username: 'vishalkumar2501', name: 'Vishal Kumar' },
          url: 'https://github.com/vishalkumar2501/AI-Operating-System-for-Teams/commit/a1b2c3d4e5f6',
        },
      ],
    }),
  });
  if (!pushRes.ok) throw new Error(`Webhook push failed: ${JSON.stringify(pushRes.data)}`);
  console.log('   ✅ Webhook processed commit successfully', pushRes.data);
  console.log(`   Task ID: ${task.id}, number: ${task.number}, workspaceId: ${workspaceId}`);

  // Verify GitActivity in workspace
  const actRes = await request(`/workspaces/${workspaceId}/git-activity`, {
    method: 'GET',
    headers: authHeaders,
  });
  if (!actRes.ok) throw new Error(`Get git activity failed: ${JSON.stringify(actRes.data)}`);
  console.log(`   ✅ Git activities found: ${actRes.data.data.length}`);
  const linked = actRes.data.data.find((a) => a.linkedTaskId === task.id);
  if (!linked) throw new Error(`Expected commit to be linked to task ${projectKey}-1`);
  console.log(`   ✅ Commit correctly linked to task ID: ${linked.linkedTaskId}`);

  // 6. Test GitHub Webhook (PR Merge & Auto-Resolve)
  console.log('6. Testing GitHub PR merge auto-resolution...');
  const prRes = await request('/webhooks/github', {
    method: 'POST',
    headers: {
      'x-github-event': 'pull_request',
    },
    body: JSON.stringify({
      action: 'closed',
      repository: { full_name: 'vishalkumar2501/AI-Operating-System-for-Teams' },
      pull_request: {
        number: 42,
        title: `fixes ${projectKey}-${task.number}: complete hybrid search engine`,
        body: `This PR resolves ${projectKey}-${task.number} with reciprocal rank fusion scoring.`,
        state: 'closed',
        merged: true,
        html_url: 'https://github.com/vishalkumar2501/AI-Operating-System-for-Teams/pull/42',
        user: { login: 'vishalkumar2501' },
      },
    }),
  });
  if (!prRes.ok) throw new Error(`Webhook PR failed: ${JSON.stringify(prRes.data)}`);

  // Verify task was auto-resolved to DONE
  const verifyTaskRes = await request(`/tasks/${task.id}`, {
    method: 'GET',
    headers: authHeaders,
  });
  if (!verifyTaskRes.ok) throw new Error(`Verify task failed: ${JSON.stringify(verifyTaskRes.data)}`);
  const updatedTask = verifyTaskRes.data.data;
  console.log(`   ✅ Task status after PR merge: ${updatedTask.status}`);
  if (updatedTask.status !== 'DONE') {
    throw new Error(`Expected task status to be DONE, got ${updatedTask.status}`);
  }

  // Verify automated comment posted on task
  const commentsRes = await request(`/tasks/${task.id}/comments`, {
    method: 'GET',
    headers: authHeaders,
  });
  if (!commentsRes.ok) throw new Error(`Get comments failed: ${JSON.stringify(commentsRes.data)}`);
  console.log(`   ✅ Automated comments on task: ${commentsRes.data.data.length}`);
  console.log(`   ✅ Comment body preview: "${commentsRes.data.data[0]?.body?.slice(0, 50)}..."`);

  // 7. Test Hybrid Search with Reciprocal Rank Fusion (RRF)
  console.log('7. Testing Hybrid Search with Reciprocal Rank Fusion...');
  const searchRes = await request(`/workspaces/${workspaceId}/search?q=vector`, {
    method: 'GET',
    headers: authHeaders,
  });
  if (!searchRes.ok) throw new Error(`Search failed: ${JSON.stringify(searchRes.data)}`);
  const results = searchRes.data.data;
  console.log(`   ✅ Hybrid search returned ${results.length} ranked result(s):`);
  results.forEach((r, idx) => {
    console.log(`      ${idx + 1}. [${r.entityType}] ${r.title} (RRF Score: ${r.score})`);
    console.log(`         Snippet: "${r.snippet.slice(0, 80)}..."`);
  });

  if (results.length === 0) {
    throw new Error('Expected at least 1 search result for query "vector"');
  }

  console.log('\n🎉 Phase 6 Backend Smoke Test PASSED COMPLETELY!\n');
}

run().catch((err) => {
  console.error('❌ Phase 6 Smoke Test FAILED:', err);
  process.exit(1);
});
