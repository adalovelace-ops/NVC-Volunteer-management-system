"""
Test the HTTP endpoint for programs.
"""
import requests
import json

def test_endpoint():
    print("=== TESTING HTTP ENDPOINT ===\n")
    
    # Test the projects snapshot endpoint
    url = "http://localhost:8000/projects/snapshot?fields=programTracks"
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}\n")
        
        if response.status_code == 200:
            data = response.json()
            program_tracks = data.get('programTracks', [])
            print(f"Program Tracks returned: {len(program_tracks)}")
            for track in program_tracks:
                print(f"  - {track.get('id')}: {track.get('title')}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        print("\nIs the backend running? Start it with: python api.py")

if __name__ == "__main__":
    test_endpoint()
