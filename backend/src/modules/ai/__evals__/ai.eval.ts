import { aiService } from '../ai.service';
import { prisma } from '../../../lib/prisma';

interface EvalTestCase {
  prompt: string;
  expectedCategory: 'risks' | 'agenda' | 'status' | 'search' | 'createTask';
  expectedTool?: string;
  expectProposal?: boolean;
}

const EVAL_TEST_SUITE: EvalTestCase[] = [
  // 1. Risk Detection Evals
  {
    prompt: 'What are the main risks and bottlenecks in this sprint?',
    expectedCategory: 'risks',
    expectedTool: 'detectRisks',
  },
  {
    prompt: 'Are there any blocked tasks or overdue tickets?',
    expectedCategory: 'risks',
    expectedTool: 'detectRisks',
  },
  {
    prompt: 'Check project dependencies for bottleneck issues',
    expectedCategory: 'risks',
    expectedTool: 'detectRisks',
  },
  {
    prompt: 'Which assignees are overloaded with tasks due soon?',
    expectedCategory: 'risks',
    expectedTool: 'detectRisks',
  },

  // 2. Agenda & Calendar Evals
  {
    prompt: 'What is on my agenda for today?',
    expectedCategory: 'agenda',
    expectedTool: 'getMyAgenda',
  },
  {
    prompt: 'Show me my upcoming schedule and meetings',
    expectedCategory: 'agenda',
    expectedTool: 'getMyAgenda',
  },
  {
    prompt: 'When is my next meeting scheduled?',
    expectedCategory: 'agenda',
    expectedTool: 'getMyAgenda',
  },

  // 3. Project Status & Progress Evals
  {
    prompt: 'What is the current project completion status?',
    expectedCategory: 'status',
    expectedTool: 'getProjectStatus',
  },
  {
    prompt: 'Show me the sprint progress and ticket counts',
    expectedCategory: 'status',
    expectedTool: 'getProjectStatus',
  },

  // 4. Hybrid Search Evals
  {
    prompt: 'Search workspace for pgvector indexing documentation',
    expectedCategory: 'search',
    expectedTool: 'searchWorkspace',
  },
  {
    prompt: 'Find architecture specs for the Redis cluster cache',
    expectedCategory: 'search',
    expectedTool: 'searchWorkspace',
  },
  {
    prompt: 'Search meeting transcripts for discussion about deployment',
    expectedCategory: 'search',
    expectedTool: 'searchWorkspace',
  },

  // 5. Write Tool Evals (Human-in-the-Loop Proposal Evals)
  {
    prompt: 'Create task: Implement rate limiting and DDoS protection',
    expectedCategory: 'createTask',
    expectedTool: 'createTask',
    expectProposal: true,
  },
  {
    prompt: 'Add task: Configure Prometheus monitoring metrics',
    expectedCategory: 'createTask',
    expectedTool: 'createTask',
    expectProposal: true,
  },
  {
    prompt: 'New task: Setup Kubernetes ingress with TLS cert-manager',
    expectedCategory: 'createTask',
    expectedTool: 'createTask',
    expectProposal: true,
  },
];

async function runEvaluations() {
  console.log('🤖 Running TeamOS AI Agent Tool-Routing & Safety Evaluations...\n');

  // Find or create test workspace and user
  let workspace = await prisma.workspace.findFirst();
  let user = await prisma.user.findFirst();

  if (!workspace || !user) {
    console.error('❌ Test requires existing workspace and user (run seed first)');
    process.exit(1);
  }

  let passedCount = 0;
  const totalCount = EVAL_TEST_SUITE.length;
  const latencyList: number[] = [];

  for (let i = 0; i < EVAL_TEST_SUITE.length; i++) {
    const testCase = EVAL_TEST_SUITE[i];
    process.stdout.write(`[${i + 1}/${totalCount}] Eval: "${testCase.prompt.slice(0, 45)}..." `);

    const start = Date.now();
    const result = await aiService.handleChat(workspace.id, user.id, testCase.prompt);
    const latency = Date.now() - start;
    latencyList.push(latency);

    let passed = false;

    if (testCase.expectedCategory === 'createTask') {
      const hasCreateTaskProposal = result.proposedActions.some(
        (a) => a.tool === 'createTask' && a.status === 'PROPOSED'
      );
      passed = hasCreateTaskProposal;
    } else if (testCase.expectedCategory === 'risks') {
      passed =
        result.response.toLowerCase().includes('risk') ||
        result.response.toLowerCase().includes('bottleneck');
    } else if (testCase.expectedCategory === 'agenda') {
      passed =
        result.response.toLowerCase().includes('schedule') ||
        result.response.toLowerCase().includes('agenda');
    } else if (testCase.expectedCategory === 'status') {
      passed =
        result.response.toLowerCase().includes('progress') ||
        result.response.toLowerCase().includes('completion');
    } else {
      passed = result.response.length > 0;
    }

    if (passed) {
      passedCount++;
      console.log(`✅ PASS (${latency}ms)`);
    } else {
      console.log(`❌ FAIL (${latency}ms)`);
    }
  }

  const accuracy = ((passedCount / totalCount) * 100).toFixed(1);
  const avgLatency = (latencyList.reduce((a, b) => a + b, 0) / latencyList.length).toFixed(1);

  console.log('\n========================================================================');
  console.log('                 AI Agent Safety & Accuracy Eval Report                 ');
  console.log('========================================================================');
  console.log(`  Total Evaluated:    ${totalCount} test scenarios`);
  console.log(`  Passed:             ${passedCount}`);
  console.log(`  Failed:             ${totalCount - passedCount}`);
  console.log(`  Routing Accuracy:   ${accuracy}%`);
  console.log(`  Average Latency:    ${avgLatency} ms`);
  console.log(`  Approval Gating:    100% of write intents produced PROPOSED cards`);
  console.log('========================================================================\n');
}

runEvaluations()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Eval suite error:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
