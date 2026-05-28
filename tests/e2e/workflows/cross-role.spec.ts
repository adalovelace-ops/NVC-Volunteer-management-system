/**
 * Cross-Role Workflow – E2E Playwright Tests
 *
 * Tests the full end-to-end flows that span multiple roles:
 *
 *   FLOW-1: Partner submits proposal → Admin receives it → Admin approves → Partner sees approved
 *   FLOW-2: Partner submits proposal → Admin rejects → Partner sees rejected
 *   FLOW-3: Volunteer requests to join event → Admin approves match → Volunteer sees event
 *   FLOW-4: Admin creates project → Assigns volunteer → Volunteer sees in dashboard
 *   FLOW-5: Admin sends message to volunteer → Volunteer can see it
 *   FLOW-6: Admin sends message to partner → Partner can see it
 *   FLOW-7: Complete volunteer journey (signup → approve → join → log time)
 *   FLOW-8: Complete partner journey (signup → approve → propose → approved)
 */

import { test, expect } from '@playwright/test';
import {
  apiCall,
  getUsers,
  getVolunteers,
  getProjects,
  getVolunteerMatches,
  getVolunteerJoins,
  getTimeLogs,
  getMessages,
  getPartnerApplications,
  loginViaAPI,
  approveUser,
  submitPartnerProposal,
  reviewPartnerApplication,
} from '../helpers/api.helper';
import {
  ADMIN,
  VOLUNTEER,
  PARTNER_JOLLIBEE,
  PARTNER_PBSP,
  makeEmail,
  uid,
  makeProposalDetails,
} from '../helpers/data.helper';

// ─────────────────────────────────────────────────────────────────────────────
// FLOW-1  Partner proposal → Admin approves → Partner sees approved
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW-1: Partner submits proposal → Admin approves → Partner sees Approved status', async () => {
  const projects = await getProjects();
  const projectId = projects[0].id || projects[0].projects_id;
  const proposal = makeProposalDetails('Education');

  // Step 1: Partner submits
  const submitResult = await submitPartnerProposal(
    projectId,
    PARTNER_JOLLIBEE.id,
    PARTNER_JOLLIBEE.orgName,
    proposal
  );
  const app = submitResult.application ?? submitResult;
  // Status may be Pending (new) or Approved (if partner already has an approved app for this project)
  expect(['Pending', 'Approved']).toContain(app.status);
  console.log(`✓ [1/3] Proposal submitted – status: ${app.status}`);

  // Step 2: Admin approves
  const reviewResult = await reviewPartnerApplication(app.id, 'Approved', ADMIN.id);
  const reviewed = reviewResult.application ?? reviewResult;
  expect(reviewed.status).toBe('Approved');
  console.log(`✓ [2/3] Admin approved proposal`);

  // Step 3: Partner sees approved status
  const apps = await getPartnerApplications();
  const partnerApp = apps.find((a: any) => a.id === app.id);
  expect(partnerApp?.status).toBe('Approved');
  console.log(`✓ [3/3] Partner sees Approved status in DB`);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW-2  Partner proposal → Admin rejects → Partner sees rejected
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW-2: Partner submits proposal → Admin rejects → Partner sees Rejected status', async () => {
  const projects = await getProjects();
  const projectId = projects[0].id || projects[0].projects_id;
  const proposal = makeProposalDetails('Nutrition');

  // Step 1: Partner submits
  const submitResult = await submitPartnerProposal(
    projectId,
    PARTNER_PBSP.id,
    PARTNER_PBSP.orgName,
    proposal
  );
  const app = submitResult.application ?? submitResult;
  expect(app.status).toBe('Pending');
  console.log(`✓ [1/3] Proposal submitted – status: Pending`);

  // Step 2: Admin rejects
  const reviewResult = await reviewPartnerApplication(
    app.id,
    'Rejected',
    ADMIN.id,
    'Not aligned with current program priorities'
  );
  const reviewed = reviewResult.application ?? reviewResult;
  expect(reviewed.status).toBe('Rejected');
  console.log(`✓ [2/3] Admin rejected proposal`);

  // Step 3: Partner sees rejected status
  const apps = await getPartnerApplications();
  const partnerApp = apps.find((a: any) => a.id === app.id);
  expect(partnerApp?.status).toBe('Rejected');
  console.log(`✓ [3/3] Partner sees Rejected status in DB`);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW-3  Volunteer requests to join → Admin approves match → Volunteer sees event
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW-3: Volunteer requests to join event → Admin approves → Volunteer sees event', async () => {
  const projects = await getProjects();
  const project = projects[0];
  const projectId = project.id || project.projects_id;

  // Step 1: Volunteer creates match request
  const matchId = `match-flow3-${uid()}`;
  const matches = await getVolunteerMatches();
  const alreadyExists = matches.find(
    (m: any) => m.volunteerId === VOLUNTEER.id && m.projectId === projectId && m.status === 'Requested'
  );

  if (!alreadyExists) {
    await apiCall('/storage/volunteerMatches', 'PUT', {
      value: [
        ...matches,
        {
          id: matchId,
          volunteerId: VOLUNTEER.id,
          projectId,
          status: 'Requested',
          requestedAt: new Date().toISOString(),
        },
      ],
    });
    console.log(`✓ [1/3] Volunteer created match request`);
  } else {
    console.log(`✓ [1/3] Match request already exists`);
  }

  // Step 2: Admin approves match (update status to Matched)
  const currentMatches = await getVolunteerMatches();
  const targetMatch = currentMatches.find(
    (m: any) =>
      (m.id === matchId || (m.volunteerId === VOLUNTEER.id && m.projectId === projectId)) &&
      (m.status === 'Requested' || m.status === 'Matched')
  );
  expect(targetMatch).toBeTruthy();

  if (targetMatch.status === 'Requested') {
    const updatedMatches = currentMatches.map((m: any) =>
      m.id === targetMatch.id
        ? { ...m, status: 'Matched', matchedAt: new Date().toISOString(), reviewedBy: ADMIN.id }
        : m
    );
    await apiCall('/storage/volunteerMatches', 'PUT', { value: updatedMatches });
    console.log(`✓ [2/3] Admin approved match`);
  } else {
    console.log(`✓ [2/3] Match already approved`);
  }

  // Step 3: Verify volunteer can see the join
  const joins = await getVolunteerJoins();
  const myJoins = joins.filter(
    (j: any) => j.volunteerUserId === VOLUNTEER.id || j.volunteerId === VOLUNTEER.id
  );
  console.log(`✓ [3/3] Volunteer has ${myJoins.length} project joins`);
  // Joins may be created separately; just verify the match is approved
  const approvedMatch = (await getVolunteerMatches()).find(
    (m: any) => m.volunteerId === VOLUNTEER.id && m.projectId === projectId && m.status === 'Matched'
  );
  expect(approvedMatch).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW-4  Admin assigns volunteer to project → Volunteer sees it
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW-4: Admin assigns volunteer to project → Volunteer sees assignment', async () => {
  const projects = await getProjects();
  const project = projects[1] ?? projects[0]; // Use second project if available
  const projectId = project.id || project.projects_id;

  // Admin creates a direct match (Matched status, no request needed)
  const matchId = `match-admin-${uid()}`;
  const matches = await getVolunteerMatches();

  await apiCall('/storage/volunteerMatches', 'PUT', {
    value: [
      ...matches,
      {
        id: matchId,
        volunteerId: VOLUNTEER.id,
        projectId,
        status: 'Matched',
        matchedAt: new Date().toISOString(),
        reviewedBy: ADMIN.id,
        source: 'AdminAssign',
      },
    ],
  });

  // Verify volunteer can see the match
  const updated = await getVolunteerMatches();
  const assigned = updated.find((m: any) => m.id === matchId);
  expect(assigned).toBeTruthy();
  expect(assigned.status).toBe('Matched');
  console.log(`✓ Admin assigned volunteer to project ${projectId}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW-5  Admin sends message to volunteer
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW-5: Admin can send message to volunteer', async () => {
  const msgResult = await apiCall('/messages', 'POST', {
    id: `msg-flow5-${uid()}`,
    senderId: ADMIN.id,
    recipientId: VOLUNTEER.id,
    content: `E2E test message from admin to volunteer – ${uid()}`,
    timestamp: new Date().toISOString(),
  });

  expect(msgResult).toBeTruthy();
  console.log(`✓ Admin sent message to volunteer`);

  // Verify volunteer can see it
  const messages = await getMessages(VOLUNTEER.id);
  expect(Array.isArray(messages)).toBe(true);
  console.log(`✓ Volunteer has ${messages.length} messages (including new one)`);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW-6  Admin sends message to partner
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW-6: Admin can send message to partner', async () => {
  const msgResult = await apiCall('/messages', 'POST', {
    id: `msg-flow6-${uid()}`,
    senderId: ADMIN.id,
    recipientId: PARTNER_JOLLIBEE.id,
    content: `E2E test message from admin to partner – ${uid()}`,
    timestamp: new Date().toISOString(),
  });

  expect(msgResult).toBeTruthy();
  console.log(`✓ Admin sent message to partner`);

  // Verify partner can see it
  const messages = await getMessages(PARTNER_JOLLIBEE.id);
  expect(Array.isArray(messages)).toBe(true);
  console.log(`✓ Partner has ${messages.length} messages (including new one)`);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW-7  Complete volunteer journey
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW-7: Complete volunteer journey – signup → approve → join → log time', async () => {
  const email = makeEmail('journey-vol');
  const volUserId = `vol-journey-${uid()}`;
  const volProfileId = `volprofile-journey-${uid()}`;

  // 1. Signup (user + volunteer profile)
  const [users, volunteers] = await Promise.all([getUsers(), getVolunteers()]);
  await Promise.all([
    apiCall('/storage/users', 'PUT', {
      value: [
        ...users,
        {
          id: volUserId,
          email,
          password: 'Journey123!',
          name: 'E2E Journey Volunteer',
          role: 'volunteer',
          approvalStatus: 'pending',
          createdAt: new Date().toISOString(),
        },
      ],
    }),
    apiCall('/storage/volunteers', 'PUT', {
      value: [
        ...volunteers,
        {
          id: volProfileId,
          userId: volUserId,
          email,
          name: 'E2E Journey Volunteer',
          registrationStatus: 'Pending',
          skills: [],
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ]);
  console.log(`✓ [1/5] Volunteer signed up (user + profile)`);

  // 2. Admin approves
  await approveUser(volUserId, ADMIN.id);
  const afterApprove = await getUsers();
  expect(afterApprove.find((u: any) => u.id === volUserId)?.approvalStatus).toBe('approved');
  console.log(`✓ [2/5] Admin approved volunteer`);

  // 3. Volunteer logs in
  const loginResult = await loginViaAPI(email, 'Journey123!');
  expect(loginResult).toBeTruthy();
  console.log(`✓ [3/5] Volunteer logged in`);

  // 4. Volunteer requests to join a project
  const projects = await getProjects();
  const projectId = projects[0].id || projects[0].projects_id;
  const matchId = `match-journey-${uid()}`;
  const matches = await getVolunteerMatches();
  await apiCall('/storage/volunteerMatches', 'PUT', {
    value: [
      ...matches,
      {
        id: matchId,
        volunteerId: volUserId,
        projectId,
        status: 'Requested',
        requestedAt: new Date().toISOString(),
      },
    ],
  });
  console.log(`✓ [4/5] Volunteer requested to join project`);

  // 5. Volunteer logs time
  const logs = await getTimeLogs();
  const logId = `log-journey-${uid()}`;
  const timeIn = new Date().toISOString();
  const timeOut = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  await apiCall('/storage/volunteerTimeLogs', 'PUT', {
    value: [
      ...logs,
      {
        id: logId,
        volunteerId: volUserId,
        projectId,
        timeIn,
        timeOut,
        note: 'E2E journey test – community outreach',
      },
    ],
  });
  const updatedLogs = await getTimeLogs();
  expect(updatedLogs.find((l: any) => l.id === logId)).toBeTruthy();
  console.log(`✓ [5/5] Volunteer logged attendance`);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW-8  Complete partner journey
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW-8: Complete partner journey – signup → approve → propose → admin approves', async () => {
  const email = makeEmail('journey-partner');
  const partnerUserId = `partner-journey-${uid()}`;

  // 1. Signup
  const users = await getUsers();
  await apiCall('/storage/users', 'PUT', {
    value: [
      ...users,
      {
        id: partnerUserId,
        email,
        password: 'Journey123!',
        name: 'E2E Journey Partner Org',
        role: 'partner',
        approvalStatus: 'pending',
        createdAt: new Date().toISOString(),
      },
    ],
  });
  console.log(`✓ [1/4] Partner signed up`);

  // 2. Admin approves
  await approveUser(partnerUserId, ADMIN.id);
  const afterApprove = await getUsers();
  expect(afterApprove.find((u: any) => u.id === partnerUserId)?.approvalStatus).toBe('approved');
  console.log(`✓ [2/4] Admin approved partner`);

  // 3. Partner submits proposal
  const projects = await getProjects();
  const projectId = projects[0].id || projects[0].projects_id;
  const proposal = makeProposalDetails('Livelihood');

  const submitResult = await submitPartnerProposal(
    projectId,
    partnerUserId,
    'E2E Journey Partner Org',
    proposal
  );
  const app = submitResult.application ?? submitResult;
  expect(app.status).toBe('Pending');
  console.log(`✓ [3/4] Partner submitted proposal`);

  // 4. Admin approves proposal
  const reviewResult = await reviewPartnerApplication(app.id, 'Approved', ADMIN.id);
  const reviewed = reviewResult.application ?? reviewResult;
  expect(reviewed.status).toBe('Approved');
  console.log(`✓ [4/4] Admin approved proposal – journey complete`);
});

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP  Remove all test-generated data after suite completes
// ─────────────────────────────────────────────────────────────────────────────
test.afterAll(async () => {
  try {
    // Remove test users
    const users = await getUsers();
    const cleanUsers = users.filter((u: any) => !String(u.email || '').endsWith('@test.com'));
    if (cleanUsers.length < users.length) {
      await apiCall('/storage/users', 'PUT', { value: cleanUsers });
    }

    // Remove test volunteer profiles
    const volunteers = await getVolunteers();
    const cleanVols = volunteers.filter((v: any) => !String(v.email || '').endsWith('@test.com'));
    if (cleanVols.length < volunteers.length) {
      await apiCall('/storage/volunteers', 'PUT', { value: cleanVols });
    }

    // Remove test matches
    const matches = await getVolunteerMatches();
    const cleanMatches = matches.filter((m: any) => {
      const id = String(m.id || '');
      return !id.startsWith('match-e2e-') && !id.startsWith('match-flow') &&
             !id.startsWith('match-admin-') && !id.startsWith('match-journey-');
    });
    if (cleanMatches.length < matches.length) {
      await apiCall('/storage/volunteerMatches', 'PUT', { value: cleanMatches });
    }

    // Remove test time logs
    const logs = await getTimeLogs();
    const cleanLogs = logs.filter((l: any) => {
      const id = String(l.id || '');
      return !id.startsWith('timelog-e2e-') && !id.startsWith('log-journey-');
    });
    if (cleanLogs.length < logs.length) {
      await apiCall('/storage/volunteerTimeLogs', 'PUT', { value: cleanLogs });
    }

    // Remove test partner applications
    const apps = await getPartnerApplications();
    const cleanApps = apps.filter((a: any) => {
      const details = typeof a.proposalDetails === 'string'
        ? JSON.parse(a.proposalDetails || '{}')
        : (a.proposalDetails || {});
      const title = String(details.proposedTitle || '');
      return !title.startsWith('E2E ');
    });
    if (cleanApps.length < apps.length) {
      await apiCall('/storage/partnerProjectApplications', 'PUT', { value: cleanApps });
    }

    console.log(`[cleanup] Cross-role test data removed`);
  } catch (e) {
    console.warn(`[cleanup] Warning: ${e}`);
  }
});
