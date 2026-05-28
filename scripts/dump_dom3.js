const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(10000);
  const html = await page.evaluate(() => document.body.innerHTML.slice(0,5000));
  console.log(html);
  const loginEls = await page.evaluate(() => Array.from(document.querySelectorAll('*')).filter(el => el.textContent && el.textContent.match(/Log In|Login|Sign In/i)).map(el => ({ tag: el.tagName, role: el.getAttribute('role'), ariaDisabled: el.getAttribute('aria-disabled'), text: el.textContent.trim().slice(0,100), outer: el.outerHTML.slice(0,200) })));  
  console.log(JSON.stringify(loginEls, null, 2));
  await browser.close();
})();
