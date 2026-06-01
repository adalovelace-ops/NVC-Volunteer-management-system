"""
Final migration: Move all programs to programs collection and clear program_tracks.
Uses hot storage API to avoid schema issues.
"""
import os
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from db import get_connection
from app_storage_seed import (
    get_postgres_hot_storage_collection,
    replace_postgres_hot_storage_collection
)

load_dotenv()

def final_program_migration():
    """
    1. Move existing program_tracks data to programs collection
    2. Add 4 seeded programs to programs collection
    3. Clear program_tracks collection
    """
    
    with get_connection() as connection:
        print("=== FINAL PROGRAM MIGRATION ===\n")
        
        # Step 1: Get existing data
        print("Step 1: Reading existing data...")
        program_tracks = get_postgres_hot_storage_collection(connection, "programTracks")
        programs = get_postgres_hot_storage_collection(connection, "programs")
        
        print(f"   Found {len(program_tracks)} program tracks")
        print(f"   Found {len(programs)} existing programs")
        
        # Step 2: Convert program_tracks to programs format
        print("\nStep 2: Converting program_tracks to programs...")
        now_iso = datetime.now(timezone.utc).isoformat()
        
        migrated_programs = []
        for track in program_tracks:
            program = {
                "id": f"program:{track.get('id', 'unknown')}",
                "title": track.get("title", "Unknown Program"),
                "description": track.get("description", ""),
                "partnerId": "",
                "programModule": track.get("title", "Unknown"),
                "status": "Planning",
                "category": track.get("title", "Unknown"),
                "startDate": track.get("createdAt", now_iso),
                "endDate": track.get("createdAt", now_iso),
                "location": {
                    "latitude": 0,
                    "longitude": 0,
                    "address": "Program location to be finalized"
                },
                "volunteersNeeded": 0,
                "volunteers": [],
                "joinedUserIds": [],
                "createdAt": track.get("createdAt", now_iso),
                "updatedAt": now_iso,
                "statusUpdates": [],
                "parentProjectId": None,
                "isEvent": False,
            }
            migrated_programs.append(program)
            print(f"   ✓ Converted: {track.get('title')} → {program['id']}")
        
        # Step 3: Add 4 seeded programs
        print("\nStep 3: Adding 4 seeded programs...")
        seeded_programs = [
            {
                "id": "program:Nutrition",
                "title": "Nutrition",
                "description": "Food security and health programs for children and families.",
                "partnerId": "",
                "programModule": "Nutrition",
                "status": "Planning",
                "category": "Nutrition",
                "startDate": now_iso,
                "endDate": now_iso,
                "location": {"latitude": 0, "longitude": 0, "address": "Program location to be finalized"},
                "volunteersNeeded": 0,
                "volunteers": [],
                "joinedUserIds": [],
                "createdAt": now_iso,
                "updatedAt": now_iso,
                "statusUpdates": [],
                "parentProjectId": None,
                "isEvent": False,
            },
            {
                "id": "program:Education",
                "title": "Education",
                "description": "Learning, literacy, and skill development for students.",
                "partnerId": "",
                "programModule": "Education",
                "status": "Planning",
                "category": "Education",
                "startDate": now_iso,
                "endDate": now_iso,
                "location": {"latitude": 0, "longitude": 0, "address": "Program location to be finalized"},
                "volunteersNeeded": 0,
                "volunteers": [],
                "joinedUserIds": [],
                "createdAt": now_iso,
                "updatedAt": now_iso,
                "statusUpdates": [],
                "parentProjectId": None,
                "isEvent": False,
            },
            {
                "id": "program:Livelihood",
                "title": "Livelihood",
                "description": "Economic empowerment and vocational training programs.",
                "partnerId": "",
                "programModule": "Livelihood",
                "status": "Planning",
                "category": "Livelihood",
                "startDate": now_iso,
                "endDate": now_iso,
                "location": {"latitude": 0, "longitude": 0, "address": "Program location to be finalized"},
                "volunteersNeeded": 0,
                "volunteers": [],
                "joinedUserIds": [],
                "createdAt": now_iso,
                "updatedAt": now_iso,
                "statusUpdates": [],
                "parentProjectId": None,
                "isEvent": False,
            },
            {
                "id": "program:Disaster",
                "title": "Disaster",
                "description": "Preparedness, relief, and recovery programs for affected communities.",
                "partnerId": "",
                "programModule": "Disaster",
                "status": "Planning",
                "category": "Disaster",
                "startDate": now_iso,
                "endDate": now_iso,
                "location": {"latitude": 0, "longitude": 0, "address": "Program location to be finalized"},
                "volunteersNeeded": 0,
                "volunteers": [],
                "joinedUserIds": [],
                "createdAt": now_iso,
                "updatedAt": now_iso,
                "statusUpdates": [],
                "parentProjectId": None,
                "isEvent": False,
            },
        ]
        
        for prog in seeded_programs:
            print(f"   ✓ Prepared: {prog['title']}")
        
        # Step 4: Merge and save to programs collection
        print("\nStep 4: Saving to programs collection...")
        all_programs = programs + migrated_programs + seeded_programs
        replace_postgres_hot_storage_collection(connection, "programs", all_programs)
        print(f"   ✓ Saved {len(all_programs)} programs")
        
        # Step 5: Clear program_tracks
        print("\nStep 5: Clearing program_tracks collection...")
        replace_postgres_hot_storage_collection(connection, "programTracks", [])
        print("   ✓ program_tracks cleared")
        
        connection.commit()
        
        print(f"\n✅ MIGRATION COMPLETE!")
        print(f"   - Migrated {len(migrated_programs)} existing program tracks")
        print(f"   - Added {len(seeded_programs)} seeded programs")
        print(f"   - Total programs now: {len(all_programs)}")
        print(f"   - Cleared program_tracks collection")
        print(f"\n📋 New programs:")
        for prog in migrated_programs + seeded_programs:
            print(f"   - {prog['id']}: {prog['title']}")

if __name__ == "__main__":
    final_program_migration()
