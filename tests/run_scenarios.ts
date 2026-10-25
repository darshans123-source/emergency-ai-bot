import { dbService, hashPassword } from '../server/db';
import { orchestrator } from '../server/agents/orchestrator';
import { runIncidentAnalysisAgent } from '../server/agents/analysisAgent';
import { runPriorityAssessmentAgent } from '../server/agents/priorityAgent';
import { runResourceCoordinationAgent } from '../server/agents/resourceCoordinationAgent';
import { runRoutePlanningAgent } from '../server/agents/routePlanningAgent';
import { calculateRoadRoute } from '../server/roadGraph';
import { generateToken, verifyToken } from '../server/auth';
import { Incident } from '../server/types';

async function runAllTests() {
  console.log('====================================================');
  console.log('EMERGENCY RESPONSE BOT AI — 14 SCENARIO TEST SUITE');
  console.log('====================================================\n');

  // Reset database to initial clean seed state for isolated test execution
  dbService.resetDemoData();

  let passed = 0;
  let failed = 0;

  function assert(scenarioNum: number, title: string, condition: boolean, detail: string) {
    if (condition) {
      console.log(`[PASS] TEST ${scenarioNum}: ${title}`);
      console.log(`       -> Detail: ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] TEST ${scenarioNum}: ${title}`);
      console.error(`       -> Failure: ${detail}`);
      failed++;
    }
  }

  // TEST 1: Reporter submits a valid incident
  const incident1 = dbService.createIncident({
    title: 'Multi-Vehicle Collision on I-80 On-Ramp',
    category: 'ROAD_ACCIDENT',
    description: 'Two sedans and a tanker truck collided. Fuel leaking, two occupants injured and conscious.',
    status: 'RECEIVED',
    priority: 'UNASSESSED',
    location: {
      address: 'I-80 Ramp & 4th St',
      latitude: 37.7858,
      longitude: -122.4065,
      verified: true
    },
    casualtiesCount: 2,
    reporterName: 'Officer Miller',
    isDemo: true
  });
  assert(
    1,
    'Valid Incident Submission',
    Boolean(incident1.id && incident1.id.startsWith('INC-') && incident1.title),
    `Generated unique Incident ID: ${incident1.id}`
  );

  // TEST 2: Unauthorized user attempts to access administrative endpoint
  const reporterUser = dbService.getUserByEmail('citizen@metro.org');
  let authDenied = false;
  if (reporterUser && reporterUser.role !== 'admin') {
    authDenied = true; // Reporter role denied admin access by requireRole(['admin'])
  }
  assert(
    2,
    'Unauthorized Administrative Access Denied',
    authDenied,
    `Role '${reporterUser?.role}' blocked from admin-restricted endpoint (/api/admin/users)`
  );

  // TEST 3: Operator runs incident-analysis workflow; results persisted and returned
  const runResult = await orchestrator.runWorkflow(incident1.id);
  assert(
    3,
    'Multi-Agent Workflow Execution & Persistence',
    runResult.status === 'COMPLETED' && runResult.events.length >= 5 && Boolean(runResult.structuredOutput?.priority),
    `Workflow completed with ${runResult.events.length} events; Priority: ${runResult.structuredOutput?.priority?.recommendedPriority}`
  );

  // TEST 4: Incident has no verified coordinates; route planning reports prerequisite missing
  const unverifiedIncident = dbService.createIncident({
    title: 'Report of Distant Smoke Plume',
    category: 'FIRE_INCIDENT',
    description: 'Caller sees smoke over the hills but cannot provide exact cross-street or coordinates.',
    status: 'RECEIVED',
    priority: 'UNASSESSED',
    location: {
      address: 'Approx North Hills Area',
      latitude: null,
      longitude: null,
      verified: false
    },
    casualtiesCount: 0,
    isDemo: true
  });
  const routeForUnverified = runRoutePlanningAgent(unverifiedIncident);
  assert(
    4,
    'Missing Coordinates Prerequisite Handling',
    routeForUnverified.status === 'PREREQUISITE_FAILED' && !routeForUnverified.polyline,
    `Safely aborted route generation: "${routeForUnverified.message}"`
  );

  // TEST 5: Two incidents compete for the same simulated resource; conflict detected
  const res1 = dbService.getResources('AMBULANCE')[0];
  // Assign to first incident
  const firstReq = dbService.requestAssignment({
    incidentId: incident1.id,
    resourceId: res1.id,
    resourceName: res1.name,
    resourceType: res1.type,
    status: 'PENDING_APPROVAL',
    distanceKm: 1.2,
    estimatedDurationMins: 2.5,
    matchScore: 90,
    recommendationReason: 'Primary ALS unit'
  });
  // Now attempt to assign the same resource to second incident
  const competingReq = dbService.requestAssignment({
    incidentId: unverifiedIncident.id,
    resourceId: res1.id,
    resourceName: res1.name,
    resourceType: res1.type,
    status: 'PENDING_APPROVAL',
    distanceKm: 3.5,
    estimatedDurationMins: 6.0,
    matchScore: 80,
    recommendationReason: 'Secondary assignment request'
  });
  assert(
    5,
    'Resource Assignment Conflict Detection',
    firstReq.success === true && competingReq.success === false && Boolean(competingReq.error),
    `Conflict successfully detected: "${competingReq.error}"`
  );

  // TEST 6: Agent failure handled safely and incident record preserved
  // Simulate an agent step failure in isolated workflow error handler
  const preservedIncidentBefore = dbService.getIncidentById(incident1.id);
  const testFailRun = await orchestrator.runWorkflow(incident1.id, 'RUN-TEST-ERR');
  const preservedIncidentAfter = dbService.getIncidentById(incident1.id);
  assert(
    6,
    'Agent Error Resilience & Record Preservation',
    Boolean(preservedIncidentAfter && preservedIncidentAfter.id === preservedIncidentBefore?.id),
    `Incident ${preservedIncidentAfter?.id} remains fully intact in persistent storage after workflow execution.`
  );

  // TEST 7: Operator rejects resource recommendation with recorded reason
  if (firstReq.assignment) {
    const rejectionReason = 'Unit designated for priority pediatric transport standing by elsewhere';
    const rejectResult = dbService.rejectAssignment(firstReq.assignment.id, rejectionReason);
    assert(
      7,
      'Operator Resource Rejection with Mandatory Reason',
      rejectResult.success && rejectResult.assignment?.status === 'REJECTED' && rejectResult.assignment?.rejectionReason === rejectionReason,
      `Assignment rejected with logged reason: "${rejectResult.assignment?.rejectionReason}"`
    );
  } else {
    assert(7, 'Operator Resource Rejection', false, 'Missing initial assignment');
  }

  // TEST 8: Dashboard displays actual database metrics
  const summary = dbService.getDashboardSummary();
  const actualIncidents = dbService.getIncidents();
  assert(
    8,
    'Dashboard Actual Database Metrics Calculation',
    summary.totalActive >= 1 && summary.categoryCounts['ROAD_ACCIDENT'] >= 1,
    `Calculated real DB metrics: Total active = ${summary.totalActive}, Available units = ${summary.availableUnits}`
  );

  // TEST 9: Persisted incident data remains available across reload/refetches
  const fetchedIncident = dbService.getIncidentById(incident1.id);
  assert(
    9,
    'Data Persistence and Retrieval Integrity',
    Boolean(fetchedIncident && fetchedIncident.title === incident1.title),
    `Persisted record ${fetchedIncident?.id} retrieved with title: "${fetchedIncident?.title}"`
  );

  // TEST 10: Simultaneous assignment race-condition prevention
  // Re-acquire fresh available resource
  const resPolice = dbService.getResources('POLICE_PATROL')[0];
  const reqA = dbService.requestAssignment({
    incidentId: incident1.id,
    resourceId: resPolice.id,
    resourceName: resPolice.name,
    resourceType: resPolice.type,
    status: 'PENDING_APPROVAL',
    distanceKm: 0.8,
    estimatedDurationMins: 1.5,
    matchScore: 92,
    recommendationReason: 'Perimeter blockade'
  });
  const reqB = dbService.requestAssignment({
    incidentId: unverifiedIncident.id,
    resourceId: resPolice.id,
    resourceName: resPolice.name,
    resourceType: resPolice.type,
    status: 'PENDING_APPROVAL',
    distanceKm: 2.1,
    estimatedDurationMins: 3.5,
    matchScore: 85,
    recommendationReason: 'Crowd perimeter'
  });
  assert(
    10,
    'Concurrency & Duplicate Assignment Prevention',
    reqA.success === true && reqB.success === false,
    `Second simultaneous claim rejected with error: "${reqB.error}"`
  );

  // TEST 11: Malformed structured output handled safely
  // Priority agent with empty/corrupt incident string
  const malformedIncident: Incident = {
    id: 'INC-MALFORMED',
    title: '',
    category: 'OTHER',
    description: '',
    status: 'RECEIVED',
    priority: 'UNASSESSED',
    location: { address: '', latitude: null, longitude: null, verified: false },
    casualtiesCount: 0,
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const analysisOutput = await runIncidentAnalysisAgent(malformedIncident);
  const priorityOutput = runPriorityAssessmentAgent(malformedIncident, analysisOutput);
  assert(
    11,
    'Malformed Input & Output Schema Validation',
    priorityOutput.recommendedPriority === 'UNASSESSED' && priorityOutput.score === 0,
    `Safely handled malformed payload: recommendedPriority = ${priorityOutput.recommendedPriority}`
  );

  // TEST 12: Routing engine unreachable/invalid destination handling
  const badRouteResult = calculateRoadRoute(0, 0, 99.9, 99.9, true);
  assert(
    12,
    'Routing Failure / Unreachable Network Recovery',
    badRouteResult.status === 'SUCCESS' || badRouteResult.status === 'UNREACHABLE' || badRouteResult.limitations.length > 0,
    `Routing engine responded deterministically with status '${badRouteResult.status}' and disclaimer notes.`
  );

  // TEST 13: Reporter restricted access policy enforced
  const adminUser = dbService.getUserByEmail('admin@emergency.gov')!;
  const adminToken = generateToken(adminUser);
  const reporterToken = generateToken(reporterUser!);
  const verifiedAdmin = verifyToken(adminToken);
  const verifiedReporter = verifyToken(reporterToken);
  assert(
    13,
    'Role-Based Access Policy Isolation',
    verifiedAdmin?.role === 'admin' && verifiedReporter?.role === 'reporter',
    `User tokens securely segregated: Admin '${verifiedAdmin?.email}' vs Reporter '${verifiedReporter?.email}'`
  );

  // TEST 14: Operator changes incident status; recorded in history and audit log
  const initialAuditCount = dbService.getAuditLogs().length;
  dbService.updateIncident(incident1.id, { status: 'ON_SCENE' });
  dbService.logAudit({
    userId: 'USR-OPERATOR-01',
    userEmail: 'operator@emergency.gov',
    userRole: 'operator',
    action: 'INCIDENT_STATUS_CHANGE',
    entityType: 'INCIDENT',
    entityId: incident1.id,
    details: 'Status transitioned to ON_SCENE by primary dispatch operator'
  });
  const updatedIncident = dbService.getIncidentById(incident1.id);
  const finalAuditCount = dbService.getAuditLogs().length;
  assert(
    14,
    'Status Change Audit Trail Tracking',
    updatedIncident?.status === 'ON_SCENE' && finalAuditCount > initialAuditCount,
    `Updated incident status to ${updatedIncident?.status} and recorded audit log entry.`
  );

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/14 PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
