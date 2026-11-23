// Phase 5 Smoke Test: Meetings, Transcription Pipeline, Action Items & Unified Calendar
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
  console.log('🚀 Starting Phase 5 Smoke Test (Meetings & Unified Calendar)...');

  const timestamp = Date.now();
  const email = `phase5-${timestamp}@example.com`;
  const password = 'Password123!';

  // 1. Register user
  console.log('1. Registering user...');
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'Phase 5 Lead' }),
  });
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  const token = regRes.data.data.accessToken;
  const user = regRes.data.data.user;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Create Workspace
  console.log('2. Creating workspace...');
  const wsRes = await request('/workspaces', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: `Phase 5 Workspace ${timestamp}` }),
  });
  if (!wsRes.ok) throw new Error(`Workspace creation failed: ${JSON.stringify(wsRes.data)}`);
  const workspaceId = wsRes.data.data.id;

  // 3. Create Project
  console.log('3. Creating project...');
  const projRes = await request(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Audio AI Sync', key: 'SYNC' }),
  });
  if (!projRes.ok) throw new Error(`Project creation failed: ${JSON.stringify(projRes.data)}`);
  const projectId = projRes.data.data.id;

  // 4. Create Meeting
  console.log('4. Creating meeting...');
  const startsAt = new Date(Date.now() + 3600 * 1000).toISOString();
  const endsAt = new Date(Date.now() + 7200 * 1000).toISOString();
  const meetingRes = await request(`/workspaces/${workspaceId}/meetings`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Sprint Planning & Audio Arch',
      description: 'Discussing audio transcription pipeline and real-time canvas',
      startsAt,
      endsAt,
      projectId,
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
    }),
  });
  if (!meetingRes.ok) throw new Error(`Meeting creation failed: ${JSON.stringify(meetingRes.data)}`);
  const meetingId = meetingRes.data.data.id;
  console.log(`   ✅ Meeting created: "${meetingRes.data.data.title}" (ID: ${meetingId})`);

  // 5. Test RSVP
  console.log('5. Updating RSVP...');
  const rsvpRes = await request(`/workspaces/${workspaceId}/meetings/${meetingId}/rsvp`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ rsvp: 'ACCEPTED' }),
  });
  if (!rsvpRes.ok) throw new Error(`RSVP failed: ${JSON.stringify(rsvpRes.data)}`);
  console.log('   ✅ RSVP marked as ACCEPTED');

  // 6. Test Transcription & Action Item Extraction Pipeline
  console.log('6. Triggering Transcription & AI Extraction pipeline...');
  const transcribeRes = await request(`/workspaces/${workspaceId}/meetings/${meetingId}/recording`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customText: 'Vishal will deploy Docker background workers and setup Redis by Friday. Sarah will test graph cycle detection.',
    }),
  });
  if (!transcribeRes.ok) throw new Error(`Transcription failed: ${JSON.stringify(transcribeRes.data)}`);
  const transcript = transcribeRes.data.data;
  console.log(`   ✅ Transcript status: ${transcript.status}`);
  console.log(`   ✅ Action items extracted: ${transcript.actionItems?.length || 0} items`);

  // 7. Convert Action Items to Tasks
  console.log('7. Converting action items to real tasks...');
  const convertRes = await request(`/workspaces/${workspaceId}/meetings/${meetingId}/transcript/convert-actions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          title: 'Deploy Docker background workers and setup Redis',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 86400 * 1000 * 3).toISOString(),
        },
      ],
    }),
  });
  if (!convertRes.ok) throw new Error(`Convert action items failed: ${JSON.stringify(convertRes.data)}`);
  const convertedTasks = convertRes.data.data;
  console.log(`   ✅ Created ${convertedTasks.length} task(s) from meeting action items (Key: ${convertedTasks[0]?.project?.key}-${convertedTasks[0]?.number})`);

  // 8. Test Unified Calendar Feed
  console.log('8. Fetching Unified Calendar Feed...');
  const calendarRes = await request(`/workspaces/${workspaceId}/calendar`, {
    method: 'GET',
    headers: authHeaders,
  });
  if (!calendarRes.ok) throw new Error(`Calendar feed failed: ${JSON.stringify(calendarRes.data)}`);
  const feed = calendarRes.data.data;
  console.log(`   ✅ Unified Calendar returned ${feed.length} entries:`);
  feed.forEach((item) => {
    console.log(`      - [${item.type}] ${item.title} (${item.startsAt})`);
  });

  // 9. Test Free/Busy Slot Detection
  console.log('9. Testing Free/Busy Slot Detection...');
  const todayStr = new Date().toISOString().split('T')[0];
  const freeBusyRes = await request(`/workspaces/${workspaceId}/calendar/free-busy?date=${todayStr}&duration=30`, {
    method: 'GET',
    headers: authHeaders,
  });
  if (!freeBusyRes.ok) throw new Error(`Free/Busy failed: ${JSON.stringify(freeBusyRes.data)}`);
  const freeBusy = freeBusyRes.data.data;
  console.log(`   ✅ Free/Busy calculation for ${todayStr}:`);
  console.log(`      - Busy blocks: ${freeBusy.busyCount}`);
  console.log(`      - Available free slots (30-min): ${freeBusy.availableSlots.length} slots available`);

  console.log('\n🎉 Phase 5 Backend Smoke Test PASSED COMPLETELY!\n');
}

run().catch((err) => {
  console.error('❌ Phase 5 Smoke Test FAILED:', err);
  process.exit(1);
});
