const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Email"], input[placeholder*="email"]', 'admin@nvc.org');
  await page.fill('input[placeholder*="Password"]', 'admin123');
  const loginLocator = page.getByText(/log\s*in/i).first();
  console.log('login visible:', await loginLocator.isVisible().catch(() => false));
  console.log('login enabled:', await loginLocator.getAttribute('aria-disabled').catch(() => null));
  await loginLocator.click().catch((e) => console.error('click failed', e.message));
  await page.waitForTimeout(2000);
  console.log('url:', page.url());
  console.log('page title:', await page.title());
  const text = await page.textContent('body');
  console.log('body snippet:', text ? text.slice(0,1000) : '<none>');
  await browser.close();
})();
