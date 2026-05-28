import { Page, expect } from '@playwright/test';

// ── Page readiness ────────────────────────────────────────────────────────────

export async function waitForPageReady(page: Page, timeout = 8000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => undefined);
  await page.waitForTimeout(400);
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
  await page.goto('/');
  await waitForPageReady(page);
  await waitForBackendOnline(page);

  await page.fill('input[placeholder="Email, Username, or Phone"]', email);
  await page.fill('input[placeholder="Password"]', password);
  await page.click('text=Log In');

  await page.waitForURL(/.*\//, { timeout: 10000 }).catch(() => undefined);
  await waitForPageReady(page);
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

  // Click the role card (Volunteer or Partner Organization)
  if (role === 'volunteer') {
    await page.getByText('Continue as Volunteer').click();
  } else {
    await page.getByText('Continue as Partner Organization').click();
  }
  await waitForPageReady(page);

  // Fill credentials
  await page.fill('input[placeholder="Email, Username, or Phone"]', email);
  await page.fill('input[placeholder="Password"]', password);
  await page.getByText('Log In').click();

  // Wait for dashboard to load
  await waitForPageReady(page);
  await page.waitForTimeout(1500);
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
    'analytics': 8,
    'user management': 9,
    'users': 9,
    'admin profile': 10,
    'profile': 10,
    // Volunteer tabs (VolunteerNavigator): Dashboard, Projects, Tasks, Map, Messages, Reports, Profile
    'volunteer dashboard': 0,
    'my tasks': 2,
    'tasks': 2,
    'impact map': 3,
    'my reports': 5,
    'my profile': 6,
    // Partner tabs (PartnerNavigator): Dashboard, Programs, Projects, Map, Messages, Reports, Profile
    'partner dashboard': 0,
    'program management': 1,
    'programs': 1,
    'my projects': 2,
    'partner messages': 4,
    'partner reports': 5,
    'partner profile': 6,
  };

  const labelStr = typeof label === 'string' ? label.toLowerCase() : '';
  const tabIndex = TAB_ORDER[labelStr];

  if (tabIndex !== undefined) {
    // The tab bar items are the first N consecutive tabindex=0 divs at the same x position
    // (they form a vertical sidebar). Find them by looking for divs clustered at the left edge.
    const allTabs = page.locator('div[tabindex="0"]');
    const count = await allTabs.count();

    // Collect bounding boxes to find the sidebar tabs (small, same x, stacked vertically)
    const boxes: Array<{ index: number; box: { x: number; y: number; width: number; height: number } }> = [];
    for (let i = 0; i < Math.min(count, 30); i++) {
      const box = await allTabs.nth(i).boundingBox().catch(() => null);
      if (box && box.width < 80 && box.height < 60) {
        boxes.push({ index: i, box });
      }
    }

    // Sort by y position and pick the nth one
    boxes.sort((a, b) => a.box.y - b.box.y);
    if (tabIndex < boxes.length) {
      await allTabs.nth(boxes[tabIndex].index).click();
      await waitForPageReady(page);
      return;
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
