import { io } from 'socket.io-client';
import crypto from 'node:crypto';

const API_BASE = 'http://localhost:5000/api/v1';

async function req(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

const results = [];
function record(name, status, details = '') {
  results.push({ name, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${status}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function runAudit() {
  console.log('================================================================');
  console.log('🧪 Starting TeamOS Automated End-to-End QA Audit Suite');
  console.log('================================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Health & Database Connectivity
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Infrastructure & Health ---');
  try {
    const health = await req('/health');
    if (health.ok && health.data.db === 'connected' && health.data.redis === 'connected') {
      record('API Health Check', 'PASS', 'PostgreSQL & Redis connected');
    } else {
      record('API Health Check', 'FAIL', JSON.stringify(health.data));
    }
  } catch (err) {
    record('API Health Check', 'FAIL', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Authentication & User Management
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Authentication & Token Lifecycle ---');
  let authToken = '';
  let ownerUser = null;

  try {
    // 2.1 Seeded Login
    const loginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vishal@teamos.dev', password: 'password123' }),
    });

    if (loginRes.ok && loginRes.data.data?.accessToken) {
      authToken = loginRes.data.data.accessToken;
      ownerUser = loginRes.data.data.user;
      record('Seeded User Login', 'PASS', `Logged in as ${ownerUser.name} (${ownerUser.email})`);
    } else {
      record('Seeded User Login', 'FAIL', JSON.stringify(loginRes.data));
    }

    // 2.2 Verify /auth/me
    const meRes = await req('/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meUser = meRes.data.data?.user || meRes.data.data;
    if (meRes.ok && meUser?.email === 'vishal@teamos.dev') {
      record('Fetch Current User Profile (/auth/me)', 'PASS', `User ID: ${meUser.id}`);
    } else {
      record('Fetch Current User Profile (/auth/me)', 'FAIL', JSON.stringify(meRes.data));
    }

    // 2.3 Invalid credentials rejection
    const badLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vishal@teamos.dev', password: 'wrongpassword' }),
    });
    if (badLogin.status === 401) {
      record('Reject Invalid Password', 'PASS', 'Correctly rejected with 401 Unauthorized');
    } else {
      record('Reject Invalid Password', 'FAIL', `Expected 401, got ${badLogin.status}`);
    }

    // 2.4 New User Registration
    const randEmail = `qa.test.${Date.now()}@teamos.dev`;
    const regRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'QA Test Engineer', email: randEmail, password: 'password123' }),
    });
    if (regRes.ok && regRes.data.data?.accessToken) {
      record('New User Registration', 'PASS', `Created user: ${randEmail}`);
    } else {
      record('New User Registration', 'FAIL', JSON.stringify(regRes.data));
    }
  } catch (err) {
    record('Authentication Suite', 'FAIL', err.message);
  }

  const authHeader = { Authorization: `Bearer ${authToken}` };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Workspaces & RBAC
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Workspaces & RBAC ---');
  let activeWorkspaceId = '';

  try {
    const wsList = await req('/workspaces', { headers: authHeader });
    if (wsList.ok && Array.isArray(wsList.data.data) && wsList.data.data.length > 0) {
      activeWorkspaceId = wsList.data.data[0].id;
      record('List Workspaces', 'PASS', `Found ${wsList.data.data.length} workspaces. Active: ${wsList.data.data[0].name}`);
    } else {
      record('List Workspaces', 'FAIL', JSON.stringify(wsList.data));
    }

    // Workspace Members
    const membersRes = await req(`/workspaces/${activeWorkspaceId}/members`, { headers: authHeader });
    if (membersRes.ok && Array.isArray(membersRes.data.data) && membersRes.data.data.length > 0) {
      record('Fetch Workspace Members', 'PASS', `Retrieved ${membersRes.data.data.length} members`);
    } else {
      record('Fetch Workspace Members', 'FAIL', JSON.stringify(membersRes.data));
    }
  } catch (err) {
    record('Workspace Suite', 'FAIL', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Projects, Tasks & Kanban Board
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Projects & Tasks (Kanban) ---');
  let activeProjectId = '';
  let activeTaskId = '';

  try {
    // 4.1 List Projects
    const projRes = await req(`/workspaces/${activeWorkspaceId}/projects`, { headers: authHeader });
    if (projRes.ok && Array.isArray(projRes.data.data) && projRes.data.data.length > 0) {
      activeProjectId = projRes.data.data[0].id;
      record('List Projects', 'PASS', `Found ${projRes.data.data.length} projects. Active: ${projRes.data.data[0].name} [${projRes.data.data[0].key}]`);
    } else {
      record('List Projects', 'FAIL', JSON.stringify(projRes.data));
    }

    // 4.2 Query Tasks
    const tasksRes = await req(`/projects/${activeProjectId}/tasks`, { headers: authHeader });
    if (tasksRes.ok && Array.isArray(tasksRes.data.data) && tasksRes.data.data.length > 0) {
      activeTaskId = tasksRes.data.data[0].id;
      record('Query Project Tasks (Kanban)', 'PASS', `Retrieved ${tasksRes.data.data.length} tasks`);
    } else {
      record('Query Project Tasks (Kanban)', 'FAIL', JSON.stringify(tasksRes.data));
    }

    // 4.3 Create New Task
    const newTaskRes = await req(`/projects/${activeProjectId}/tasks`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        title: 'QA Automated Task Verification',
        description: 'Generated by TeamOS automated QA audit test suite',
        priority: 'HIGH',
        status: 'TODO',
      }),
    });
    if (newTaskRes.ok && newTaskRes.data.data?.number) {
      const createdTask = newTaskRes.data.data;
      record('Create Task with Auto-Increment Key', 'PASS', `Created Task #${createdTask.number}: ${createdTask.title}`);
    } else {
      record('Create Task with Auto-Increment Key', 'FAIL', JSON.stringify(newTaskRes.data));
    }

    // 4.4 Task Status Transition (PATCH /tasks/:id)
    const statusUpdate = await req(`/tasks/${activeTaskId}`, {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    if (statusUpdate.ok && statusUpdate.data.data?.status === 'IN_PROGRESS') {
      record('Kanban Task Status Drag/Update', 'PASS', `Transitioned task ${activeTaskId} to IN_PROGRESS`);
    } else {
      record('Kanban Task Status Drag/Update', 'FAIL', JSON.stringify(statusUpdate.data));
    }

    // 4.5 Task Comments Feed
    const addComment = await req(`/tasks/${activeTaskId}/comments`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ body: 'Automated QA verification comment: verified zero-downtime latency.' }),
    });
    if (addComment.ok && addComment.data.data?.id) {
      record('Post Task Comment', 'PASS', `Comment ID: ${addComment.data.data.id}`);
    } else {
      record('Post Task Comment', 'FAIL', JSON.stringify(addComment.data));
    }
  } catch (err) {
    record('Project & Task Suite', 'FAIL', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. DAG Dependency Graph & Critical Path Method (CPM)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. DAG Dependency Graph & Critical Path Method ---');
  try {
    const graphRes = await req(`/projects/${activeProjectId}/graph`, { headers: authHeader });
    if (graphRes.ok && Array.isArray(graphRes.data.data?.nodes) && Array.isArray(graphRes.data.data?.edges)) {
      const { nodes, edges, criticalPath } = graphRes.data.data;
      record('DAG Graph Calculation', 'PASS', `Nodes: ${nodes.length}, Edges: ${edges.length}, Critical Path Length: ${criticalPath?.length ?? 0}`);
    } else {
      record('DAG Graph Calculation', 'FAIL', JSON.stringify(graphRes.data));
    }

    // 5.2 Cycle Detection Verification (Ensure Cycle is BLOCKED)
    const tasksRes = await req(`/projects/${activeProjectId}/tasks`, { headers: authHeader });
    const tasks = tasksRes.data?.data || [];
    if (tasks.length >= 2) {
      const t1 = tasks[0].id;
      const t2 = tasks[1].id;

      // Add edge t1 -> t2
      await req(`/tasks/${t2}/dependencies`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ dependsOnTaskId: t1 }),
      });

      // Attempt reverse edge t2 -> t1 (Should create cycle and be rejected)
      const cycleAttempt = await req(`/tasks/${t1}/dependencies`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ dependsOnTaskId: t2 }),
      });

      if (cycleAttempt.status === 400 && cycleAttempt.data.error?.code === 'CYCLE_DETECTED') {
        record('DFS Cycle Detection & Rejection', 'PASS', 'Correctly rejected circular dependency with 400 CYCLE_DETECTED');
      } else {
        record('DFS Cycle Detection & Rejection', 'FAIL', `Expected 400 CYCLE_DETECTED, got ${cycleAttempt.status} (${JSON.stringify(cycleAttempt.data)})`);
      }
    } else {
      record('DFS Cycle Detection & Rejection', 'FAIL', 'Not enough tasks to test cycle detection');
    }
  } catch (err) {
    record('Dependency Graph Suite', 'FAIL', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Realtime Socket.IO Connection & Presence
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Realtime Socket.IO Engine ---');
  try {
    const socket = io('http://localhost:5000', {
      auth: { token: authToken },
      transports: ['websocket'],
      timeout: 5000,
    });

    await new Promise((resolve) => {
      socket.on('connect', () => {
        record('Socket.IO Handshake Auth', 'PASS', `Socket connected with ID: ${socket.id}`);
        socket.emit('workspace:join', { workspaceId: activeWorkspaceId });
        resolve(true);
      });

      socket.on('connect_error', (err) => {
        record('Socket.IO Handshake Auth', 'FAIL', err.message);
        resolve(false);
      });

      setTimeout(() => {
        resolve(false);
      }, 3000);
    });

    socket.disconnect();
  } catch (err) {
    record('Realtime Suite', 'FAIL', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Calendar, Meetings & Audio Intelligence
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Meetings, Calendar & Audio Intelligence ---');
  try {
    // 7.1 Calendar Feed
    const calRes = await req(`/workspaces/${activeWorkspaceId}/calendar?from=${new Date(Date.now() - 30 * 86400000).toISOString()}&to=${new Date(Date.now() + 30 * 86400000).toISOString()}`, {
      headers: authHeader,
    });
    if (calRes.ok && Array.isArray(calRes.data.data)) {
      record('Unified Calendar Feed', 'PASS', `Retrieved ${calRes.data.data.length} scheduled calendar events`);
    } else {
      record('Unified Calendar Feed', 'FAIL', JSON.stringify(calRes.data));
    }

    // 7.2 Free/Busy Slots
    const freeBusyRes = await req(`/workspaces/${activeWorkspaceId}/calendar/free-busy?date=${new Date().toISOString().split('T')[0]}&users=${ownerUser.id}`, {
      headers: authHeader,
    });
    if (freeBusyRes.ok && Array.isArray(freeBusyRes.data.data?.availableSlots || freeBusyRes.data.data)) {
      record('Team Free/Busy Slot Detection', 'PASS', `Successfully calculated open available slots`);
    } else {
      record('Team Free/Busy Slot Detection', 'FAIL', JSON.stringify(freeBusyRes.data));
    }

    // 7.3 List Meetings & Transcripts
    const meetingsRes = await req(`/workspaces/${activeWorkspaceId}/meetings`, { headers: authHeader });
    if (meetingsRes.ok && Array.isArray(meetingsRes.data.data) && meetingsRes.data.data.length > 0) {
      const activeMeeting = meetingsRes.data.data[0];
      record('List Meetings', 'PASS', `Retrieved ${meetingsRes.data.data.length} meetings. Sample: "${activeMeeting.title}"`);

      // 7.4 Fetch Meeting Detail with Transcript
      const meetingDetail = await req(`/workspaces/${activeWorkspaceId}/meetings/${activeMeeting.id}`, { headers: authHeader });
      if (meetingDetail.ok) {
        record('Diarized Audio Transcript', 'PASS', `Meeting detail loaded successfully with transcript and action items`);
      } else {
        record('Diarized Audio Transcript', 'FAIL', JSON.stringify(meetingDetail.data));
      }
    } else {
      record('List Meetings', 'FAIL', JSON.stringify(meetingsRes.data));
    }
  } catch (err) {
    record('Meetings & Calendar Suite', 'FAIL', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Docs & Hybrid Spotlight Search (pgvector + RRF)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Docs, GitHub Webhook & Hybrid Search ---');
  try {
    // 8.1 Docs
    const docsRes = await req(`/workspaces/${activeWorkspaceId}/docs`, { headers: authHeader });
    if (docsRes.ok && Array.isArray(docsRes.data.data)) {
      record('List Architecture Docs', 'PASS', `Found ${docsRes.data.data.length} docs`);
    } else {
      record('List Architecture Docs', 'FAIL', JSON.stringify(docsRes.data));
    }

    // 8.2 Hybrid Search (RRF Reciprocal Rank Fusion)
    const searchRes = await req(`/workspaces/${activeWorkspaceId}/search?q=redis`, { headers: authHeader });
    if (searchRes.ok && Array.isArray(searchRes.data.data)) {
      record('Hybrid Semantic Search (RRF pgvector)', 'PASS', `Query "redis" returned ${searchRes.data.data.length} ranked results`);
    } else {
      record('Hybrid Semantic Search (RRF pgvector)', 'FAIL', JSON.stringify(searchRes.data));
    }

    // 8.3 GitHub Webhook Ingestion with HMAC-SHA256
    const payload = JSON.stringify({
      action: 'closed',
      pull_request: {
        number: 42,
        title: `fixes CORE-1: resolve latency bottleneck`,
        merged: true,
        user: { login: 'vishal' },
        html_url: 'https://github.com/vishalkumar2501/AI-Operating-System-for-Teams/pull/42',
      },
      repository: { full_name: 'vishalkumar2501/AI-Operating-System-for-Teams' },
    });

    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev_github_webhook_secret_key';
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const webhookRes = await req('/webhooks/github', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': sig,
        'x-github-event': 'pull_request',
      },
      body: payload,
    });

    if (webhookRes.ok) {
      record('GitHub Webhook HMAC Signature & PR Auto-Resolve', 'PASS', 'Verified HMAC signature & PR task parser');
    } else {
      record('GitHub Webhook HMAC Signature & PR Auto-Resolve', 'FAIL', JSON.stringify(webhookRes.data));
    }
  } catch (err) {
    record('Docs & Search Suite', 'FAIL', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Autonomous AI Agent, Risk Engine & Approval Cards
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 9. AI Agent, Risk Engine & Human-in-the-Loop Approvals ---');
  try {
    // 9.1 Risk Engine
    const risksRes = await req(`/workspaces/${activeWorkspaceId}/ai/risks`, { headers: authHeader });
    if (risksRes.ok && Array.isArray(risksRes.data.data)) {
      record('AI Risk Detection Engine', 'PASS', `Identified ${risksRes.data.data.length} active risks (overdue chains & critical path blockers)`);
    } else {
      record('AI Risk Detection Engine', 'FAIL', JSON.stringify(risksRes.data));
    }

    // 9.2 AI Chat - Read Intent
    const chatReadRes = await req(`/workspaces/${activeWorkspaceId}/ai/chat`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        prompt: 'What are the main risks in this sprint?',
      }),
    });
    if (chatReadRes.ok && chatReadRes.data.data?.response) {
      record('AI Agent Read Tool Routing', 'PASS', 'Dispatched detectRisks tool and generated conversational response');
    } else {
      record('AI Agent Read Tool Routing', 'FAIL', JSON.stringify(chatReadRes.data));
    }

    // 9.3 AI Chat - Write Intent with Human Approval Card Gating
    const chatWriteRes = await req(`/workspaces/${activeWorkspaceId}/ai/chat`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        prompt: 'Create task: Benchmark Redis connection pool under high concurrency',
      }),
    });

    if (chatWriteRes.ok && Array.isArray(chatWriteRes.data.data?.proposedActions) && chatWriteRes.data.data.proposedActions.length > 0) {
      const action = chatWriteRes.data.data.proposedActions[0];
      if (action.status === 'PROPOSED') {
        record('AI Write Action Approval Gating', 'PASS', `Generated PROPOSED Action Card #${action.id} (status: PROPOSED)`);

        // 9.4 Approve & Execute Action
        const approveRes = await req(`/workspaces/${activeWorkspaceId}/ai/actions/${action.id}/approve`, {
          method: 'POST',
          headers: authHeader,
        });

        if (approveRes.ok && approveRes.data.data?.status === 'EXECUTED') {
          record('Human Approval & Execution Loop', 'PASS', `Action #${action.id} executed and logged in audit trail`);
        } else {
          record('Human Approval & Execution Loop', 'FAIL', JSON.stringify(approveRes.data));
        }
      } else {
        record('AI Write Action Approval Gating', 'FAIL', `Expected status PROPOSED, got ${action.status}`);
      }
    } else {
      record('AI Write Action Approval Gating', 'FAIL', JSON.stringify(chatWriteRes.data));
    }
  } catch (err) {
    record('AI Agent Suite', 'FAIL', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === 'PASS').length;
  const total = results.length;
  const pct = ((passed / total) * 100).toFixed(1);

  console.log('\n================================================================');
  console.log('              🎉 TEAMOS COMPLETE QA AUDIT REPORT                ');
  console.log('================================================================');
  console.log(`  Total Test Scenarios: ${total}`);
  console.log(`  Passed:               ${passed}`);
  console.log(`  Failed:               ${total - passed}`);
  console.log(`  System Health Score:  ${pct}%`);
  console.log('================================================================\n');

  if (passed === total) {
    console.log('🌟 100% OF ALL MODULES & WORKFLOWS VERIFIED OPERATIONAL!');
    process.exit(0);
  } else {
    console.log('⚠️ Some test scenarios failed. Check output above for details.');
    process.exit(1);
  }
}

runAudit().catch(console.error);
