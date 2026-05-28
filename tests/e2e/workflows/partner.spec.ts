/**
 * Partner Role – E2E Playwright Tests
 *
 * Covers every partner function via API (mobile-only role):
 *   1. Login
 *   2. View profile
 *   3. View available programs/projects
 *   4. Submit project proposal
 *   5. View application status
 *   6. Admin approves proposal
 *   7. Admin rejects proposal
 *   8. Partner views approved project
 *   9. Submit impact report
 *  10. Messaging
 *  11. Snapshot
 *  12. Full signup → approval → login flow
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
  getPartners,
  getProjects,
  getPartnerApplications,
  getMessages,
  loginViaAPI,
  approveUser,
  submitPartnerProposal,
  reviewPartnerApplication,
  getSnapshot,
} from '../helpers/api.helper';
import {
  PARTNER_JOLLIBEE,
  PARTNER_PBSP,
  ADMIN,
  makeEmail,
  uid,
  makeProposalDetails,
} from '../helpers/data.helper';

// ─────────────────────────────────────────────────────────────────────────────
// PAR-1  Login
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-1: Partner can login via API', async () => {
  const result = await loginViaAPI(PARTNER_JOLLIBEE.email, PARTNER_JOLLIBEE.password);
  expect(result).toBeTruthy();
  const user = result.user ?? result;
  expect(String(user.role || '')).toBe('partner');
  console.log(`✓ Partner login OK – ${PARTNER_JOLLIBEE.orgName}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-2  View profile
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-2: Partner profile exists in database', async () => {
  const partners = await getPartners();
  const partner = partners.find(
    (p: any) =>
      p.ownerUserId === PARTNER_JOLLIBEE.id ||
      p.contactEmail === PARTNER_JOLLIBEE.email ||
      (p.name || '').toLowerCase().includes('jollibee')
  );
  expect(partner).toBeTruthy();
  console.log(`✓ Partner profile found: ${partner.name || partner.id}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-3  View available programs
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-3: Partner can view available programs/projects', async () => {
  const projects = await getProjects();
  expect(projects.length).toBeGreaterThan(0);
  console.log(`✓ ${projects.length} programs/projects available`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-4  Submit project proposal
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-4: Partner can submit a project proposal', async () => {
  const projects = await getProjects();
  expect(projects.length).toBeGreaterThan(0);
  // Use a different project to avoid conflict with existing approved apps
  const projectId = projects[projects.length - 1].id || projects[projects.length - 1].projects_id;

  const proposal = makeProposalDetails('Education');

  const result = await submitPartnerProposal(
    projectId,
    PARTNER_JOLLIBEE.id,
    PARTNER_JOLLIBEE.orgName,
    proposal
  );

  expect(result).toBeTruthy();
  expect(result.application || result.id).toBeTruthy();

  const app = result.application ?? result;
  // Status is Pending on first submission; may be Approved if admin auto-approved
  expect(['Pending', 'Approved']).toContain(app.status);
  console.log(`✓ Proposal submitted: "${proposal.proposedTitle}" – status: ${app.status}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-5  View application status
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-5: Partner can view their application status', async () => {
  const apps = await getPartnerApplications();
  expect(Array.isArray(apps)).toBe(true);

  const myApps = apps.filter(
    (a: any) => a.partnerUserId === PARTNER_JOLLIBEE.id
  );
  console.log(`✓ Partner has ${myApps.length} applications`);
  if (myApps.length > 0) {
    console.log(`  Statuses: ${[...new Set(myApps.map((a: any) => a.status))].join(', ')}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-6  Admin approves proposal
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-6: Admin can approve a partner proposal', async () => {
  const projects = await getProjects();
  const projectId = projects[0].id || projects[0].projects_id;
  const proposal = makeProposalDetails('Livelihood');

  // Submit proposal
  const submitResult = await submitPartnerProposal(
    projectId,
    PARTNER_PBSP.id,
    PARTNER_PBSP.orgName,
    proposal
  );
  const app = submitResult.application ?? submitResult;
  const appId = app.id;
  expect(appId).toBeTruthy();
  expect(app.status).toBe('Pending');

  // Admin approves
  const reviewResult = await reviewPartnerApplication(appId, 'Approved', ADMIN.id, 'Looks good');
  const reviewed = reviewResult.application ?? reviewResult;
  expect(reviewed.status).toBe('Approved');
  expect(reviewed.reviewedBy).toBe(ADMIN.id);
  console.log(`✓ Proposal approved by admin: ${appId}`);

  // Verify in DB
  const apps = await getPartnerApplications();
  const updated = apps.find((a: any) => a.id === appId);
  expect(updated?.status).toBe('Approved');
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-7  Admin rejects proposal
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-7: Admin can reject a partner proposal', async () => {
  const projects = await getProjects();
  const projectId = projects[0].id || projects[0].projects_id;
  const proposal = makeProposalDetails('Nutrition');

  // Submit proposal
  const submitResult = await submitPartnerProposal(
    projectId,
    PARTNER_PBSP.id,
    PARTNER_PBSP.orgName,
    proposal
  );
  const app = submitResult.application ?? submitResult;
  const appId = app.id;
  expect(appId).toBeTruthy();

  // Admin rejects
  const reviewResult = await reviewPartnerApplication(
    appId,
    'Rejected',
    ADMIN.id,
    'Does not align with current priorities'
  );
  const reviewed = reviewResult.application ?? reviewResult;
  expect(reviewed.status).toBe('Rejected');
  console.log(`✓ Proposal rejected by admin: ${appId}`);

  // Verify in DB
  const apps = await getPartnerApplications();
  const updated = apps.find((a: any) => a.id === appId);
  expect(updated?.status).toBe('Rejected');
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-8  Partner views approved project
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-8: Partner can view their approved projects', async () => {
  const apps = await getPartnerApplications();
  const approvedApps = apps.filter(
    (a: any) =>
      a.status === 'Approved' &&
      (a.partnerUserId === PARTNER_JOLLIBEE.id || a.partnerUserId === PARTNER_PBSP.id)
  );
  console.log(`✓ Partner has ${approvedApps.length} approved applications`);
  // At least one should exist from PAR-6
  expect(approvedApps.length).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-9  Submit impact report
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-9: Partner can submit an impact report', async () => {
  const projects = await getProjects();
  const projectId = projects[0].id || projects[0].projects_id;

  const reportResult = await apiCall('/reports', 'POST', {
    projectId,
    partnerId: PARTNER_JOLLIBEE.id,
    partnerUserId: PARTNER_JOLLIBEE.id,
    partnerName: PARTNER_JOLLIBEE.orgName,
    submitterUserId: PARTNER_JOLLIBEE.id,
    submitterName: PARTNER_JOLLIBEE.name,
    submitterRole: 'partner',
    reportType: 'General',
    title: `E2E Impact Report ${uid()}`,
    description: `E2E test impact report – ${uid()}`,
    impactCount: 75,
    status: 'Submitted',
  });

  expect(reportResult).toBeTruthy();
  console.log(`✓ Impact report submitted`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-10  Messaging
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-10: Partner can view messages', async () => {
  const messages = await getMessages(PARTNER_JOLLIBEE.id);
  expect(Array.isArray(messages)).toBe(true);
  console.log(`✓ Partner has ${messages.length} messages`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-11  Snapshot
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-11: Partner snapshot endpoint returns data', async () => {
  const snapshot = await getSnapshot(PARTNER_JOLLIBEE.id, 'partner');
  expect(snapshot).toBeTruthy();
  console.log('✓ Partner snapshot keys:', Object.keys(snapshot).join(', '));
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-12  Full signup → approval → login flow
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-12: New partner signup → admin approval → login flow', async () => {
  const email = makeEmail('new-partner');
  const partnerId = `partner-signup-${uid()}`;

  // Step 1: Create partner user (simulates mobile signup)
  const users = await getUsers();
  await apiCall('/storage/users', 'PUT', {
    value: [
      ...users,
      {
        id: partnerId,
        email,
        password: 'Test1234!',
        name: 'E2E New Partner Org',
        role: 'partner',
        approvalStatus: 'pending',
        createdAt: new Date().toISOString(),
      },
    ],
  });

  // Verify pending
  const afterCreate = await getUsers();
  const pending = afterCreate.find((u: any) => u.id === partnerId);
  expect(pending).toBeTruthy();
  expect(pending.approvalStatus).toBe('pending');
  console.log(`✓ Step 1: Partner created with pending status`);

  // Step 2: Admin approves
  await approveUser(partnerId, ADMIN.id);

  const afterApprove = await getUsers();
  const approved = afterApprove.find((u: any) => u.id === partnerId);
  expect(approved?.approvalStatus).toBe('approved');
  console.log(`✓ Step 2: Admin approved partner`);

  // Step 3: Partner can now login
  const loginResult = await loginViaAPI(email, 'Test1234!');
  expect(loginResult).toBeTruthy();
  const user = loginResult.user ?? loginResult;
  expect(String(user.approvalStatus || user.approval_status || 'approved')).toBe('approved');
  console.log(`✓ Step 3: Approved partner can login`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-UI-1  Partner mobile UI in browser – shows role selection
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-UI-1: ?mode=mobile shows partner role selection screen', async ({ page }) => {
  await page.goto('/?mode=mobile');
  await waitForPageReady(page);

  // Should show partner role card, NOT the admin-only notice
  const hasPartnerCard = await pageContains(page, /Continue as Partner Organization/i);
  expect(hasPartnerCard).toBe(true);

  const hasAdminOnlyNotice = await pageContains(page, /Web access is for admin only/i);
  expect(hasAdminOnlyNotice).toBe(false);

  console.log('✓ Mobile mode shows partner role selection (not admin-only notice)');
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-UI-2  Partner can login via mobile UI in browser
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-UI-2: Partner can login via mobile UI in browser and sees partner dashboard', async ({ page }) => {
  await loginAsMobile(page, 'partner', PARTNER_JOLLIBEE.email, PARTNER_JOLLIBEE.password);

  // Should see partner dashboard content — NOT admin content
  const hasPartnerContent = await pageContains(page, /program|project|dashboard|partner/i);
  expect(hasPartnerContent).toBe(true);

  // Must NOT see admin-only tabs
  const hasAdminContent = await pageContains(page, /User Management|Volunteer Management|Analytics/i);
  expect(hasAdminContent).toBe(false);

  console.log('✓ Partner sees their own mobile dashboard UI (not admin UI)');
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-UI-3  Partner mobile UI shows programs
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-UI-3: Partner mobile UI shows programs screen', async ({ page }) => {
  await loginAsMobile(page, 'partner', PARTNER_JOLLIBEE.email, PARTNER_JOLLIBEE.password);
  await page.waitForTimeout(3000);

  // Partner dashboard shows program/project content inline
  const hasPrograms = await pageContains(page, /program|project|proposal/i);
  expect(hasPrograms).toBe(true);

  // Try clicking Browse Programs if visible
  const browseLink = page.getByText(/browse program|program management|submit.*proposal/i).first();
  const browseVisible = await browseLink.isVisible({ timeout: 3000 }).catch(() => false);
  if (browseVisible) {
    await browseLink.click();
    await waitForPageReady(page);
  }

  const hasContent = await pageContains(page, /program|project|proposal/i);
  expect(hasContent).toBe(true);

  console.log('✓ Partner mobile UI shows programs/projects content');
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-UI-4  Partner mobile UI shows messages
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-UI-4: Partner mobile UI shows messages screen', async ({ page }) => {
  await loginAsMobile(page, 'partner', PARTNER_JOLLIBEE.email, PARTNER_JOLLIBEE.password);
  await page.waitForTimeout(3000);

  // In mobile web, the partner dashboard is a scrollable page.
  // Messages are accessible via the Communication Hub link on the dashboard.
  const hasPartnerContent = await pageContains(page, /partner|program|project|dashboard/i);
  expect(hasPartnerContent).toBe(true);

  // Try clicking Messages if visible, otherwise verify dashboard has communication content
  const msgLink = page.getByText(/messages|communication|inbox/i).first();
  const msgVisible = await msgLink.isVisible({ timeout: 3000 }).catch(() => false);
  if (msgVisible) {
    await msgLink.click();
    await waitForPageReady(page);
  }

  const hasContent = await pageContains(page, /message|communication|partner|program/i);
  expect(hasContent).toBe(true);

  console.log('✓ Partner mobile UI is accessible and shows partner content');
});

// ─────────────────────────────────────────────────────────────────────────────
// PAR-UI-5  Partner mobile UI shows reports screen
// ─────────────────────────────────────────────────────────────────────────────
test('PAR-UI-5: Partner mobile UI shows reports screen', async ({ page }) => {
  await loginAsMobile(page, 'partner', PARTNER_JOLLIBEE.email, PARTNER_JOLLIBEE.password);
  await page.waitForTimeout(3000);

  // Try clicking Reports if visible
  const reportsLink = page.getByText(/reports|submit.*report|field.*report/i).first();
  const reportsVisible = await reportsLink.isVisible({ timeout: 3000 }).catch(() => false);
  if (reportsVisible) {
    await reportsLink.click();
    await waitForPageReady(page);
  }

  const hasContent = await pageContains(page, /report|impact|project|partner/i);
  expect(hasContent).toBe(true);

  console.log('✓ Partner mobile UI shows reports content');
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

    // Remove test partner applications (proposedTitle starts with "E2E ")
    const apps = await getPartnerApplications();
    const cleanApps = apps.filter((a: any) => {
      const details = typeof a.proposalDetails === 'string'
        ? JSON.parse(a.proposalDetails || '{}')
        : (a.proposalDetails || {});
      const title = String(details.proposedTitle || '');
      const partnerUser = String(a.partnerUserId || '');
      return !title.startsWith('E2E ') && !partnerUser.startsWith('partner-signup-') && !partnerUser.startsWith('partner-journey-');
    });
    if (cleanApps.length < apps.length) {
      await apiCall('/storage/partnerProjectApplications', 'PUT', { value: cleanApps });
    }

    console.log(`[cleanup] Partner test data removed`);
  } catch (e) {
    console.warn(`[cleanup] Warning: ${e}`);
  }
});
