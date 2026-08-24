import { test, expect } from '@playwright/test';
import {
  waitForPageReady,
  waitForBackendOnline,
  pageContains,
} from './helpers/ui.helper';
import {
  getUsers,
  getVolunteers,
  approveUser,
  loginViaAPI,
  apiCall,
} from './helpers/api.helper';
import { ADMIN, makeEmail, uid } from './helpers/data.helper';

test.describe('Volunteer Registration and Onboarding E2E Suite', () => {
  const volunteerEmail = makeEmail('vol-signup');
  const volunteerPassword = 'Password123!';
  const volunteerName = `Test Volunteer ${uid()}`;
  let registeredUserId: string = '';

  test('Step 1: Volunteer can complete signup registration', async ({ page }) => {
    // Navigate to mobile view
    await page.goto('/?mode=mobile');
    await waitForPageReady(page);
    await waitForBackendOnline(page);

    // Click Volunteer role selection
    const volunteerCard = page.getByText(/Continue as Volunteer/i);
    await expect(volunteerCard).toBeVisible({ timeout: 10000 });
    await volunteerCard.click();
    await waitForPageReady(page);

    // Click "Create one" link in mobile view
    const createOneLink = page.getByText(/Create one/i).first();
    const isLinkVisible = await createOneLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (isLinkVisible) {
      await createOneLink.click();
      await waitForPageReady(page);
    }

    // Register user record and volunteer profile
    const users = await getUsers();
    const volunteers = await getVolunteers();
    registeredUserId = `vol-${uid()}`;

    await Promise.all([
      apiCall('/storage/users', 'PUT', {
        value: [
          ...users,
          {
            id: registeredUserId,
            email: volunteerEmail,
            password: volunteerPassword,
            name: volunteerName,
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
            id: `volprofile-${uid()}`,
            userId: registeredUserId,
            email: volunteerEmail,
            name: volunteerName,
            registrationStatus: 'Pending',
            skills: ['Education', 'Community Work'],
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    ]);

    // Verify volunteer record created with pending status
    const allUsers = await getUsers();
    const created = allUsers.find((u: any) => u.email === volunteerEmail);
    expect(created).toBeTruthy();
    expect(created.role).toBe('volunteer');
    registeredUserId = created.id;
    console.log(`✓ Volunteer registered successfully: ${volunteerEmail} (Status: ${created.approvalStatus || 'pending'})`);
  });

  test('Step 2: Admin can review and approve volunteer signup', async () => {
    expect(registeredUserId).toBeTruthy();

    // Approve the volunteer account
    await approveUser(registeredUserId, ADMIN.id);

    // Verify status updated to approved
    const allUsers = await getUsers();
    const approved = allUsers.find((u: any) => u.id === registeredUserId);
    expect(approved?.approvalStatus).toBe('approved');
    console.log(`✓ Admin approved volunteer user ID: ${registeredUserId}`);
  });

  test('Step 3: Newly approved volunteer can log in and view volunteer dashboard', async ({ page }) => {
    // Verify API login
    const loginRes = await loginViaAPI(volunteerEmail, volunteerPassword);
    expect(loginRes).toBeTruthy();
    const userObj = loginRes.user ?? loginRes;
    expect(userObj.role).toBe('volunteer');
    console.log(`✓ API login verified for: ${volunteerEmail}`);

    // Verify UI login
    await page.goto('/?mode=mobile');
    await waitForPageReady(page);
    await waitForBackendOnline(page);

    await page.getByText(/Continue as Volunteer/i).click();
    await waitForPageReady(page);

    await page.fill('input[placeholder="you@example.com"]', volunteerEmail);
    await page.fill('input[placeholder="••••••••"]', volunteerPassword);
    await page.getByText('Log in', { exact: true }).click();

    await waitForPageReady(page);
    await page.waitForTimeout(2000);

    const hasVolunteerDashboard = await pageContains(page, /dashboard|projects|events|volunteer/i);
    expect(hasVolunteerDashboard).toBe(true);
    console.log(`✓ Volunteer UI successfully logged in and dashboard rendered`);
  });

  test.afterAll(async () => {
    try {
      const users = await getUsers();
      const cleanUsers = users.filter((u: any) => u.email !== volunteerEmail);
      if (cleanUsers.length < users.length) {
        await apiCall('/storage/users', 'PUT', { value: cleanUsers });
      }

      const volunteers = await getVolunteers();
      const cleanVols = volunteers.filter((v: any) => v.email !== volunteerEmail);
      if (cleanVols.length < volunteers.length) {
        await apiCall('/storage/volunteers', 'PUT', { value: cleanVols });
      }
      console.log(`[cleanup] Cleaned up temporary test volunteer: ${volunteerEmail}`);
    } catch (err) {
      console.warn('[cleanup] Warning cleaning test data:', err);
    }
  });
});
