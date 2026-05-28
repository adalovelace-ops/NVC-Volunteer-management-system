const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const inputs = await page.$$eval('input', els =>
      els.map(e => ({ outerHTML: e.outerHTML, type: e.type, placeholder: e.placeholder, name: e.name }))
    );
    const buttons = await page.$$eval('button', els => els.map(b => ({ outerHTML: b.outerHTML, text: b.textContent })));
    console.log(JSON.stringify({ inputs, buttons }, null, 2));
  } catch (e) {
    console.error('ERROR', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
