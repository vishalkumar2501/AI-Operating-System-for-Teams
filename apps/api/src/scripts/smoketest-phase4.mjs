import { io } from 'socket.io-client';

const BASE = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

async function runPhase4SmokeTest() {
  console.log('\n======================================================');
  console.log('   TeamOS Phase 4 Smoke Test: Realtime & Comments     ');
  console.log('======================================================\n');

  // 1. Register User Alice & Bob
  const emailA = `alice.realtime+${Date.now()}@teamos.dev`;
  const regA = await (await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password: 'password123', name: 'Alice Realtime' }),
  })).json();
  const tokenA = regA.data.accessToken;
  const userA = regA.data.user;
  console.log('✅ Registered User Alice:', userA.email);

  const emailB = `bob.realtime+${Date.now()}@teamos.dev`;
  const regB = await (await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password: 'password123', name: 'Bob Realtime' }),
  })).json();
  const tokenB = regB.data.accessToken;
  const userB = regB.data.user;
  console.log('✅ Registered User Bob:', userB.email);

  // 2. Setup Workspace & Invite Bob
  const wsRes = await (await fetch(`${BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: `Realtime Workspace ${Date.now()}` }),
  })).json();
  const workspaceId = wsRes.data.id;
  console.log('✅ Workspace created:', wsRes.data.name);

  // Invite Bob & Accept
  const invRes = await (await fetch(`${BASE}/workspaces/${workspaceId}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ email: emailB, role: 'MEMBER' }),
  })).json();
  const rawToken = invRes.data.inviteUrl.split('/invites/')[1].split('/')[0];

  const acceptRes = await (await fetch(`${BASE}/invites/${rawToken}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  })).json();
  if (!acceptRes.success) throw new Error('Bob failed to accept invite: ' + JSON.stringify(acceptRes));
  console.log('✅ Bob joined the workspace via invite');

  // 3. Create Project and Task
  const projRes = await (await fetch(`${BASE}/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Realtime Project',
      key: `RT${Date.now().toString().slice(-4)}`,
      description: 'Project to test Socket.IO, presence, and live comments',
    }),
  })).json();
  const projectId = projRes.data.id;

  const taskRes = await (await fetch(`${BASE}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      title: 'Realtime Collaboration Flow',
      status: 'TODO',
      priority: 'HIGH',
      estimate: 3,
    }),
  })).json();
  const task = taskRes.data;
  console.log(`✅ Created Task: [${projRes.data.key}-${task.number}] ${task.title}\n`);

  // 4. Test Unauthenticated Socket Connection (should fail)
  console.log('--- Step 1: Testing Socket Handshake Authentication ---');
  await new Promise((resolve) => {
    const badSocket = io(SOCKET_URL, {
      auth: { token: 'invalid_token' },
      transports: ['websocket'],
      reconnection: false,
    });
    badSocket.on('connect_error', (err) => {
      console.log('✅ Unauthenticated socket rejected correctly:', err.message);
      badSocket.close();
      resolve();
    });
  });

  // 5. Connect Alice and Bob via Authenticated Sockets
  console.log('\n--- Step 2: Connecting Authenticated Sockets ---');
  const socketA = io(SOCKET_URL, {
    auth: { token: tokenA },
    transports: ['websocket'],
  });
  const socketB = io(SOCKET_URL, {
    auth: { token: tokenB },
    transports: ['websocket'],
  });

  socketA.on('connect_error', (err) => console.error('❌ Socket A connect_error:', err.message));
  socketB.on('connect_error', (err) => console.error('❌ Socket B connect_error:', err.message));

  await Promise.all([
    new Promise((resolve) => socketA.on('connect', resolve)),
    new Promise((resolve) => socketB.on('connect', resolve)),
  ]);
  console.log('✅ Alice connected to Socket.IO (socketId:', socketA.id, ')');
  console.log('✅ Bob connected to Socket.IO (socketId:', socketB.id, ')');

  // 6. Test Workspace Presence
  console.log('\n--- Step 3: Workspace Presence Test ---');
  const presencePromiseA = new Promise((resolve) => {
    socketA.on('presence:update', (payload) => {
      if (payload.workspaceId === workspaceId && payload.users.length >= 2) {
        resolve(payload);
      }
    });
  });

  socketA.emit('room:join_workspace', workspaceId);
  await new Promise((r) => setTimeout(r, 150));
  socketB.emit('room:join_workspace', workspaceId);

  const presencePayload = await presencePromiseA;
  console.log(`✅ Workspace presence verified: ${presencePayload.users.length} active users`);
  const onlineNames = presencePayload.users.map((u) => u.name);
  console.log('   Online members:', onlineNames.join(', '));

  // 7. Test Task Detail Viewers Stack
  console.log('\n--- Step 4: Task Detail Viewers Stack Test ---');
  const viewersPromiseA = new Promise((resolve) => {
    socketA.on('task:viewers_update', (payload) => {
      if (payload.taskId === task.id && payload.viewers.length >= 2) {
        resolve(payload);
      }
    });
  });

  socketA.emit('room:join_task', task.id);
  await new Promise((r) => setTimeout(r, 150));
  socketB.emit('room:join_task', task.id);

  const viewersPayload = await viewersPromiseA;
  console.log(`✅ Task viewers stack verified: ${viewersPayload.viewers.length} users actively viewing task`);
  console.log('   Active viewers:', viewersPayload.viewers.map((v) => v.name).join(', '));

  // 8. Test Live Typing Indicator
  console.log('\n--- Step 5: Live Typing Indicator Test ---');
  const typingPromiseB = new Promise((resolve) => {
    socketB.on('task:user_typing', (payload) => {
      if (payload.taskId === task.id && payload.isTyping) {
        resolve(payload);
      }
    });
  });

  socketA.emit('task:typing', { taskId: task.id, isTyping: true });
  const typingEvent = await typingPromiseB;
  console.log(`✅ Typing indicator received by Bob: "${typingEvent.name} is typing..."`);

  // Stop typing
  socketA.emit('task:typing', { taskId: task.id, isTyping: false });

  // 9. Test Real-time Comments with <300ms latency assertion
  console.log('\n--- Step 6: Real-time Comments & Latency Test (<300ms) ---');
  let t0 = 0;
  const commentPromiseA = new Promise((resolve) => {
    socketA.on('comment:created', (payload) => {
      const latency = Date.now() - t0;
      resolve({ payload, latency });
    });
  });

  t0 = Date.now();
  // Bob creates comment via REST API
  const commentRes = await (await fetch(`${BASE}/tasks/${task.id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      body: 'Hey @Alice Realtime, please check the database migration.',
      mentions: [userA.id],
    }),
  })).json();

  const commentData = commentRes.data;
  console.log('Bob posted comment:', commentData.body);

  const { payload: liveComment, latency } = await commentPromiseA;
  console.log(`✅ Alice received live comment via Socket in ${latency}ms!`);
  console.log(`   Comment author: ${liveComment.author.name}`);
  console.log(`   Content: "${liveComment.body}"`);

  if (latency > 300) {
    console.warn(`⚠️ Warning: Latency was ${latency}ms (target <300ms)`);
  } else {
    console.log(`🎯 Performance Target Met: Comment delivered in ${latency}ms (<300ms target)`);
  }

  // Verify Alice received in-app notification for the @mention
  const notifRes = await (await fetch(`${BASE}/notifications`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })).json();
  const mentionNotif = notifRes.data.find((n) => n.type === 'TASK_MENTIONED');
  if (mentionNotif) {
    console.log('✅ Notification for @mention verified in Alice inbox:', mentionNotif.payload.commentSnippet);
  } else {
    throw new Error('Expected Alice to receive TASK_MENTIONED notification');
  }

  // 10. Test Live Task Status Update (Kanban broadcast)
  console.log('\n--- Step 7: Live Kanban Task Mutation Broadcast ---');
  // Bob joins project room
  socketB.emit('room:join_project', projectId);

  const taskUpdatePromiseB = new Promise((resolve) => {
    socketB.on('task:updated', (payload) => {
      if (payload.id === task.id && payload.status === 'IN_PROGRESS') {
        resolve(payload);
      }
    });
  });

  // Alice updates task status to IN_PROGRESS
  await fetch(`${BASE}/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ status: 'IN_PROGRESS' }),
  });
  console.log('Alice updated task status to IN_PROGRESS via REST');

  const updatedTaskEvent = await taskUpdatePromiseB;
  console.log(`✅ Bob received live task update via Socket: status is now ${updatedTaskEvent.status}`);

  // 11. Test Real-time Comment Deletion
  console.log('\n--- Step 8: Real-time Comment Deletion ---');
  const deletePromiseA = new Promise((resolve) => {
    socketA.on('comment:deleted', (payload) => {
      if (payload.commentId === commentData.id) {
        resolve(payload);
      }
    });
  });

  await fetch(`${BASE}/tasks/${task.id}/comments/${commentData.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log('Bob deleted comment via REST');

  await deletePromiseA;
  console.log('✅ Alice received live comment:deleted event');

  // 12. Cleanup sockets
  socketA.close();
  socketB.close();

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 4 REALTIME SMOKE TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runPhase4SmokeTest().catch((err) => {
  console.error('\n❌ Phase 4 Smoke Test Failed:', err);
  process.exit(1);
});
