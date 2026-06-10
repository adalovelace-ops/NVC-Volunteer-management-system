#!/usr/bin/env python3
"""Test the group message fix for volunteer participation lookup."""

import json
import requests
import sys
from datetime import datetime

# Test configuration
API_URL = "http://localhost:8000"
PROJECT_ID = "test-event-001"  # You can update this with a real event ID

# Create a test message
test_message = {
    "id": f"test-msg-{datetime.now().timestamp()}",
    "projectId": PROJECT_ID,
    "senderId": "test-volunteer-user-id",
    "content": "Test message from volunteer",
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "kind": "message",
    "attachments": []
}

print(f"Testing group message endpoint with fallback...")
print(f"Project ID: {PROJECT_ID}")
print(f"Sender ID: {test_message['senderId']}")
print(f"Message: {test_message['content']}")
print()

try:
    response = requests.post(
        f"{API_URL}/projects/{PROJECT_ID}/group-messages",
        json=test_message,
        headers={"Content-Type": "application/json"},
        timeout=5
    )
    
    print(f"Response Status: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS: Message sent successfully!")
        result = response.json()
        print(f"Message ID: {result.get('id')}")
    elif response.status_code in [400, 403, 404]:
        print(f"\n⚠️  VALIDATION ERROR: {response.text}")
        print("This could be: invalid project, permission denied, or bad request")
    else:
        print(f"\n❌ ERROR: Unexpected status code {response.status_code}")
        
except requests.exceptions.ConnectionError:
    print("❌ ERROR: Cannot connect to backend at localhost:8000")
    print("Make sure the backend is running with: python -m backend.api")
except Exception as e:
    print(f"❌ ERROR: {e}")
    sys.exit(1)
