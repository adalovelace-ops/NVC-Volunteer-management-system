import { test, expect } from '@playwright/test';

test('Send message in TEST EVENT group chat', async ({ page }) => {
  console.log('🔄 Navigating to app...');
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  
  // Login as admin
  console.log('🔑 Logging in as admin...');
  await page.waitForSelector('input[placeholder*="email" i]', { timeout: 10000 });
  await page.fill('input[placeholder*="email" i]', 'admin@nvc.org');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Navigate to Messages (Communication Hub)
  console.log('💬 Navigating to Messages/Communication Hub...');
  await page.waitForSelector('text=Messages', { timeout: 10000 });
  await page.click('text=Messages');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Click Event GC section
  console.log('📋 Clicking Event GC tab...');
  const eventGcTab = page.locator('text=Event GC');
  await expect(eventGcTab).toBeVisible({ timeout: 10000 });
  await eventGcTab.click();
  await page.waitForTimeout(1500);
  console.log('✅ Event GC tab clicked');
  
  // Look for TEST EVENT or Baybay Nutrition Distribution Day in the list
  console.log('🔍 Looking for TEST EVENT or Baybay Nutrition Distribution Day...');
  const testEvent = page.locator('text=TEST EVENT').or(page.locator('text=Baybay Nutrition Distribution Day')).first();
  await expect(testEvent).toBeVisible({ timeout: 10000 });
  console.log('✅ Found event');
  
  await testEvent.click();
  await page.waitForTimeout(2000);
  console.log('✅ Clicked TEST EVENT');
  
  // Find message input
  console.log('📝 Finding message input...');
  const messageInput = page.locator('textarea[placeholder*="message" i], input[placeholder*="Type a message" i]').first();
  await expect(messageInput).toBeVisible({ timeout: 5000 });
  
  const testMessage = `Test message from Playwright ${Date.now()}`;
  console.log(`✍️  Typing message: ${testMessage}`);
  await messageInput.click();
  await messageInput.fill(testMessage);
  await page.waitForTimeout(500);
  
  // Find and click send button (look for icon or text)
  console.log('📤 Looking for send button...');
  const sendButton = page.locator('button').filter({ hasText: /send/i }).or(
    page.locator('button[aria-label*="send" i]')
  ).or(
    page.locator('button:has-text("➤")')
  ).or(
    page.locator('button:has-text("→")')
  ).first();
  
  await expect(sendButton).toBeVisible({ timeout: 5000 });
  await sendButton.click();
  console.log('✅ Clicked send button');
  await page.waitForTimeout(3000);
  
  // Check if message appears in chat
  console.log('🔍 Checking if message was sent...');
  const sentMessage = page.locator(`text="${testMessage}"`).or(
    page.locator(`text=${testMessage}`)
  );
  
  await expect(sentMessage).toBeVisible({ timeout: 10000 });
  console.log('✅ SUCCESS! Message sent and displayed in TEST EVENT chat!');
  
  // Take screenshot
  await page.screenshot({ path: 'test-event-gc-success.png', fullPage: true });
  console.log('📸 Screenshot saved as test-event-gc-success.png');
});
