"""Test sending a message in event group chat"""
import asyncio
from playwright.async_api import async_playwright, expect

async def test_event_gc_message():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            print("🔄 Navigating to login page...")
            await page.goto("http://localhost:8081")
            await page.wait_for_load_state("networkidle")
            
            # Login as admin
            print("🔑 Logging in as admin...")
            await page.fill('input[placeholder*="email" i]', 'admin@nvc.org')
            await page.fill('input[type="password"]', 'admin123')
            await page.click('text=Sign In')
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)
            
            # Navigate to Messages/Communication Hub
            print("💬 Opening Communication Hub...")
            messages_link = page.locator('text=Messages').or_(page.locator('[data-testid="messages-nav"]'))
            await messages_link.click()
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)
            
            # Look for Event GC section
            print("🔍 Looking for Event GC section...")
            event_gc_button = page.locator('text=Event GC').or_(page.locator('text=Event').first)
            
            if await event_gc_button.count() > 0:
                await event_gc_button.click()
                await asyncio.sleep(1)
            else:
                print("⚠️  Event GC button not found, trying to find events in sidebar...")
            
            # Look for a test event in the list
            print("🔍 Looking for test events...")
            test_event = page.locator('text=/TEST.*EVENT/i').or_(page.locator('text=/Kabankalan/i')).first
            
            if await test_event.count() > 0:
                print(f"✅ Found test event, clicking...")
                await test_event.click()
                await asyncio.sleep(2)
                
                # Find message input
                print("📝 Finding message input...")
                message_input = page.locator('textarea[placeholder*="message" i], input[placeholder*="message" i]').first
                
                if await message_input.count() > 0:
                    test_message = f"Test message from automation - {asyncio.get_event_loop().time()}"
                    print(f"✍️  Typing message: {test_message}")
                    await message_input.fill(test_message)
                    await asyncio.sleep(1)
                    
                    # Find and click send button
                    print("📤 Clicking send button...")
                    send_button = page.locator('button:has-text("Send")').or_(
                        page.locator('button[aria-label*="send" i]')
                    ).or_(
                        page.locator('[data-testid="send-message"]')
                    ).first
                    
                    if await send_button.count() > 0:
                        await send_button.click()
                        await asyncio.sleep(2)
                        
                        # Check if message appears in chat
                        print("✅ Checking if message was sent...")
                        message_element = page.locator(f'text={test_message}')
                        
                        if await message_element.count() > 0:
                            print("✅ SUCCESS! Message sent and displayed in chat!")
                            print(f"✅ Message content: {test_message}")
                        else:
                            print("❌ FAILED: Message not found in chat after sending")
                            
                            # Check for error messages
                            error_msg = page.locator('text=/error|failed/i')
                            if await error_msg.count() > 0:
                                error_text = await error_msg.first.text_content()
                                print(f"❌ Error message: {error_text}")
                    else:
                        print("❌ FAILED: Send button not found")
                else:
                    print("❌ FAILED: Message input not found")
            else:
                print("❌ FAILED: No test event found in the list")
                
            # Take a screenshot for debugging
            await page.screenshot(path="test_event_gc_screenshot.png")
            print("📸 Screenshot saved as test_event_gc_screenshot.png")
            
        except Exception as e:
            print(f"❌ ERROR: {e}")
            await page.screenshot(path="test_event_gc_error.png")
            print("📸 Error screenshot saved as test_event_gc_error.png")
            import traceback
            traceback.print_exc()
        
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_event_gc_message())
