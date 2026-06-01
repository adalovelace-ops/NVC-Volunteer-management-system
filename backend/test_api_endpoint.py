"""
Test the API endpoint that mobile uses to get programs.
"""
from dotenv import load_dotenv
from db import get_connection
from api import _build_projects_snapshot
import json

load_dotenv()

def test_api_endpoint():
    with get_connection() as connection:
        print("=== TESTING API ENDPOINT ===\n")
        
        # Simulate what the API does
        snapshot = _build_projects_snapshot(
            connection,
            user_id="volunteer-1",
            role="volunteer",
            requested_fields={"projects", "programTracks"}
        )
        
        print(f"Program Tracks returned: {len(snapshot.get('programTracks', []))}")
        for track in snapshot.get('programTracks', []):
            print(f"  - {track.get('id')}: {track.get('title')}")
        
        print(f"\nProjects returned: {len(snapshot.get('projects', []))}")

if __name__ == "__main__":
    test_api_endpoint()
