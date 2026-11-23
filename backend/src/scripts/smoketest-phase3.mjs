const BASE = 'http://localhost:5000/api/v1';

async function runPhase3SmokeTest() {
  console.log('\n======================================================');
  console.log('   TeamOS Phase 3 Smoke Test: Dependency Graph & CPM  ');
  console.log('======================================================\n');

  // 1. Setup Auth, Workspace, and Project
  const email = `graph.tester+${Date.now()}@teamos.dev`;
  const regRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', name: 'Graph Tester' }),
  });
  const regData = await regRes.json();
  if (!regData.success) throw new Error('Registration failed: ' + JSON.stringify(regData));
  const token = regData.data.accessToken;
  const user = regData.data.user;
  console.log('✅ Registered user:', user.email);

  const wsRes = await fetch(`${BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: `Graph Workspace ${Date.now()}` }),
  });
  const wsData = await wsRes.json();
  const workspaceId = wsData.data.id;
  console.log('✅ Workspace created:', wsData.data.name);

  const projRes = await fetch(`${BASE}/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Dependency Engine Project',
      key: `DEP${Date.now().toString().slice(-4)}`,
      description: 'Project to test DAG dependencies, cycle detection and CPM',
    }),
  });
  const projData = await projRes.json();
  const projectId = projData.data.id;
  const projectKey = projData.data.key;
  console.log(`✅ Project created: [${projectKey}] ${projData.data.name}\n`);

  // Helper to create task
  async function createTask(title, estimate) {
    const res = await fetch(`${BASE}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title,
        status: 'TODO',
        priority: 'HIGH',
        estimate,
      }),
    });
    const d = await res.json();
    return d.data;
  }

  // 2. Create Tasks A, B, C
  console.log('--- Step 1: Create Initial Tasks A, B, C ---');
  const taskA = await createTask('Task A - Database Schema', 3);
  const taskB = await createTask('Task B - REST Endpoints', 5);
  const taskC = await createTask('Task C - Frontend Integration', 2);
  console.log(`✅ Created Task A: [${taskA.number}] ${taskA.title} (3h)`);
  console.log(`✅ Created Task B: [${taskB.number}] ${taskB.title} (5h)`);
  console.log(`✅ Created Task C: [${taskC.number}] ${taskC.title} (2h)\n`);

  // 3. Add Dependency A -> B (A blocks B)
  console.log('--- Step 2: Add Dependency A blocks B ---');
  const depABRes = await fetch(`${BASE}/tasks/${taskB.id}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dependsOnTaskId: taskA.id }),
  });
  const depABData = await depABRes.json();
  if (!depABData.success) throw new Error('Failed to add dependency A -> B: ' + JSON.stringify(depABData));
  console.log('✅ Dependency A -> B added successfully');

  // Verify Task B is now auto-transitioned to BLOCKED
  const taskBCheck = await (await fetch(`${BASE}/tasks/${taskB.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  if (taskBCheck.data.status !== 'BLOCKED') {
    throw new Error(`Expected Task B to be BLOCKED, but was: ${taskBCheck.data.status}`);
  }
  console.log('✅ Auto-block confirmed: Task B transitioned to BLOCKED status');

  // 4. Add Dependency B -> C (B blocks C)
  console.log('\n--- Step 3: Add Dependency B blocks C ---');
  const depBCRes = await fetch(`${BASE}/tasks/${taskC.id}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dependsOnTaskId: taskB.id }),
  });
  const depBCData = await depBCRes.json();
  if (!depBCData.success) throw new Error('Failed to add dependency B -> C');
  console.log('✅ Dependency B -> C added successfully');

  const taskCCheck = await (await fetch(`${BASE}/tasks/${taskC.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  if (taskCCheck.data.status !== 'BLOCKED') {
    throw new Error(`Expected Task C to be BLOCKED, but was: ${taskCCheck.data.status}`);
  }
  console.log('✅ Auto-block confirmed: Task C transitioned to BLOCKED status\n');

  // 5. Cycle Detection Assertion (C blocks A would create cycle A -> B -> C -> A)
  console.log('--- Step 4: Cycle Detection Verification ---');
  const cycleRes = await fetch(`${BASE}/tasks/${taskA.id}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dependsOnTaskId: taskC.id }),
  });
  const cycleData = await cycleRes.json();
  if (cycleRes.status === 400 && cycleData.error?.code === 'CYCLE_DETECTED') {
    console.log('✅ Circular dependency rejected correctly with 400 CYCLE_DETECTED');
  } else {
    throw new Error(`Expected 400 CYCLE_DETECTED, got status ${cycleRes.status}: ${JSON.stringify(cycleData)}`);
  }

  // Self-dependency rejection
  const selfRes = await fetch(`${BASE}/tasks/${taskA.id}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dependsOnTaskId: taskA.id }),
  });
  if (selfRes.status === 400) {
    console.log('✅ Self-dependency rejected correctly with 400');
  } else {
    throw new Error('Expected 400 for self-dependency');
  }

  // 6. Critical Path Method (CPM) calculation
  console.log('\n--- Step 5: Critical Path Method (CPM) Calculation ---');
  const cpmRes = await fetch(`${BASE}/projects/${projectId}/critical-path`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cpmData = await cpmRes.json();
  console.log('Critical path result:', cpmData.data);
  // Expected path: [taskA.id, taskB.id, taskC.id], totalDuration = 3 + 5 + 2 = 10
  if (cpmData.data.totalDuration !== 10) {
    throw new Error(`Expected CPM totalDuration to be 10, got ${cpmData.data.totalDuration}`);
  }
  if (JSON.stringify(cpmData.data.taskIds) !== JSON.stringify([taskA.id, taskB.id, taskC.id])) {
    throw new Error(`Expected critical path [A, B, C], got: ${JSON.stringify(cpmData.data.taskIds)}`);
  }
  console.log('✅ Critical path verified: A (3h) -> B (5h) -> C (2h) = 10h total duration');

  // Add parallel independent Task D (12h) to verify CPM dynamic update
  const taskD = await createTask('Task D - Infrastructure Setup', 12);
  const cpmRes2 = await fetch(`${BASE}/projects/${projectId}/critical-path`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cpmData2 = await cpmRes2.json();
  if (cpmData2.data.totalDuration !== 12 || cpmData2.data.taskIds[0] !== taskD.id) {
    throw new Error(`Expected new critical path to be Task D (12h), got: ${JSON.stringify(cpmData2.data)}`);
  }
  console.log('✅ Critical path dynamically updated when longer path Task D (12h) added');

  // 7. Auto-unblock on task completion
  console.log('\n--- Step 6: Auto-unblock on Completion Verification ---');
  // Mark Task A as DONE
  await fetch(`${BASE}/tasks/${taskA.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'DONE' }),
  });
  console.log('Marked Task A as DONE');

  // Check Task B (should now be TODO)
  const taskBAfterA = await (await fetch(`${BASE}/tasks/${taskB.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  if (taskBAfterA.data.status !== 'TODO') {
    throw new Error(`Expected Task B to be auto-unblocked to TODO, got: ${taskBAfterA.data.status}`);
  }
  console.log('✅ Auto-unblock confirmed: Task B transitioned from BLOCKED to TODO');

  // Check Task C (should still be BLOCKED because B is not DONE yet)
  const taskCAfterA = await (await fetch(`${BASE}/tasks/${taskC.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  if (taskCAfterA.data.status !== 'BLOCKED') {
    throw new Error(`Expected Task C to remain BLOCKED, got: ${taskCAfterA.data.status}`);
  }
  console.log('✅ Dependent Task C remains BLOCKED while prerequisite B is pending');

  // Now mark Task B as DONE
  await fetch(`${BASE}/tasks/${taskB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'DONE' }),
  });
  console.log('Marked Task B as DONE');

  // Check Task C (should now be TODO)
  const taskCAfterB = await (await fetch(`${BASE}/tasks/${taskC.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  if (taskCAfterB.data.status !== 'TODO') {
    throw new Error(`Expected Task C to be auto-unblocked to TODO, got: ${taskCAfterB.data.status}`);
  }
  console.log('✅ Auto-unblock confirmed: Task C transitioned to TODO once all blockers completed\n');

  // 8. Delete Dependency verification
  console.log('--- Step 7: Delete Dependency Verification ---');
  // Add dependency Task D blocks Task C
  const depDCRes = await fetch(`${BASE}/tasks/${taskC.id}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dependsOnTaskId: taskD.id }),
  });
  const depDCData = await depDCRes.json();
  const depDCId = depDCData.data.id;

  // C should now be BLOCKED again
  const taskCAfterD = await (await fetch(`${BASE}/tasks/${taskC.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  if (taskCAfterD.data.status !== 'BLOCKED') {
    throw new Error(`Expected Task C to be BLOCKED by D, got: ${taskCAfterD.data.status}`);
  }
  console.log('✅ Task C re-blocked by adding Task D dependency');

  // Remove dependency D -> C
  const delDepRes = await fetch(`${BASE}/tasks/${taskC.id}/dependencies/${depDCId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const delDepData = await delDepRes.json();
  if (!delDepData.success) throw new Error('Failed to delete dependency');
  console.log('✅ Dependency D -> C deleted');

  // Task C should be auto-unblocked to TODO
  const taskCAfterDel = await (await fetch(`${BASE}/tasks/${taskC.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  if (taskCAfterDel.data.status !== 'TODO') {
    throw new Error(`Expected Task C to be auto-unblocked to TODO after dependency removal, got: ${taskCAfterDel.data.status}`);
  }
  console.log('✅ Auto-unblock confirmed on dependency removal: Task C is TODO\n');

  // 9. Full Graph API Verification
  console.log('--- Step 8: Full Graph API Payload Verification ---');
  const graphRes = await fetch(`${BASE}/projects/${projectId}/graph`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const graphData = await graphRes.json();
  if (!graphData.success) throw new Error('Failed to fetch project graph');
  console.log(`Graph summary: ${graphData.data.nodes.length} nodes, ${graphData.data.edges.length} edges`);
  console.log('Critical path:', graphData.data.criticalPath);

  if (!Array.isArray(graphData.data.nodes) || !Array.isArray(graphData.data.edges)) {
    throw new Error('Graph data does not have nodes and edges arrays');
  }
  console.log('✅ Full graph API returns valid ProjectGraphData structure\n');

  // 10. Blueprint Section 13: 20-Task DAG Scale Test
  console.log('--- Step 9: 20-Task DAG Scale Test (Blueprint Spec) ---');
  const t0 = Date.now();
  const scaleTasks = [];
  for (let i = 1; i <= 20; i++) {
    const t = await createTask(`Scale Task ${i}`, i % 5 + 1);
    scaleTasks.push(t);
  }
  console.log(`Created 20 tasks in ${Date.now() - t0}ms`);

  // Build a tree of valid DAG dependencies:
  // 0 -> 1 -> 2 -> 3 -> 4
  // 0 -> 5 -> 6 -> 7
  // 8 -> 9 -> 10 -> 11
  // 12 -> 13 -> 14
  // 15 -> 16 -> 17 -> 18 -> 19
  const depPairs = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7],
    [8, 9], [9, 10], [10, 11],
    [12, 13], [13, 14],
    [15, 16], [16, 17], [17, 18], [18, 19],
  ];

  for (const [sourceIdx, targetIdx] of depPairs) {
    const sourceTask = scaleTasks[sourceIdx];
    const targetTask = scaleTasks[targetIdx];
    const res = await fetch(`${BASE}/tasks/${targetTask.id}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dependsOnTaskId: sourceTask.id }),
    });
    const d = await res.json();
    if (!d.success) throw new Error(`Failed to add dependency ${sourceIdx} -> ${targetIdx}`);
  }
  console.log(`Added ${depPairs.length} valid DAG dependencies`);

  const tGraphStart = Date.now();
  const scaleGraphRes = await fetch(`${BASE}/projects/${projectId}/graph`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const scaleGraphData = await scaleGraphRes.json();
  const graphDuration = Date.now() - tGraphStart;

  console.log(`Graph computation with 24 tasks & ${scaleGraphData.data.edges.length} edges completed in ${graphDuration}ms`);
  if (!scaleGraphData.success || scaleGraphData.data.nodes.length !== 24) {
    throw new Error(`Expected 24 nodes, got ${scaleGraphData.data.nodes.length}`);
  }
  console.log('Critical path through scale DAG:', scaleGraphData.data.criticalPath);
  console.log('✅ 20-task DAG scale test passed successfully!');

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 3 SMOKE TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runPhase3SmokeTest().catch((err) => {
  console.error('\n❌ Phase 3 Smoke Test Failed:', err);
  process.exit(1);
});
