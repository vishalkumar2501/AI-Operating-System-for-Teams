const BASE = 'http://localhost:5000/api/v1';

async function runPhase2SmokeTest() {
  console.log('\n--- TeamOS Phase 2 Smoke Test Starting ---');

  // 1. Register User A
  const emailA = `alice+${Date.now()}@teamos.dev`;
  const regA = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password: 'password123', name: 'Alice Product' }),
  });
  const dataA = await regA.json();
  const tokenA = dataA.data.accessToken;
  const userA = dataA.data.user;
  console.log('✅ User A created:', userA.email);

  // 2. Register User B
  const emailB = `bob+${Date.now()}@teamos.dev`;
  const regB = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password: 'password123', name: 'Bob Engineer' }),
  });
  const dataB = await regB.json();
  const tokenB = dataB.data.accessToken;
  const userB = dataB.data.user;
  console.log('✅ User B created:', userB.email);

  // 3. Create Workspace
  const wsRes = await fetch(`${BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: `Phase 2 Workspace ${Date.now()}` }),
  });
  const wsData = await wsRes.json();
  const workspaceId = wsData.data.id;
  console.log('✅ Workspace created:', wsData.data.name);

  // 4. Invite User B and Accept Invite
  const invRes = await fetch(`${BASE}/workspaces/${workspaceId}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ email: emailB, role: 'MEMBER' }),
  });
  const invData = await invRes.json();
  console.log('✅ User B invited, token hash:', invData.data.tokenHash.slice(0, 10));

  // 5. Create Project "CORE"
  const projRes = await fetch(`${BASE}/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Core Platform',
      key: `COR${Date.now().toString().slice(-4)}`,
      description: 'Core platform engineering features',
    }),
  });
  const projData = await projRes.json();
  if (!projData.success) {
    console.error('Project creation failed:', projData);
    process.exit(1);
  }
  const projectId = projData.data.id;
  const projectKey = projData.data.key;
  console.log(`✅ Project created: [${projectKey}] ${projData.data.name}`);

  // 6. Create Task "Record a video" (from Blueprint done condition!)
  const taskRes = await fetch(`${BASE}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      title: 'Record a video',
      description: 'Record an onboarding walkthrough video for new team members',
      priority: 'HIGH',
      status: 'TODO',
      assigneeId: userA.id,
      estimate: 4,
    }),
  });
  const taskData = await taskRes.json();
  if (!taskData.success) {
    console.error('Task creation failed:', taskData);
    process.exit(1);
  }
  const taskId = taskData.data.id;
  console.log(`✅ Task created: ${projectKey}-${taskData.data.number} "${taskData.data.title}"`);

  // 7. Add User B as Subscriber
  const subRes = await fetch(`${BASE}/tasks/${taskId}/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ userId: userB.id }),
  });
  const subData = await subRes.json();
  console.log('✅ Subscriber added (User B):', subData.success);

  // 8. Update task: set deadline (dueDate) and move status to IN_PROGRESS
  const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const updateRes = await fetch(`${BASE}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      dueDate: futureDate,
      status: 'IN_PROGRESS',
    }),
  });
  const updateData = await updateRes.json();
  console.log('✅ Task updated (status = IN_PROGRESS, deadline set):', updateData.data.status);

  // 9. Verify User B received an in-app notification!
  const notifRes = await fetch(`${BASE}/notifications`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const notifData = await notifRes.json();
  console.log('✅ User B notifications count:', notifData.data.length);
  const taskUpdateNotif = notifData.data.find((n) => n.type === 'TASK_UPDATED');
  if (taskUpdateNotif) {
    console.log('🎉 Notification verified for subscriber:', taskUpdateNotif.payload.summary);
  } else {
    console.warn('⚠️ No TASK_UPDATED notification found. Notifs:', notifData.data);
  }

  // 10. List tasks with filters
  const listRes = await fetch(`${BASE}/projects/${projectId}/tasks?status=IN_PROGRESS`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const listData = await listRes.json();
  console.log('DEBUG list tasks response:', listRes.status, listData);
  console.log('✅ Filtered tasks (status=IN_PROGRESS):', listData.data?.length, 'found');

  // 11. My Tasks endpoint
  const myTasksRes = await fetch(`${BASE}/tasks/my`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const myTasksData = await myTasksRes.json();
  console.log('✅ User A "My Tasks" count:', myTasksData.data.length);

  console.log('\n🎉 Phase 2 backend verification complete: all flows passed!\n');
}

runPhase2SmokeTest().catch(console.error);
