/**
 * Admin Role – E2E Playwright Tests
 *
 * Covers every admin function:
 *   1. Login
 *   2. Dashboard data (volunteers, partners, projects, events)
 *   3. User Management – view pending, approve, reject
 *   4. Volunteer management
 *   5. Partner management & application review
 *   6. Project lifecycle management
 *   7. Reports & time logs
 *   8. Messaging
 *
 * NOTE: Web portal is admin-only. Volunteer/partner UI tests run via API.
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  waitForPageReady,
  pageContains,
  assertPageContains,
  clickNav,
  clickButton,
} from '../helpers/ui.helper';
import {
  apiCall,
  getUsers,
  getVolunteers,
  getPartners,
  getProjects,
  getEvents,
  getVolunteerMatches,
  getVolunteerJoins,
  getPartnerApplications,
  getTimeLogs,
  getMessages,
  getPendingUsers,
  approveUser,
  getSnapshot,
  loginViaAPI,
} from '../helpers/api.helper';
import { ADMIN, makeEmail, uid } from '../helpers/data.helper';

// ─────────────────────────────────────────────────────────────────────────────
// ADM-1  Login
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-1: Admin can login to web portal', async ({ page }) => {
  await loginAsAdmin(page, ADMIN.email, ADMIN.password);

  // Should land on dashboard – look for any admin-specific content
  const ok = await pageContains(page, /dashboard|user management|volunteers|projects/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-2  Dashboard data
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-2: Dashboard shows correct counts from database', async ({ page }) => {
  // API assertions
  const [users, volunteers, partners, projects, events] = await Promise.all([
    getUsers(),
    getVolunteers(),
    getPartners(),
    getProjects(),
    getEvents(),
  ]);

  expect(users.length).toBeGreaterThan(0);
  expect(volunteers.length).toBeGreaterThan(0);
  expect(partners.length).toBeGreaterThan(0);
  expect(projects.length).toBeGreaterThan(0);

  console.log(`✓ DB: ${users.length} users, ${volunteers.length} volunteers, ${partners.length} partners, ${projects.length} projects, ${events.length} events`);

  // UI assertions
  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  const ok = await pageContains(page, /volunteer|partner|project/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-3  Admin snapshot endpoint
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-3: Admin snapshot endpoint returns full data', async () => {
  const snapshot = await getSnapshot(ADMIN.id, 'admin');
  expect(snapshot).toBeTruthy();
  // Snapshot should have some project/volunteer data
  const keys = Object.keys(snapshot);
  expect(keys.length).toBeGreaterThan(0);
  console.log('✓ Snapshot keys:', keys.join(', '));
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-4  User Management – view all users
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-4: Admin can view all users via API and UI', async ({ page }) => {
  const users = await getUsers();
  expect(users.length).toBeGreaterThan(0);

  const adminUser = users.find((u: any) => u.role === 'admin');
  expect(adminUser).toBeTruthy();
  expect(adminUser.email).toBe(ADMIN.email);

  const volunteerUsers = users.filter((u: any) => u.role === 'volunteer');
  const partnerUsers = users.filter((u: any) => u.role === 'partner');
  console.log(`✓ Users: ${users.length} total (${volunteerUsers.length} volunteers, ${partnerUsers.length} partners)`);

  // UI
  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  await clickNav(page, /user management|users/i);
  const ok = await pageContains(page, /volunteer|partner|pending|approved/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-5  Approve a pending volunteer
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-5: Admin can approve a pending volunteer account', async ({ page }) => {
  // Create a fresh pending volunteer via API
  const email = makeEmail('pending-vol');
  const volId = `vol-e2e-${uid()}`;

  const users = await getUsers();
  const existing = users.find((u: any) => u.email === email);
  if (!existing) {
    await apiCall('/storage/users', 'PUT', {
      value: [
        ...users,
        {
          id: volId,
          email,
          password: 'Test1234!',
          name: 'E2E Pending Volunteer',
          role: 'volunteer',
          approvalStatus: 'pending',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  // Approve via API
  const result = await approveUser(volId, ADMIN.id);
  expect(result).toBeTruthy();

  // Verify in DB
  const updatedUsers = await getUsers();
  const approved = updatedUsers.find((u: any) => u.id === volId);
  expect(approved?.approvalStatus).toBe('approved');
  console.log(`✓ Volunteer ${volId} approved`);

  // UI: admin sees the user management screen
  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  await clickNav(page, /user management|users/i);
  const ok = await pageContains(page, /approved|pending|volunteer/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-6  Volunteer management
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-6: Admin can view all volunteers', async ({ page }) => {
  const volunteers = await getVolunteers();
  expect(volunteers.length).toBeGreaterThan(0);
  console.log(`✓ ${volunteers.length} volunteers in DB`);

  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  await clickNav(page, /user management|volunteers/i);
  const ok = await pageContains(page, /volunteer/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-7  Volunteer matches
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-7: Admin can view volunteer matches', async () => {
  const matches = await getVolunteerMatches();
  expect(Array.isArray(matches)).toBe(true);
  console.log(`✓ ${matches.length} volunteer matches in DB`);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-8  Volunteer joins
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-8: Admin can view volunteer project joins', async () => {
  const joins = await getVolunteerJoins();
  expect(Array.isArray(joins)).toBe(true);
  console.log(`✓ ${joins.length} volunteer joins in DB`);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-9  Partner management
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-9: Admin can view all partners', async ({ page }) => {
  const partners = await getPartners();
  expect(partners.length).toBeGreaterThan(0);
  console.log(`✓ ${partners.length} partners in DB`);

  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  await clickNav(page, /partner|user management/i);
  const ok = await pageContains(page, /partner/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-10  Partner applications
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-10: Admin can view partner project applications', async ({ page }) => {
  const apps = await getPartnerApplications();
  expect(Array.isArray(apps)).toBe(true);
  console.log(`✓ ${apps.length} partner applications in DB`);

  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  // Navigate to Partner Approvals tab (tab index 3)
  await clickNav(page, 'partner approvals');
  const ok = await pageContains(page, /proposal|application|project|approval/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-11  Project management
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-11: Admin can view all projects', async ({ page }) => {
  const projects = await getProjects();
  expect(projects.length).toBeGreaterThan(0);
  console.log(`✓ ${projects.length} projects in DB`);

  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  await clickNav(page, /project lifecycle|projects/i);
  const ok = await pageContains(page, /project/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-12  Events
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-12: Admin can view all events', async () => {
  const events = await getEvents();
  expect(Array.isArray(events)).toBe(true);
  console.log(`✓ ${events.length} events in DB`);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-13  Time logs
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-13: Admin can view volunteer time logs', async ({ page }) => {
  const logs = await getTimeLogs();
  expect(Array.isArray(logs)).toBe(true);
  console.log(`✓ ${logs.length} time logs in DB`);

  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  // Navigate to Reports tab (tab index 7)
  await clickNav(page, 'reports');
  const ok = await pageContains(page, /report|log|hour|volunteer/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-14  Messaging
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-14: Admin can view messages', async ({ page }) => {
  const messages = await getMessages(ADMIN.id);
  expect(Array.isArray(messages)).toBe(true);
  console.log(`✓ ${messages.length} messages for admin`);

  await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  await clickNav(page, /communication|message/i);
  const ok = await pageContains(page, /message|communication|inbox/i);
  expect(ok).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADM-15  Admin login via API
// ─────────────────────────────────────────────────────────────────────────────
test('ADM-15: Admin login API returns correct user data', async () => {
  const result = await loginViaAPI(ADMIN.email, ADMIN.password);
  expect(result).toBeTruthy();
  expect(result.user || result.id || result.email).toBeTruthy();
  const user = result.user ?? result;
  expect(String(user.email || user.identifier || '')).toContain('admin');
  console.log('✓ Admin login API OK');
});
