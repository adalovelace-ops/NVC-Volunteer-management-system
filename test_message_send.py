#!/usr/bin/env python3
"""Test the group message endpoint with the latest fix."""

import json
import requests
from datetime import datetime
import sys

API_URL = "http://localhost:8000"

# Test with a real event ID from the system
# You may need to update this to match an actual event in your system
PROJECT_ID = "event-1780556736801"

test_message = {
    "id": f"test-msg-{int(datetime.now().timestamp() * 1000)}",
    "projectId": PROJECT_ID,
    "senderId": "admin-user-id",  # Using admin account
    "content": "Test message from admin account",
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "kind": "message",
    "attachments": []
}

print("=" * 60)
print("Testing Group Chat Message (with fallback fix)")
print("=" * 60)
print(f"Project ID: {PROJECT_ID}")
print(f"Message: {test_message['content']}")
print()

try:
    print("[1/2] Sending POST request to backend...")
    response = requests.post(
        f"{API_URL}/projects/{PROJECT_ID}/group-messages",
        json=test_message,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    print(f"[2/2] Response received")
    print()
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    print()
    
    if response.status_code == 200:
        print("=" * 60)
        print("✅ SUCCESS! Message sent successfully")
        print("=" * 60)
        result = response.json()
        print(f"Message ID: {result.get('id')}")
        print(f"Timestamp: {result.get('timestamp')}")
        sys.exit(0)
    elif response.status_code in [400, 403, 404]:
        print("=" * 60)
        print("⚠️  VALIDATION ERROR")
        print("=" * 60)
        try:
            error = response.json()
            print(f"Detail: {error.get('detail', 'No detail provided')}")
        except:
            print(f"Error: {response.text}")
        sys.exit(1)
    else:
        print("=" * 60)
        print(f"❌ ERROR: Unexpected status {response.status_code}")
        print("=" * 60)
        sys.exit(1)
        
except requests.exceptions.ConnectionError:
    print("=" * 60)
    print("❌ CONNECTION ERROR")
    print("=" * 60)
    print("Cannot connect to backend at localhost:8000")
    print("Make sure the backend is running with: python -m backend.api")
    sys.exit(1)
except Exception as e:
    print("=" * 60)
    print("❌ ERROR")
    print("=" * 60)
    print(f"Error: {e}")
    sys.exit(1)
