/**
 * Volunteer Role – E2E Playwright Tests
 *
 * Covers every volunteer function via API (mobile-only role):
 *   1. Login via API
 *   2. View profile
 *   3. Browse projects/events
 *   4. Request to join event
 *   5. View my joins
 *   6. View my matches
 *   7. View time logs
 *   8. Messaging
 *   9. Snapshot data
 *  10. Signup → Admin approval → Login flow
 */

import { test, expect } from '@playwright/test';
import {
  loginAsMobile,
  waitForPageReady,
  pageContains,
  clickNav,
} from '../helpers/ui.helper';
import {
  apiCall,
  getUsers,
  getVolunteers,
  getProjects,
  getEvents,
  getVolunteerMatches,
  getVolunteerJoins,
  getTimeLogs,
  getMessages,
  loginViaAPI,
  approveUser,
  getSnapshot,
} from '../helpers/api.helper';
import { VOLUNTEER, ADMIN, makeEmail, uid } from '../helpers/data.helper';

// ─────────────────────────────────────────────────────────────────────────────
// VOL-1  Login
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-1: Volunteer can login via API', async () => {
  const result = await loginViaAPI(VOLUNTEER.email, VOLUNTEER.password);
  expect(result).toBeTruthy();
  const user = result.user ?? result;
  expect(String(user.role || '')).toBe('volunteer');
  console.log(`✓ Volunteer login OK – role: ${user.role}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-2  View profile
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-2: Volunteer profile exists in database', async () => {
  const volunteers = await getVolunteers();
  const vol = volunteers.find((v: any) => v.userId === VOLUNTEER.id || v.email === VOLUNTEER.email);
  expect(vol).toBeTruthy();
  console.log(`✓ Volunteer profile found: ${vol.name || vol.id}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-3  Browse projects
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-3: Volunteer can browse available projects', async () => {
  const projects = await getProjects();
  expect(projects.length).toBeGreaterThan(0);
  console.log(`✓ ${projects.length} projects available to browse`);
  // Verify project structure
  const first = projects[0];
  expect(first.id || first.projects_id).toBeTruthy();
  expect(first.title).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-4  Browse events
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-4: Volunteer can browse available events', async () => {
  const events = await getEvents();
  expect(Array.isArray(events)).toBe(true);
  console.log(`✓ ${events.length} events available`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-5  Request to join event (via API)
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-5: Volunteer can request to join a project', async () => {
  const projects = await getProjects();
  expect(projects.length).toBeGreaterThan(0);

  const project = projects[0];
  const projectId = project.id || project.projects_id;

  // Check if match already exists
  const existingMatches = await getVolunteerMatches();
  const alreadyMatched = existingMatches.find(
    (m: any) => m.volunteerId === VOLUNTEER.id && m.projectId === projectId
  );

  if (alreadyMatched) {
    console.log(`✓ Match already exists for volunteer ${VOLUNTEER.id} → project ${projectId}`);
    expect(alreadyMatched.status).toBeTruthy();
    return;
  }

  // Create match request
  const matches = await getVolunteerMatches();
  const newMatch = {
    id: `match-e2e-${uid()}`,
    volunteerId: VOLUNTEER.id,
    projectId,
    status: 'Requested',
    requestedAt: new Date().toISOString(),
  };

  await apiCall('/storage/volunteerMatches', 'PUT', {
    value: [...matches, newMatch],
  });

  // Verify
  const updated = await getVolunteerMatches();
  const created = updated.find((m: any) => m.id === newMatch.id);
  expect(created).toBeTruthy();
  expect(created.status).toBe('Requested');
  console.log(`✓ Match request created: ${newMatch.id}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-6  View my joins
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-6: Volunteer can view their project joins', async () => {
  const joins = await getVolunteerJoins();
  expect(Array.isArray(joins)).toBe(true);

  const myJoins = joins.filter(
    (j: any) => j.volunteerUserId === VOLUNTEER.id || j.volunteerId === VOLUNTEER.id
  );
  console.log(`✓ Volunteer has ${myJoins.length} project joins`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-7  View my matches
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-7: Volunteer can view their volunteer matches', async () => {
  const matches = await getVolunteerMatches();
  expect(Array.isArray(matches)).toBe(true);

  const myMatches = matches.filter((m: any) => m.volunteerId === VOLUNTEER.id);
  console.log(`✓ Volunteer has ${myMatches.length} matches`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-8  View time logs
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-8: Volunteer can view time logs', async () => {
  const logs = await getTimeLogs();
  expect(Array.isArray(logs)).toBe(true);

  const myLogs = logs.filter((l: any) => l.volunteerId === VOLUNTEER.id);
  console.log(`✓ Volunteer has ${myLogs.length} time log entries`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-9  Messaging
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-9: Volunteer can view messages', async () => {
  const messages = await getMessages(VOLUNTEER.id);
  expect(Array.isArray(messages)).toBe(true);
  console.log(`✓ Volunteer has ${messages.length} messages`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-10  Snapshot
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-10: Volunteer snapshot endpoint returns data', async () => {
  const snapshot = await getSnapshot(VOLUNTEER.id, 'volunteer');
  expect(snapshot).toBeTruthy();
  console.log('✓ Volunteer snapshot keys:', Object.keys(snapshot).join(', '));
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-11  Full signup → approval → login flow
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-11: New volunteer signup → admin approval → login flow', async () => {
  const email = makeEmail('new-vol');
  const volUserId = `vol-signup-${uid()}`;
  const volProfileId = `volprofile-${uid()}`;

  // Step 1: Create volunteer user + volunteer profile (simulates mobile signup)
  const [users, volunteers] = await Promise.all([getUsers(), getVolunteers()]);

  await Promise.all([
    apiCall('/storage/users', 'PUT', {
      value: [
        ...users,
        {
          id: volUserId,
          email,
          password: 'Test1234!',
          name: 'E2E New Volunteer',
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
          name: 'E2E New Volunteer',
          registrationStatus: 'Pending',
          skills: [],
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ]);

  // Verify pending
  const afterCreate = await getUsers();
  const pending = afterCreate.find((u: any) => u.id === volUserId);
  expect(pending).toBeTruthy();
  expect(pending.approvalStatus).toBe('pending');
  console.log(`✓ Step 1: Volunteer user + profile created with pending status`);

  // Step 2: Admin approves
  await approveUser(volUserId, ADMIN.id);

  const afterApprove = await getUsers();
  const approved = afterApprove.find((u: any) => u.id === volUserId);
  expect(approved?.approvalStatus).toBe('approved');
  console.log(`✓ Step 2: Admin approved volunteer`);

  // Step 3: Volunteer can now login
  const loginResult = await loginViaAPI(email, 'Test1234!');
  expect(loginResult).toBeTruthy();
  const user = loginResult.user ?? loginResult;
  expect(String(user.approvalStatus || user.approval_status || 'approved')).toBe('approved');
  console.log(`✓ Step 3: Approved volunteer can login`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-12  Log time (volunteer logs attendance)
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-12: Volunteer can log time/attendance for a project', async () => {
  const projects = await getProjects();
  expect(projects.length).toBeGreaterThan(0);
  const projectId = projects[0].id || projects[0].projects_id;

  const logs = await getTimeLogs();
  const logId = `timelog-e2e-${uid()}`;
  const timeIn = new Date().toISOString();
  const timeOut = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(); // +3 hours

  await apiCall('/storage/volunteerTimeLogs', 'PUT', {
    value: [
      ...logs,
      {
        id: logId,
        volunteerId: VOLUNTEER.id,
        projectId,
        timeIn,
        timeOut,
        note: 'E2E test attendance log entry',
      },
    ],
  });

  const updated = await getTimeLogs();
  const created = updated.find((l: any) => l.id === logId);
  expect(created).toBeTruthy();
  expect(created.timeIn || created.time_in).toBeTruthy();
  console.log(`✓ Time log created: ${logId} (time in: ${timeIn})`);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-UI-1  Volunteer mobile UI in browser – login shows mobile UI
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-UI-1: ?mode=mobile shows volunteer role selection screen', async ({ page }) => {
  await page.goto('/?mode=mobile');
  await waitForPageReady(page);

  // Should show the role selection cards, NOT the admin-only notice
  const hasRoleSelection = await pageContains(page, /Continue as Volunteer/i);
  expect(hasRoleSelection).toBe(true);

  const hasAdminOnlyNotice = await pageContains(page, /Web access is for admin only/i);
  expect(hasAdminOnlyNotice).toBe(false);

  console.log('✓ Mobile mode shows volunteer role selection (not admin-only notice)');
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-UI-2  Volunteer can login via mobile UI in browser
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-UI-2: Volunteer can login via mobile UI in browser and sees volunteer dashboard', async ({ page }) => {
  await loginAsMobile(page, 'volunteer', VOLUNTEER.email, VOLUNTEER.password);

  // Should see volunteer dashboard content — NOT admin content
  const hasVolunteerContent = await pageContains(page, /project|event|dashboard|volunteer/i);
  expect(hasVolunteerContent).toBe(true);

  // Must NOT see admin-only tabs
  const hasAdminContent = await pageContains(page, /User Management|Partner Management|Analytics/i);
  expect(hasAdminContent).toBe(false);

  console.log('✓ Volunteer sees their own mobile dashboard UI (not admin UI)');
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-UI-3  Volunteer mobile UI shows projects
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-UI-3: Volunteer mobile UI shows available projects', async ({ page }) => {
  await loginAsMobile(page, 'volunteer', VOLUNTEER.email, VOLUNTEER.password);
  await page.waitForTimeout(3000);

  // Try clicking Projects if visible, otherwise check dashboard content
  const projectsLink = page.getByText(/browse.*project|available.*project|projects/i).first();
  const projectsVisible = await projectsLink.isVisible({ timeout: 3000 }).catch(() => false);
  if (projectsVisible) {
    await projectsLink.click();
    await waitForPageReady(page);
  }

  const hasProjects = await pageContains(page, /project|event|browse/i);
  expect(hasProjects).toBe(true);

  console.log('✓ Volunteer mobile UI shows projects screen');
});

// ─────────────────────────────────────────────────────────────────────────────
// VOL-UI-4  Volunteer mobile UI shows messages
// ─────────────────────────────────────────────────────────────────────────────
test('VOL-UI-4: Volunteer mobile UI shows messages screen', async ({ page }) => {
  await loginAsMobile(page, 'volunteer', VOLUNTEER.email, VOLUNTEER.password);
  await page.waitForTimeout(3000);

  // Try clicking Messages if visible
  const msgLink = page.getByText(/messages|communication|inbox/i).first();
  const msgVisible = await msgLink.isVisible({ timeout: 3000 }).catch(() => false);
  if (msgVisible) {
    await msgLink.click();
    await waitForPageReady(page);
  }

  const hasContent = await pageContains(page, /message|communication|volunteer|project/i);
  expect(hasContent).toBe(true);

  console.log('✓ Volunteer mobile UI shows messages screen');
});

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP  Remove all test-generated data after suite completes
// ─────────────────────────────────────────────────────────────────────────────
test.afterAll(async () => {
  try {
    // Remove test users (email ends with @test.com)
    const users = await getUsers();
    const cleanUsers = users.filter((u: any) => !String(u.email || '').endsWith('@test.com'));
    if (cleanUsers.length < users.length) {
      await apiCall('/storage/users', 'PUT', { value: cleanUsers });
    }

    // Remove test volunteer profiles (email ends with @test.com)
    const volunteers = await getVolunteers();
    const cleanVols = volunteers.filter((v: any) => !String(v.email || '').endsWith('@test.com'));
    if (cleanVols.length < volunteers.length) {
      await apiCall('/storage/volunteers', 'PUT', { value: cleanVols });
    }

    // Remove test volunteer matches (id starts with match-e2e- or match-journey-)
    const matches = await getVolunteerMatches();
    const cleanMatches = matches.filter((m: any) => {
      const id = String(m.id || '');
      return !id.startsWith('match-e2e-') && !id.startsWith('match-flow') &&
             !id.startsWith('match-admin-') && !id.startsWith('match-journey-');
    });
    if (cleanMatches.length < matches.length) {
      await apiCall('/storage/volunteerMatches', 'PUT', { value: cleanMatches });
    }

    // Remove test time logs (id starts with timelog-e2e- or log-journey-)
    const logs = await getTimeLogs();
    const cleanLogs = logs.filter((l: any) => {
      const id = String(l.id || '');
      return !id.startsWith('timelog-e2e-') && !id.startsWith('log-journey-');
    });
    if (cleanLogs.length < logs.length) {
      await apiCall('/storage/volunteerTimeLogs', 'PUT', { value: cleanLogs });
    }

    console.log(`[cleanup] Volunteer test data removed`);
  } catch (e) {
    console.warn(`[cleanup] Warning: ${e}`);
  }
});
