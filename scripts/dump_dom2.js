const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const html = await page.evaluate(() => document.body.innerHTML.slice(0,5000));
  console.log(html);
  const buttonRoles = await page.evaluate(() => Array.from(document.querySelectorAll('[role]')).map(e => ({ tag: e.tagName, role: e.getAttribute('role'), text: e.textContent?.trim().slice(0,50) })).slice(0,50));
  console.log(JSON.stringify(buttonRoles, null, 2));
  await browser.close();
})();
