"""
Test script to verify the remove volunteer from event functionality.
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_remove_volunteer():
    """Test removing a volunteer from an event."""
    
    # Test data - replace with actual IDs from your database
    project_id = "event-1780217506399"  # Quarterly Assessment event
    volunteer_id = "volunteer-1780189738"  # Test volunteer
    
    print(f"Testing removal of volunteer {volunteer_id} from event {project_id}...")
    
    # Call the DELETE endpoint
    response = requests.delete(
        f"{BASE_URL}/projects/{project_id}/volunteers/{volunteer_id}"
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print("\n✓ Successfully removed volunteer from event!")
            print(f"Updated project volunteers: {data.get('project', {}).get('volunteers', [])}")
            print(f"Updated project joinedUserIds: {data.get('project', {}).get('joinedUserIds', [])}")
        else:
            print("\n✗ API returned success=False")
    else:
        print(f"\n✗ Failed with status {response.status_code}")
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_remove_volunteer()
