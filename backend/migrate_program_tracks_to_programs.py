"""
Migration script to move program_tracks data to programs table.
This makes programs deletable and uses the standard programs table.
"""
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from db import get_connection
from app_storage_seed import get_postgres_hot_storage_collection, replace_postgres_hot_storage_collection

load_dotenv()

def migrate_program_tracks_to_programs():
    """Move program_tracks to programs table."""
    
    with get_connection() as connection:
        print("=== MIGRATING PROGRAM TRACKS TO PROGRAMS ===\n")
        
        # Get existing data
        program_tracks = get_postgres_hot_storage_collection(connection, "programTracks")
        programs = get_postgres_hot_storage_collection(connection, "programs")
        
        print(f"Found {len(program_tracks)} program tracks")
        print(f"Found {len(programs)} existing programs\n")
        
        # Convert program_tracks to programs format
        now_iso = datetime.now(timezone.utc).isoformat()
        new_programs = []
        
        for track in program_tracks:
            program = {
                "id": f"program:{track['id']}",  # Add program: prefix to avoid ID conflicts
                "title": track["title"],
                "description": track.get("description", ""),
                "partnerId": "",
                "programModule": track["title"],  # Use title as module name
                "status": "Planning",
                "category": track["title"],  # Use title as category
                "startDate": track.get("createdAt", now_iso),
                "endDate": track.get("createdAt", now_iso),
                "location": {
                    "latitude": 0,
                    "longitude": 0,
                    "address": "Program location to be finalized",
                },
                "volunteersNeeded": 0,
                "volunteers": [],
                "joinedUserIds": [],
                "icon": track.get("icon", "folder"),
                "color": track.get("color", "#64748b"),
                "imageUrl": track.get("imageUrl", ""),
                "sortOrder": track.get("sortOrder", 0),
                "isActive": track.get("isActive", True),
                "parentProjectId": None,  # Top-level programs have no parent
                "isEvent": False,  # Programs are not events
                "createdAt": track.get("createdAt", now_iso),
                "updatedAt": now_iso,
                "statusUpdates": [],
            }
            new_programs.append(program)
            print(f"✓ Converting: {track['title']} → program:{track['id']}")
        
        # Merge with existing programs
        all_programs = programs + new_programs
        
        # Update programs collection
        replace_postgres_hot_storage_collection(connection, "programs", all_programs)
        
        # Clear program_tracks (we're not using it anymore)
        replace_postgres_hot_storage_collection(connection, "programTracks", [])
        
        connection.commit()
        
        print(f"\n✅ Migration complete!")
        print(f"   - Migrated {len(new_programs)} program tracks to programs")
        print(f"   - Total programs now: {len(all_programs)}")
        print(f"   - Cleared program_tracks table")
        print(f"\nPrograms created:")
        for prog in new_programs:
            print(f"   - {prog['id']}: {prog['title']}")

if __name__ == "__main__":
    migrate_program_tracks_to_programs()
