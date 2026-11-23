import { PrismaClient, WorkspaceRole, TaskStatus, TaskPriority, DependencyType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TeamOS enterprise database seed...');

  // 1. Clean previous seed data for fresh idempotent seeding
  console.log('1. Cleaning existing data...');
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

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Seed Users
  console.log('2. Seeding users...');
  const userDefs = [
    { name: 'Vishal Kumar', email: 'vishal@teamos.dev', role: WorkspaceRole.OWNER },
    { name: 'Sarah Chen', email: 'sarah.chen@teamos.dev', role: WorkspaceRole.ADMIN },
    { name: 'Alex Rivera', email: 'alex.rivera@teamos.dev', role: WorkspaceRole.ADMIN },
    { name: 'Elena Rostova', email: 'elena.rostova@teamos.dev', role: WorkspaceRole.MEMBER },
    { name: 'David Kim', email: 'david.kim@teamos.dev', role: WorkspaceRole.MEMBER },
    { name: 'Priya Sharma', email: 'priya.sharma@teamos.dev', role: WorkspaceRole.MEMBER },
    { name: 'Marcus Vance', email: 'marcus.vance@teamos.dev', role: WorkspaceRole.MEMBER },
    { name: 'Chloe Dubois', email: 'chloe.dubois@teamos.dev', role: WorkspaceRole.MEMBER },
    { name: 'Liam O’Connor', email: 'liam.oconnor@teamos.dev', role: WorkspaceRole.MEMBER },
    { name: 'Hana Tanaka', email: 'hana.tanaka@teamos.dev', role: WorkspaceRole.MEMBER },
  ];

  const createdUsers = [];
  for (const u of userDefs) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
      },
    });
    createdUsers.push({ ...user, targetRole: u.role });
  }
  const owner = createdUsers[0];

  // 3. Seed Primary Workspace
  console.log('3. Seeding Workspace...');
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Corp — Global Engineering',
      slug: 'acme-corp',
      ownerId: owner.id,
      members: {
        create: createdUsers.map((u) => ({
          userId: u.id,
          role: u.targetRole,
        })),
      },
    },
  });

  // 4. Seed Projects
  console.log('4. Seeding Projects...');
  const projectDefs = [
    { name: 'Core Engine & Microservices', key: 'CORE', description: 'PostgreSQL, Redis cluster, distributed event broker' },
    { name: 'Next-Gen Web Client', key: 'WEB', description: 'React 18 SPA, TanStack Query, Tailwind dark mode' },
    { name: 'Autonomous AI Operating System', key: 'AI', description: 'Multi-modal LLM reasoning, risk engine & approval loops' },
    { name: 'Cross-Platform Mobile App', key: 'MOB', description: 'React Native & offline-first SQLite sync engine' },
    { name: 'Kubernetes Cloud Platform', key: 'OPS', description: 'Terraform, Docker multi-stage builds, Prometheus monitoring' },
  ];

  const createdProjects = [];
  for (const p of projectDefs) {
    const proj = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: p.name,
        key: p.key,
        description: p.description,
        startDate: new Date(),
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });
    createdProjects.push(proj);
  }

  // 5. Seed Tasks with realistic workflow statuses
  console.log('5. Seeding Tasks & Dependencies...');
  const taskTitles = [
    'Design database schema for vector cosine indexing',
    'Configure Redis 7 cluster caching layer',
    'Implement JWT access & refresh token rotation with Redis blacklist',
    'Build real-time Socket.IO presence cluster with Redis adapter',
    'Implement Kahn topological sort for DAG cycle detection',
    'Calculate critical path duration using longest path dynamic programming',
    'Integrate Whisper API speech-to-text diarization pipeline',
    'Build Free/Busy interval intersection scheduler',
    'Implement PostgreSQL full-text search with ts_rank scoring',
    'Connect pgvector HNSW indexing for hybrid search',
    'Implement Reciprocal Rank Fusion (RRF) search merger',
    'Configure GitHub webhook PR auto-closing automation',
    'Create Human-in-the-Loop AI Action Approval cards',
    'Develop Overdue Chain and Assignee Overload risk detectors',
    'Setup Autocannon p95/p99 load testing harnesses',
    'Optimize Docker Compose multi-container production build',
    'Build TipTap markdown live preview document editor',
    'Implement optimistic UI mutations for live comments feed',
    'Add keyboard navigation (Cmd+K) global spotlight search palette',
    'Configure Helmet security headers and CORS whitelisting',
  ];

  const statuses: TaskStatus[] = ['DONE', 'IN_PROGRESS', 'IN_REVIEW', 'TODO', 'BACKLOG', 'BLOCKED'];
  const priorities: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

  const allCreatedTasks: any[] = [];

  for (const project of createdProjects) {
    let taskNumber = 1;
    for (const title of taskTitles) {
      const status = statuses[taskNumber % statuses.length];
      const priority = priorities[taskNumber % priorities.length];
      const assignee = createdUsers[taskNumber % createdUsers.length];
      const reporter = owner;
      const estimate = (taskNumber % 8) + 1; // 1 to 8 story points

      // Calculate realistic due date
      const daysOffset = (taskNumber % 14) - 4; // some overdue (-4..-1), some future
      const dueDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);

      const task = await prisma.task.create({
        data: {
          workspaceId: workspace.id,
          projectId: project.id,
          number: taskNumber++,
          title: `${title} (${project.key})`,
          description: `Detailed engineering specification and test cases for ${title}. Needs thorough code review and smoke test validation.`,
          status,
          priority,
          assigneeId: assignee.id,
          reporterId: reporter.id,
          estimate,
          dueDate,
          position: taskNumber * 1000,
        },
      });
      allCreatedTasks.push(task);
    }
  }

  // 6. Seed Directed Acyclic Graph (DAG) Dependencies
  console.log('6. Seeding Task Dependencies...');
  // For each project, create sequential and branching dependencies:
  // Task 2 depends on Task 1, Task 3 depends on Task 2, Task 5 depends on Task 3 & 4
  for (const project of createdProjects) {
    const projTasks = allCreatedTasks.filter((t) => t.projectId === project.id);
    if (projTasks.length >= 6) {
      await prisma.taskDependency.createMany({
        data: [
          { taskId: projTasks[1].id, dependsOnTaskId: projTasks[0].id, type: DependencyType.BLOCKS },
          { taskId: projTasks[2].id, dependsOnTaskId: projTasks[1].id, type: DependencyType.BLOCKS },
          { taskId: projTasks[4].id, dependsOnTaskId: projTasks[2].id, type: DependencyType.BLOCKS },
          { taskId: projTasks[4].id, dependsOnTaskId: projTasks[3].id, type: DependencyType.BLOCKS },
          { taskId: projTasks[5].id, dependsOnTaskId: projTasks[4].id, type: DependencyType.BLOCKS },
        ],
        skipDuplicates: true,
      });
    }
  }

  // 7. Seed Team Meetings & Transcripts
  console.log('7. Seeding Meetings & Transcripts...');
  const meeting = await prisma.meeting.create({
    data: {
      workspaceId: workspace.id,
      organizerId: owner.id,
      projectId: createdProjects[0].id,
      title: 'Q4 Architecture Sync & AI Operating System Roadmap',
      description: 'Reviewing real-time socket cluster, vector search indexing, and autonomous risk detection.',
      startsAt: new Date(Date.now() + 2 * 3600 * 1000),
      endsAt: new Date(Date.now() + 3 * 3600 * 1000),
      meetingUrl: 'https://meet.google.com/teamos-sync',
      participants: {
        create: createdUsers.slice(0, 5).map((u) => ({
          userId: u.id,
          rsvp: 'ACCEPTED',
        })),
      },
      transcript: {
        create: {
          rawText: 'Vishal: We have pushed Phase 1 through Phase 7 into production. Sarah: The dependency graph canvas and critical path calculations are verified.',
          summary: 'Team reviewed the entire TeamOS stack. All 8 phases are operational with sub-second response times.',
          actionItems: [
            { title: 'Deploy Docker Compose cluster with persistent volumes', assigneeName: 'Vishal Kumar', suggestedPriority: 'HIGH' },
            { title: 'Validate Reciprocal Rank Fusion query benchmarks', assigneeName: 'Sarah Chen', suggestedPriority: 'MEDIUM' },
          ],
          status: 'COMPLETED',
          segments: {
            create: [
              { startMs: 0, endMs: 15000, speakerName: 'Vishal Kumar', text: 'Welcome team. All core architectural phases are completed and verified.' },
              { startMs: 16000, endMs: 32000, speakerName: 'Sarah Chen', text: 'The dependency graph canvas renders smoothly with automatic cycle detection.' },
            ],
          },
        },
      },
    },
  });

  // 8. Seed Architecture Docs
  console.log('8. Seeding Documentation...');
  await prisma.doc.createMany({
    data: [
      {
        workspaceId: workspace.id,
        authorId: owner.id,
        projectId: createdProjects[0].id,
        title: 'TeamOS System Architecture & Design Blueprint',
        content: '# TeamOS System Architecture\n\n## 1. Overview\nTeamOS is an enterprise AI Operating System for teams, integrating project management with autonomous risk intelligence.',
      },
      {
        workspaceId: workspace.id,
        authorId: createdUsers[1].id,
        projectId: createdProjects[2].id,
        title: 'Hybrid Search: PostgreSQL FTS + pgvector with RRF',
        content: '# Hybrid Search Engine\n\nCombines keyword full-text indexing and pgvector embeddings using reciprocal rank fusion.',
      },
    ],
  });

  // 9. Seed Git Activity
  console.log('9. Seeding Git Activities...');
  await prisma.gitActivity.createMany({
    data: [
      {
        workspaceId: workspace.id,
        projectId: createdProjects[0].id,
        repo: 'vishalkumar2501/AI-Operating-System-for-Teams',
        type: 'PR',
        externalId: '#101',
        title: 'feat(cpm): implement Kahn algorithm and longest path dynamic programming',
        author: 'vishalkumar2501',
        url: 'https://github.com/vishalkumar2501/AI-Operating-System-for-Teams/pull/101',
        state: 'merged',
      },
      {
        workspaceId: workspace.id,
        projectId: createdProjects[1].id,
        repo: 'vishalkumar2501/AI-Operating-System-for-Teams',
        type: 'COMMIT',
        externalId: 'f9e8d7c',
        title: 'feat(search): add reciprocal rank fusion hybrid scoring',
        author: 'vishalkumar2501',
        url: 'https://github.com/vishalkumar2501/AI-Operating-System-for-Teams/commit/f9e8d7c',
        state: 'pushed',
      },
    ],
  });

  console.log('\n✅ TeamOS Database Seeding COMPLETED SUCCESSFULLY!');
  console.log(`   - 1 Workspace: "${workspace.name}" (${workspace.slug})`);
  console.log(`   - ${createdUsers.length} Users (Default password: "password123")`);
  console.log(`   - ${createdProjects.length} Projects`);
  console.log(`   - ${allCreatedTasks.length} Tasks with CPM DAG dependencies`);
  console.log(`   - 1 Meeting with full AI Audio transcript & action items`);
  console.log(`   - 2 Engineering Architecture Documents`);
  console.log(`   - 2 Git Activities\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
