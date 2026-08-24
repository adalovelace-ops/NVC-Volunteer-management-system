import { Page, expect } from '@playwright/test';

// ── Page readiness ────────────────────────────────────────────────────────────

export async function waitForPageReady(page: Page, timeout = 8000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => undefined);
}

export async function waitForBackendOnline(page: Page): Promise<void> {
  // Wait for the "Database Connected" status card to appear
  await page
    .waitForSelector('text=Database Connected', { timeout: 15000 })
    .catch(() => undefined);
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Login as admin on the web portal (normal web mode).
 */
export async function loginAsAdmin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForPageReady(page);

  // Check if admin dashboard is already visible
  const dashboard = page.getByText(/Negrense Volunteers for Change \(NVC\)/i).first();
  const alreadyInDashboard = await dashboard.isVisible().catch(() => false);
  if (alreadyInDashboard) {
    return;
  }

  // Click Quick Admin Sign In card
  const quickAdminCard = page.getByText('Tap to sign in instantly').first();
  if (await quickAdminCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await quickAdminCard.click();
  } else {
    const emailInput = page.locator('input[placeholder="Email, Username, or Phone"]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill(email);
      await page.fill('input[placeholder="Password"]', password);
      await page.getByText('Log In', { exact: true }).first().click();
    }
  }

  // Wait for login transition into admin workspace
  try {
    await dashboard.waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    const loginError = await page.locator('[role="alert"]').first().textContent().catch(() => undefined);
    throw new Error(
      `Admin login did not reach the dashboard${loginError ? `: ${loginError.trim()}` : '.'}`,
    );
  }
}

/**
 * Login as volunteer or partner using ?mode=mobile in the browser.
 * This renders the full mobile UI (role selection → login → VolunteerNavigator / PartnerNavigator).
 */
export async function loginAsMobile(
  page: Page,
  role: 'volunteer' | 'partner',
  email: string,
  password: string
): Promise<void> {
  // Load the app in mobile mode
  await page.goto('/?mode=mobile');
  await waitForPageReady(page);
  await waitForBackendOnline(page);

  // If already in mobile dashboard, return
  const isDashboard = await page.getByText(/Activities|Browse Projects|Volunteer/i).first().isVisible({ timeout: 1000 }).catch(() => false);
  if (isDashboard) return;

  // Click the role card (Volunteer or Partner Organization)
  const roleCard = role === 'volunteer'
    ? page.getByText(/Continue as Volunteer/i)
    : page.getByText(/Continue as Partner Organization/i);
  
  if (await roleCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await roleCard.click();
    await waitForPageReady(page);
  }

  // Fill mobile credentials
  const emailInput = page.locator('input[placeholder="you@example.com"]').or(page.locator('input[placeholder="Email, Username, or Phone"]')).first();
  await emailInput.fill(email);

  const passInput = page.locator('input[placeholder="••••••••"]').or(page.locator('input[placeholder="Password"]')).first();
  await passInput.fill(password);

  // Click Log in
  const loginButton = page.getByText('Log in', { exact: true }).or(page.getByText('Log In', { exact: true })).first();
  await loginButton.click();

  // Wait for dashboard to load
  await page.waitForTimeout(1500);
  await waitForPageReady(page);
}

// ── Navigation ────────────────────────────────────────────────────────────────

/**
 * Click a tab or nav item by its visible label text.
 * Falls back to clicking the nth sidebar tab item (0-indexed) if text not found.
 */
export async function clickNav(page: Page, label: string | RegExp): Promise<void> {
  // Try text match first
  const locator = page.getByText(label).first();
  const isVisible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
  if (isVisible) {
    await locator.click();
    await waitForPageReady(page);
    return;
  }

  // React Native Web renders tabs as icon-only sidebar items (tabindex=0 divs).
  // Fall back to clicking by tab index based on known tab order per navigator.
  const TAB_ORDER: Record<string, number> = {
    // Admin tabs (AdminNavigator)
    'admin dashboard': 0,
    'dashboard': 0,
    'program management suite': 1,
    'projects': 1,
    'partner management': 2,
    'partners': 2,
    'partner approvals': 3,
    'partnerapprovals': 3,
    'volunteer management': 4,
    'volunteers': 4,
    'map': 5,
    'messages': 6,
    'reports': 7,
    'settings': 8,
    'profile': 9,

    // Volunteer tabs (VolunteerNavigator)
    'my activities': 0,
    'browse projects': 1,
    'emergency & map': 2,
    'my time logs': 3,

    // Partner tabs (PartnerNavigator)
    'my proposals': 1,
    'proposals': 1,
    'partner messages': 3,
  };

  const key = (typeof label === 'string' ? label : label.source).toLowerCase();
  for (const [tabKey, index] of Object.entries(TAB_ORDER)) {
    if (key.includes(tabKey) || tabKey.includes(key)) {
      const tabItem = page.locator(`[role="tab"], [tabindex="0"]`).nth(index);
      if (await tabItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabItem.click();
        await waitForPageReady(page);
        return;
      }
    }
  }

  // Last resort: try regex against any text element
  const anyText = page.locator(`text=${typeof label === 'string' ? label : ''}`).first();
  await anyText.waitFor({ state: 'visible', timeout: 5000 });
  await anyText.click();
  await waitForPageReady(page);
}

/**
 * Click a button by its visible text.
 */
export async function clickButton(page: Page, text: string | RegExp): Promise<void> {
  const btn = page.getByRole('button', { name: text }).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await waitForPageReady(page);
    return;
  }
  // Fallback: any element with that text
  const el = page.getByText(text).first();
  await el.waitFor({ state: 'visible', timeout: 5000 });
  await el.click();
  await waitForPageReady(page);
}

// ── Assertions ────────────────────────────────────────────────────────────────

/**
 * Returns true if the page body contains the given text/regex.
 */
export async function pageContains(page: Page, text: string | RegExp): Promise<boolean> {
  const body = await page.textContent('body').catch(() => '');
  if (!body) return false;
  if (typeof text === 'string') return body.toLowerCase().includes(text.toLowerCase());
  return text.test(body);
}

/**
 * Assert that the page contains the given text/regex.
 */
export async function assertPageContains(page: Page, text: string | RegExp): Promise<void> {
  const found = await pageContains(page, text);
  if (!found) {
    const body = await page.textContent('body').catch(() => '');
    throw new Error(
      `Expected page to contain "${text}" but it did not.\nPage text (first 500 chars):\n${(body || '').slice(0, 500)}`
    );
  }
}
