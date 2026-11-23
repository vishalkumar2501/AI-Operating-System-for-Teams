import { PrismaClient, WorkspaceRole, TaskStatus, TaskPriority, DependencyType, ActorType, MeetingStatus, TranscriptStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

// Helper to chunk arrays for bulk operations
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const ACTION_VERBS = [
  'Implement', 'Refactor', 'Optimize', 'Fix race condition in', 'Add integration tests for',
  'Migrate schema for', 'Add Prometheus metrics to', 'Benchmark', 'Upgrade dependencies for',
  'Add RBAC guard to', 'Configure SSL termination for', 'Deploy canary release of',
  'Implement distributed lock for', 'Profile memory allocation in', 'Add retry policy to'
];

const SYSTEM_COMPONENTS = [
  'Redis cluster failover', 'pgvector hybrid search scan', 'WebSocket heartbeat daemon',
  'DAG cycle detector', 'JWT refresh token rotation', 'audio diarization pipeline',
  'TanStack query cache invalidation', 'CPM critical path engine', 'distributed rate limiter',
  'GitHub webhook signature validator', 'Kanban drag-and-drop state machine',
  'BullMQ job concurrency broker', 'Elastic vector index shard', 'Audit log immutability ledger'
];

const COMMENT_TEMPLATES = [
  'Validated fix against staging environment. Latency dropped by 42% under load.',
  'Identified bottleneck during profiling: connection pool saturation on high concurrency.',
  'Approved PR. Make sure to run database migrations before deploying worker services.',
  'Blocked by upstream microservice deployment. ETA 2 hours.',
  'Reproduced edge case on Windows environment. Root cause was CRLF line ending in parser.',
  'Refactored to Kahn topological sort algorithm; time complexity reduced to O(V + E).',
  'Critical path analysis indicates this task cannot be delayed without impacting target release.',
  'Merged hotfix and tagged release v2.4.1.'
];

async function main() {
  const startTime = Date.now();
  console.log('🚀 Starting TeamOS Enterprise Scale Database Seeding (>100,000 objects)...');

  // 0. Clean database for fresh, idempotent large seed
  console.log('0. Cleaning existing records for clean benchmark seeding...');
  await prisma.auditLog.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.transcriptSegment.deleteMany({});
  await prisma.transcript.deleteMany({});
  await prisma.meetingParticipant.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.gitActivity.deleteMany({});
  await prisma.doc.deleteMany({});
  await prisma.embedding.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.taskDependency.deleteMany({});
  await prisma.taskSubscriber.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.invite.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('   ✓ Database cleared.');

  // 1. Password Hash (calculated once for 200 users)
  console.log('1. Generating shared password hash for enterprise users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Workspaces & Users Setup
  console.log('2. Generating 200 users & 5 enterprise workspaces...');
  const workspaceDefs = [
    { name: 'Acme Corp — Global Engineering', slug: 'acme-corp' },
    { name: 'Stripe — Core Infrastructure', slug: 'stripe-infra' },
    { name: 'Netflix — Streaming Platform', slug: 'netflix-platform' },
    { name: 'Vercel — Edge Network & Cloud', slug: 'vercel-edge' },
    { name: 'OpenAI — Autonomous Systems', slug: 'openai-autonomous' },
  ];

  const firstNames = ['Vishal', 'Sarah', 'Alex', 'Elena', 'David', 'Priya', 'Marcus', 'Chloe', 'Liam', 'Hana', 'Carlos', 'Fatima', 'Dmitry', 'Aoi', 'Mateo', 'Zoe', 'Lucas', 'Maya', 'Nia', 'Kenji'];
  const lastNames = ['Kumar', 'Chen', 'Rivera', 'Rostova', 'Kim', 'Sharma', 'Vance', 'Dubois', 'O’Connor', 'Tanaka', 'Silva', 'Al-Mansoor', 'Ivanov', 'Sato', 'Morales', 'Zhang', 'Müller', 'Patel', 'Nkosi', 'Takahashi'];

  const userRecords: { id: string; name: string; email: string; passwordHash: string }[] = [];
  for (let i = 1; i <= 200; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    userRecords.push({
      id: crypto.randomUUID(),
      name: `${fn} ${ln}`,
      email: i === 1 ? 'vishal@teamos.dev' : `engineer.${i}@teamos.dev`,
      passwordHash,
    });
  }

  // Create Users in batches
  for (const chunk of chunkArray(userRecords, 50)) {
    await prisma.user.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Seeded ${userRecords.length} users.`);

  // Create Workspaces
  const createdWorkspaces: { id: string; name: string; slug: string }[] = [];
  for (let i = 0; i < workspaceDefs.length; i++) {
    const def = workspaceDefs[i];
    const ws = await prisma.workspace.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        id: crypto.randomUUID(),
        name: def.name,
        slug: def.slug,
        ownerId: userRecords[i].id,
      },
    });
    createdWorkspaces.push(ws);
  }
  console.log(`   ✓ Seeded ${createdWorkspaces.length} workspaces.`);

  // Create Workspace Memberships
  const memberRecords: { id: string; workspaceId: string; userId: string; role: WorkspaceRole }[] = [];
  for (const ws of createdWorkspaces) {
    for (let uIdx = 0; uIdx < userRecords.length; uIdx++) {
      const u = userRecords[uIdx];
      const role = uIdx === 0 ? WorkspaceRole.OWNER : (uIdx < 5 ? WorkspaceRole.ADMIN : WorkspaceRole.MEMBER);
      memberRecords.push({
        id: crypto.randomUUID(),
        workspaceId: ws.id,
        userId: u.id,
        role,
      });
    }
  }
  for (const chunk of chunkArray(memberRecords, 200)) {
    await prisma.workspaceMember.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Seeded ${memberRecords.length} workspace memberships.`);

  // 3. Projects (50 total, 10 per workspace)
  console.log('3. Seeding 50 enterprise engineering projects...');
  const projectKeys = ['CORE', 'WEB', 'AI', 'MOB', 'OPS', 'DATA', 'SEC', 'API', 'EDGE', 'DIST'];
  const projectRecords: { id: string; workspaceId: string; name: string; key: string; description: string; startDate: Date; targetDate: Date }[] = [];

  for (let wsIdx = 0; wsIdx < createdWorkspaces.length; wsIdx++) {
    const ws = createdWorkspaces[wsIdx];
    const prefix = ['ACM', 'STP', 'NFL', 'VCL', 'OAI'][wsIdx];
    for (let pIdx = 0; pIdx < 10; pIdx++) {
      const pKey = `${prefix}${pIdx + 1}`;
      projectRecords.push({
        id: crypto.randomUUID(),
        workspaceId: ws.id,
        name: `${ws.name.split(' ')[0]} ${projectKeys[pIdx]} System`,
        key: pKey,
        description: `Mission-critical ${projectKeys[pIdx]} platform architecture and services for ${ws.name}`,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
    }
  }

  for (const chunk of chunkArray(projectRecords, 50)) {
    await prisma.project.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Seeded ${projectRecords.length} projects.`);

  // 4. Tasks (40,000 tasks: 800 per project across 50 projects)
  console.log('4. Generating ~40,000 engineering tasks across projects...');
  const taskRecords: {
    id: string;
    workspaceId: string;
    projectId: string;
    number: number;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    reporterId: string;
    estimate: number;
    position: number;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  const statuses = [
    TaskStatus.DONE, TaskStatus.DONE, TaskStatus.DONE,
    TaskStatus.IN_PROGRESS, TaskStatus.IN_PROGRESS,
    TaskStatus.TODO, TaskStatus.TODO,
    TaskStatus.BACKLOG,
    TaskStatus.BLOCKED
  ];
  const priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT];

  const TASKS_PER_PROJECT = 800;
  for (const proj of projectRecords) {
    for (let num = 1; num <= TASKS_PER_PROJECT; num++) {
      const verb = ACTION_VERBS[(num + proj.key.charCodeAt(0)) % ACTION_VERBS.length];
      const comp = SYSTEM_COMPONENTS[(num * 7) % SYSTEM_COMPONENTS.length];
      const status = statuses[num % statuses.length];
      const priority = priorities[num % priorities.length];
      const assignee = userRecords[(num * 13) % userRecords.length];
      const reporter = userRecords[(num * 17) % userRecords.length];

      taskRecords.push({
        id: crypto.randomUUID(),
        workspaceId: proj.workspaceId,
        projectId: proj.id,
        number: num,
        title: `${verb} ${comp} [${proj.key}-${num}]`,
        description: `Automated enterprise requirement for ${comp}. Performance SLA target < 50ms at p99.`,
        status,
        priority,
        assigneeId: assignee.id,
        reporterId: reporter.id,
        estimate: (num % 8) + 1,
        position: num * 1000,
        createdAt: new Date(Date.now() - (800 - num) * 60 * 60 * 1000),
        updatedAt: new Date(),
      });
    }
  }

  console.log(`   Bulk inserting ${taskRecords.length} tasks in chunks of 1,000...`);
  const taskChunks = chunkArray(taskRecords, 1000);
  let taskCount = 0;
  for (const chunk of taskChunks) {
    await prisma.task.createMany({ data: chunk, skipDuplicates: true });
    taskCount += chunk.length;
    if (taskCount % 10000 === 0) {
      console.log(`   ... inserted ${taskCount} / ${taskRecords.length} tasks`);
    }
  }
  console.log(`   ✓ Successfully seeded ${taskRecords.length} tasks.`);

  // 5. Task Dependencies (~10,000 DAG edges, strictly acyclic)
  console.log('5. Generating ~10,000 DAG dependencies (guaranteed cycle-free)...');
  const dependencyRecords: { id: string; taskId: string; dependsOnTaskId: string; type: DependencyType }[] = [];

  // Group tasks by project
  const tasksByProject = new Map<string, typeof taskRecords>();
  for (const t of taskRecords) {
    let list = tasksByProject.get(t.projectId);
    if (!list) {
      list = [];
      tasksByProject.set(t.projectId, list);
    }
    list.push(t);
  }

  for (const pTasks of tasksByProject.values()) {
    // In each project with 800 tasks, create 200 dependency pairs where task[j] depends on task[i] (i < j)
    for (let j = 4; j < pTasks.length; j += 4) {
      const dependentTask = pTasks[j];
      const prerequisiteTask = pTasks[j - 2];
      dependencyRecords.push({
        id: crypto.randomUUID(),
        taskId: dependentTask.id,
        dependsOnTaskId: prerequisiteTask.id,
        type: DependencyType.BLOCKS,
      });
    }
  }

  console.log(`   Bulk inserting ${dependencyRecords.length} dependencies...`);
  for (const chunk of chunkArray(dependencyRecords, 1000)) {
    await prisma.taskDependency.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Seeded ${dependencyRecords.length} DAG dependency edges.`);

  // 6. Comments (~40,000 comments attached to tasks)
  console.log('6. Generating ~40,000 comments across tasks...');
  const commentRecords: { id: string; taskId: string; authorId: string; body: string; mentions: string[]; createdAt: Date; updatedAt: Date }[] = [];

  for (let i = 0; i < taskRecords.length; i++) {
    const task = taskRecords[i];
    const author = userRecords[(i * 11) % userRecords.length];
    const body = COMMENT_TEMPLATES[i % COMMENT_TEMPLATES.length];

    commentRecords.push({
      id: crypto.randomUUID(),
      taskId: task.id,
      authorId: author.id,
      body: `[#${task.number}] ${body}`,
      mentions: [],
      createdAt: new Date(task.createdAt.getTime() + 15 * 60 * 1000),
      updatedAt: new Date(),
    });
  }

  console.log(`   Bulk inserting ${commentRecords.length} comments...`);
  let commentCount = 0;
  for (const chunk of chunkArray(commentRecords, 1000)) {
    await prisma.comment.createMany({ data: chunk, skipDuplicates: true });
    commentCount += chunk.length;
    if (commentCount % 10000 === 0) {
      console.log(`   ... inserted ${commentCount} / ${commentRecords.length} comments`);
    }
  }
  console.log(`   ✓ Seeded ${commentRecords.length} comments.`);

  // 7. Docs (500 architecture & spec docs)
  console.log('7. Seeding 500 architecture & specification docs...');
  const docRecords: { id: string; workspaceId: string; projectId: string; title: string; content: string; authorId: string; createdAt: Date; updatedAt: Date }[] = [];

  for (let i = 0; i < 500; i++) {
    const proj = projectRecords[i % projectRecords.length];
    const author = userRecords[(i * 7) % userRecords.length];
    docRecords.push({
      id: crypto.randomUUID(),
      workspaceId: proj.workspaceId,
      projectId: proj.id,
      title: `${proj.name} — Architecture RFC #${i + 101}`,
      content: `# System Design Document #${i + 101}\n\n## Overview\nHigh-throughput distributed architecture specification for ${proj.name}.\n\n## SLAs\n- P99 latency: < 50ms\n- Availability: 99.99%\n- Recovery Point Objective (RPO): 0 seconds`,
      authorId: author.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  for (const chunk of chunkArray(docRecords, 200)) {
    await prisma.doc.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Seeded ${docRecords.length} docs.`);

  // 8. Meetings, Transcripts & Segments (~10,000 chunks)
  console.log('8. Seeding 100 meetings and ~9,500 transcript segments...');
  const meetingRecords: { id: string; workspaceId: string; projectId: string; title: string; organizerId: string; startsAt: Date; endsAt: Date; status: MeetingStatus }[] = [];
  const transcriptRecords: { id: string; meetingId: string; rawText: string; summary: string; status: TranscriptStatus }[] = [];
  const segmentRecords: { id: string; transcriptId: string; speakerName: string; speakerId: string; startMs: number; endMs: number; text: string }[] = [];

  for (let m = 0; m < 100; m++) {
    const proj = projectRecords[m % projectRecords.length];
    const organizer = userRecords[m % userRecords.length];
    const meetingId = crypto.randomUUID();
    const transcriptId = crypto.randomUUID();

    meetingRecords.push({
      id: meetingId,
      workspaceId: proj.workspaceId,
      projectId: proj.id,
      title: `${proj.key} Sprint Retrospective & Architecture Sync #${m + 1}`,
      organizerId: organizer.id,
      startsAt: new Date(Date.now() - (100 - m) * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - (100 - m) * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      status: MeetingStatus.COMPLETED,
    });

    transcriptRecords.push({
      id: transcriptId,
      meetingId,
      rawText: 'Sprint sync discussion regarding distributed latency, dependency graphs, and automated AI task triage.',
      summary: 'Team achieved target throughput. Action items assigned for Redis cluster failover tuning.',
      status: TranscriptStatus.COMPLETED,
    });

    // 95 segments per meeting (100 * 95 = 9,500 segments)
    for (let s = 0; s < 95; s++) {
      const speaker = userRecords[(m + s) % userRecords.length];
      segmentRecords.push({
        id: crypto.randomUUID(),
        transcriptId,
        speakerName: speaker.name,
        speakerId: speaker.id,
        startMs: s * 15000,
        endMs: (s + 1) * 15000,
        text: `Segment ${s + 1}: Discussing deployment milestone, dependency cycle checks, and real-time event propagation for ${proj.key}.`,
      });
    }
  }

  for (const chunk of chunkArray(meetingRecords, 100)) {
    await prisma.meeting.createMany({ data: chunk, skipDuplicates: true });
  }
  for (const chunk of chunkArray(transcriptRecords, 100)) {
    await prisma.transcript.createMany({ data: chunk, skipDuplicates: true });
  }
  for (const chunk of chunkArray(segmentRecords, 1000)) {
    await prisma.transcriptSegment.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Seeded ${meetingRecords.length} meetings, transcripts, and ${segmentRecords.length} transcript segments.`);

  // 9. Audit Logs (~12,000 logs)
  console.log('9. Seeding ~12,000 enterprise audit logs...');
  const auditLogRecords: { id: string; workspaceId: string; actorType: ActorType; actorId: string; action: string; entityType: string; entityId: string; createdAt: Date }[] = [];

  const actions = ['TASK_CREATED', 'TASK_STATUS_UPDATED', 'DEPENDENCY_ADDED', 'AI_ACTION_APPROVED', 'DOC_PUBLISHED'];
  for (let a = 0; a < 12000; a++) {
    const ws = createdWorkspaces[a % createdWorkspaces.length];
    const user = userRecords[a % userRecords.length];
    const task = taskRecords[a % taskRecords.length];
    auditLogRecords.push({
      id: crypto.randomUUID(),
      workspaceId: ws.id,
      actorType: a % 5 === 0 ? ActorType.AI_AGENT : ActorType.USER,
      actorId: user.id,
      action: actions[a % actions.length],
      entityType: 'TASK',
      entityId: task.id,
      createdAt: new Date(Date.now() - a * 60 * 1000),
    });
  }

  for (const chunk of chunkArray(auditLogRecords, 1000)) {
    await prisma.auditLog.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Seeded ${auditLogRecords.length} audit logs.`);

  // 10. Search Embeddings (~10,000 items)
  console.log('10. Seeding ~10,000 vector embeddings for hybrid search...');
  const embeddingRecords: { id: string; workspaceId: string; entityType: string; entityId: string; chunkIndex: number; content: string }[] = [];

  for (let e = 0; e < 10000; e++) {
    const task = taskRecords[e];
    embeddingRecords.push({
      id: crypto.randomUUID(),
      workspaceId: task.workspaceId,
      entityType: 'TASK',
      entityId: task.id,
      chunkIndex: 0,
      content: `${task.title} - ${task.description}`,
    });
  }

  for (const chunk of chunkArray(embeddingRecords, 1000)) {
    await prisma.embedding.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Seeded ${embeddingRecords.length} search embeddings.`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalObjects = userRecords.length + createdWorkspaces.length + memberRecords.length +
    projectRecords.length + taskRecords.length + dependencyRecords.length + commentRecords.length +
    docRecords.length + meetingRecords.length + transcriptRecords.length + segmentRecords.length +
    auditLogRecords.length + embeddingRecords.length;

  console.log('\n============================================================');
  console.log(`🎉 Enterprise Large Seed Complete in ${durationSec}s!`);
  console.log(`📊 Total Seeded Database Objects: ${totalObjects.toLocaleString()}`);
  console.log('   - Users:              200');
  console.log('   - Workspaces:         5');
  console.log('   - Memberships:        1,000');
  console.log('   - Projects:           50');
  console.log('   - Tasks:              40,000');
  console.log('   - DAG Dependencies:   10,000 (Acyclic)');
  console.log('   - Comments:           40,000');
  console.log('   - Docs:               500');
  console.log('   - Meetings:           100');
  console.log('   - Transcripts:        100');
  console.log('   - Transcript Segs:    9,500');
  console.log('   - Audit Logs:         12,000');
  console.log('   - Embeddings:         10,000');
  console.log('============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during large enterprise seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
