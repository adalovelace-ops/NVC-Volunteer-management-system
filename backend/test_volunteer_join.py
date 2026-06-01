"""Test volunteer join request."""
import requests
import json

# Test data
user_id = "user-volunteer-1780189738"
project_id = "project-1780217407655"  # DISASTER RISK PROTECTION TRAINING (PROJECT)
event_id = "event-1780217506399"  # Quarterly Assessment (EVENT)

print("\n=== Testing Volunteer Join Request ===\n")

# Step 1: Check if volunteer profile exists
print("Step 1: Checking volunteer profile...")
try:
    response = requests.get(f"http://localhost:8000/volunteers/by-user/{user_id}")
    response.raise_for_status()
    volunteer_data = response.json()
    
    if volunteer_data.get('volunteer'):
        volunteer = volunteer_data['volunteer']
        print(f"✅ Volunteer profile found:")
        print(f"   ID: {volunteer['id']}")
        print(f"   Name: {volunteer['name']}")
        print(f"   Email: {volunteer['email']}")
        print(f"   User ID: {volunteer['userId']}")
    else:
        print("❌ No volunteer profile in response")
        print(f"   Response: {json.dumps(volunteer_data, indent=2)}")
except Exception as e:
    print(f"❌ Error getting volunteer profile: {e}")

print("\n" + "="*60 + "\n")

# Step 2: Try to join EVENT (not project)
print("Step 2: Joining EVENT...")
try:
    payload = {
        "userId": user_id
    }
    
    response = requests.post(
        f"http://localhost:8000/projects/{event_id}/join",
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Join successful!")
        print(f"   Event: {result.get('project', {}).get('title')}")
        if result.get('volunteerProfile'):
            print(f"   Volunteer: {result['volunteerProfile']['name']}")
    else:
        print(f"❌ Join failed: {response.status_code}")
        error_detail = response.json().get('detail', response.text)
        print(f"   Error: {error_detail}")
        
except Exception as e:
    print(f"❌ Error joining event: {e}")

print("\n" + "="*60 + "\n")
