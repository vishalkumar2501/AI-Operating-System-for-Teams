// Phase 7 Smoke Test: AI Agent, Risk Engine & Human-in-the-Loop Approval Cards
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
  console.log('🚀 Starting Phase 7 Smoke Test (AI Agent & Risk Engine)...');

  const timestamp = Date.now();
  const email = `phase7-${timestamp}@example.com`;
  const password = 'Password123!';

  // 1. Register User & Create Workspace
  console.log('1. Registering user & workspace...');
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'AI Lead Engineer' }),
  });
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  const token = regRes.data.data.accessToken;
  const user = regRes.data.data.user;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const wsRes = await request('/workspaces', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: `AI Workspace ${timestamp}` }),
  });
  if (!wsRes.ok) throw new Error(`Workspace creation failed: ${JSON.stringify(wsRes.data)}`);
  const workspaceId = wsRes.data.data.id;

  const projectKey = `AI${timestamp.toString().slice(-4)}`;
  const projRes = await request(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Autonomous Core', key: projectKey }),
  });
  if (!projRes.ok) throw new Error(`Project creation failed: ${JSON.stringify(projRes.data)}`);
  const projectId = projRes.data.data.id;

  // 2. Setup Overdue Chain scenario to test Risk Engine
  console.log('2. Setting up task dependency chain with an overdue blocker...');
  // Task A: Overdue
  const taskARes = await request(`/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Database Schema Sharding & Replication',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago!
    }),
  });
  if (!taskARes.ok) throw new Error(`Task A failed: ${JSON.stringify(taskARes.data)}`);
  const taskA = taskARes.data.data;

  // Task B: Blocked by Task A
  const taskBRes = await request(`/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Real-time Analytics Ingestion Workers',
      status: 'BLOCKED',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  if (!taskBRes.ok) throw new Error(`Task B failed: ${JSON.stringify(taskBRes.data)}`);
  const taskB = taskBRes.data.data;

  // Add dependency: Task B is blocked by Task A
  const depRes = await request(`/tasks/${taskB.id}/dependencies`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ dependsOnTaskId: taskA.id }),
  });
  if (!depRes.ok) throw new Error(`Add dependency failed: ${JSON.stringify(depRes.data)}`);
  console.log(`   ✅ Dependency configured: [${projectKey}-${taskB.number}] blocked by [${projectKey}-${taskA.number}]`);

  // 3. Test Risk Engine
  console.log('3. Running AI Risk Detection Engine...');
  const risksRes = await request(`/workspaces/${workspaceId}/ai/risks?projectId=${projectId}`, {
    method: 'GET',
    headers: authHeaders,
  });
  if (!risksRes.ok) throw new Error(`Get risks failed: ${JSON.stringify(risksRes.data)}`);
  const risks = risksRes.data.data;
  console.log(`   ✅ Risk Engine detected ${risks.length} risk(s):`);
  risks.forEach((r, idx) => {
    console.log(`      ${idx + 1}. [${r.severity}] ${r.title} (${r.type})`);
    console.log(`         Suggested Action: ${r.suggestedAction?.tool} -> ${r.suggestedAction?.description}`);
  });

  const overdueChain = risks.find((r) => r.type === 'OVERDUE_CHAIN');
  if (!overdueChain) throw new Error('Expected OVERDUE_CHAIN risk to be detected');

  // 4. Test Conversational Agent
  console.log('4. Testing AI Assistant Chat & Intent Routing...');
  const chatRes = await request(`/workspaces/${workspaceId}/ai/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      prompt: 'What are the main risks and bottlenecks in this project?',
      context: { projectId },
    }),
  });
  if (!chatRes.ok) throw new Error(`AI Chat failed: ${JSON.stringify(chatRes.data)}`);
  const chatData = chatRes.data.data;
  console.log(`   ✅ AI Assistant response (${chatData.latencyMs}ms):`);
  console.log(`      "${chatData.response.slice(0, 100)}..."`);
  console.log(`   ✅ AI generated ${chatData.proposedActions.length} action proposal(s) requiring human approval`);

  // 5. Test Write Tool Proposal with Approval Card
  console.log('5. Testing Write Tool proposal (Create Task via AI)...');
  const createTaskChatRes = await request(`/workspaces/${workspaceId}/ai/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      prompt: 'Create task: Implement rate limiting and DDoS protection',
      context: { projectId },
    }),
  });
  if (!createTaskChatRes.ok) throw new Error(`AI Chat create task failed: ${JSON.stringify(createTaskChatRes.data)}`);
  const proposedAction = createTaskChatRes.data.data.proposedActions[0];
  if (!proposedAction) throw new Error('Expected AI to propose a createTask action');
  console.log(`   ✅ Proposed Action ID: ${proposedAction.id}`);
  console.log(`   ✅ Tool: ${proposedAction.tool}`);
  console.log(`   ✅ Status: ${proposedAction.status} (Human Approval Required)`);

  // 6. Test Human Approval Lifecycle
  console.log('6. Approving action (Simulating human clicking "Approve" button)...');
  const approveRes = await request(`/workspaces/${workspaceId}/ai/actions/${proposedAction.id}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  if (!approveRes.ok) throw new Error(`Approve action failed: ${JSON.stringify(approveRes.data)}`);
  const executedAction = approveRes.data.data;
  console.log(`   ✅ Action executed! Status: ${executedAction.status}`);
  console.log(`   ✅ Created Task ID: ${executedAction.result?.id}`);
  console.log(`   ✅ Task Number: ${projectKey}-${executedAction.result?.number}`);

  // Verify task now exists in Project
  const taskVerifyRes = await request(`/tasks/${executedAction.result.id}`, {
    method: 'GET',
    headers: authHeaders,
  });
  if (!taskVerifyRes.ok) throw new Error(`Verify created task failed: ${JSON.stringify(taskVerifyRes.data)}`);
  console.log(`   ✅ Verified task in database: "${taskVerifyRes.data.data.title}"`);

  // 7. Test Action Rejection Lifecycle
  console.log('7. Testing Action Rejection Lifecycle...');
  const chatRejectRes = await request(`/workspaces/${workspaceId}/ai/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      prompt: 'Create task: Deprecate legacy node worker',
      context: { projectId },
    }),
  });
  const rejectProposal = chatRejectRes.data.data.proposedActions[0];
  const rejectRes = await request(`/workspaces/${workspaceId}/ai/actions/${rejectProposal.id}/reject`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  if (!rejectRes.ok) throw new Error(`Reject action failed: ${JSON.stringify(rejectRes.data)}`);
  console.log(`   ✅ Action status after rejection: ${rejectRes.data.data.status}`);

  console.log('\n🎉 Phase 7 Backend Smoke Test PASSED COMPLETELY!\n');
}

run().catch((err) => {
  console.error('❌ Phase 7 Smoke Test FAILED:', err);
  process.exit(1);
});
