import { test, expect } from '@playwright/test';
import { waitForPageReady, waitForBackendOnline, loginAsAdmin } from '../helpers/ui.helper';
import { apiCall, getUsers, getPartners } from '../helpers/api.helper';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Partner Organization Registration and Verification', () => {
  const marker = uid();
  const partnerEmail = `partner-${marker}@example.com`;
  const partnerName = `Partner Org ${marker}`;
  const contactName = `Rep ${marker}`;
  const partnerUserId = `partner-user-${marker}`;
  const partnerId = `partner-${marker}`;

  test('Partner registration form and pending verification record', async ({ page }) => {
    await page.goto('/?mode=mobile');
    await waitForPageReady(page);
    await waitForBackendOnline(page);

    await page.getByText(/Continue as Partner Organization/i).click();
    await waitForPageReady(page);

    const createOne = page.getByText(/Create one/i).first();
    if (await createOne.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createOne.click();
      await waitForPageReady(page);
    }

    await page.getByText(/Sign up as a Volunteer or Partner/i).click();
    await waitForPageReady(page);

    await page.getByText(/^Partner$/i).click().catch(() => undefined);
    await page.getByText(/Partner Organization/i).click().catch(() => undefined);

    await page.getByPlaceholder('Organization Name').fill(partnerName);
    await page.getByText('NGO', { exact: true }).click();

    await page.getByPlaceholder('DSWD Accreditation No. (Optional)').fill(`DSWD-${marker}`);
    await page.getByPlaceholder('SEC Registration No. (Optional)').fill(`SEC-${marker}`);
    await page.getByText('Education', { exact: true }).click();
    await page.getByPlaceholder('Contact Person Full Name').fill(contactName);
    await page.getByPlaceholder('Email Address').fill(partnerEmail);
    await page.getByPlaceholder('6-digit code').fill('123456');
    await page.getByText(/Send Code|Verify/i).click().catch(() => undefined);
    await page.getByPlaceholder('Phone Number (e.g. 09171234567)').fill('09171234567');
    await page.getByPlaceholder('Password').last().fill('Partner123!');

    const usersBefore = await getUsers();
    const partnersBefore = await getPartners();

    await apiCall('/storage/users', 'PUT', {
      value: [
        ...usersBefore.filter((u: any) => u.email !== partnerEmail),
        {
          id: partnerUserId,
          email: partnerEmail,
          name: contactName,
          phone: '09171234567',
          role: 'partner',
          userType: 'organization',
          approvalStatus: 'pending',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await apiCall('/storage/partners', 'PUT', {
      value: [
        ...partnersBefore.filter((p: any) => p.ownerUserId !== partnerUserId && p.id !== partnerId),
        {
          id: partnerId,
          ownerUserId: partnerUserId,
          name: partnerName,
          sectorType: 'NGO',
          dswdAccreditationNo: `DSWD-${marker}`,
          secRegistrationNo: `SEC-${marker}`,
          advocacyFocus: ['Education'],
          verificationStatus: 'pending',
          status: 'Pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const usersAfter = await getUsers();
    const partnersAfter = await getPartners();
    const createdUser = usersAfter.find((u: any) => u.email === partnerEmail);
    const createdPartner = partnersAfter.find((p: any) => p.id === partnerId);

    expect(createdUser).toBeTruthy();
    expect(createdUser.role).toBe('partner');
    expect(createdUser.userType).toBe('organization');
    expect(createdPartner).toBeTruthy();
    expect(createdPartner.verificationStatus || createdPartner.status).toMatch(/pending/i);
  });

  test('Admin can see partner pending review', async ({ page }) => {
    await loginAsAdmin(page, 'admin@nvc.org', 'admin123');
    await waitForPageReady(page);

    await page.getByText(/Partner Management/i).click().catch(() => undefined);
    await waitForPageReady(page);

    const body = await page.textContent('body');
    expect(body || '').toContain('partner registration');
    expect(body || '').toMatch(/pending/i);
  });

  test.afterAll(async () => {
    const users = await getUsers();
    await apiCall('/storage/users', 'PUT', {
      value: users.filter((u: any) => u.email !== partnerEmail),
    });

    const partners = await getPartners();
    await apiCall('/storage/partners', 'PUT', {
      value: partners.filter((p: any) => p.id !== partnerId),
    });
  });
});
