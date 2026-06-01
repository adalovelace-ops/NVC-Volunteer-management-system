"""
Proper migration: Move program_tracks to programs with correct schema.
"""
import os
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from db import get_connection

load_dotenv()

def migrate_programs():
    """
    1. Read existing program_tracks
    2. Insert into programs table with correct schema
    3. Add 4 seeded programs
    4. Delete program_tracks table
    """
    
    with get_connection() as connection:
        print("=== PROGRAMS MIGRATION ===\n")
        
        # Step 1: Read existing program_tracks
        print("Step 1: Reading program_tracks...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM program_tracks")
            tracks = cursor.fetchall()
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'program_tracks'
                ORDER BY ordinal_position
            """)
            columns = [row[0] for row in cursor.fetchall()]
            
            print(f"   Found {len(tracks)} program tracks")
            
            # Convert to dict
            tracks_data = []
            for track in tracks:
                track_dict = dict(zip(columns, track))
                tracks_data.append(track_dict)
                print(f"   - {track_dict.get('title')}")
        
        # Step 2: Prepare programs to insert
        print("\nStep 2: Preparing programs...")
        now_iso = datetime.now(timezone.utc).isoformat()
        
        programs_to_insert = []
        
        # Convert existing program_tracks
        for track in tracks_data:
            program = {
                "programs_id": f"program:{track.get('program_tracks_id', 'unknown')}",
                "created_at": track.get("created_at", now_iso),
                "title": track.get("title", "Unknown Program"),
                "description": track.get("description", ""),
                "partner_id": "",
                "image_url": track.get("image_url", ""),
                "image_hidden": False,
                "program_module": track.get("title", "Unknown"),
                "status_mode": "manual",
                "manual_status": "Planning",
                "status": "Planning",
                "category": track.get("title", "Unknown"),
                "start_date": now_iso,
                "end_date": now_iso,
                "location": json.dumps({"latitude": 0, "longitude": 0, "address": "Program location to be finalized"}),
                "volunteers_needed": 0,
                "volunteers": [],
                "joined_user_ids": [],
                "linked_event_count": 0,
                "updated_at": now_iso,
                "icon": track.get("icon", "folder"),
                "color": track.get("color", "#666666"),
                "id": f"program:{track.get('program_tracks_id', 'unknown')}",
                "program_id": None,
            }
            programs_to_insert.append(program)
            print(f"   ✓ Converted: {program['title']}")
        
        # Add 4 seeded programs
        seeded_programs = [
            {
                "programs_id": "program:Nutrition",
                "created_at": now_iso,
                "title": "Nutrition",
                "description": "Food security and health programs for children and families.",
                "partner_id": "",
                "image_url": "",
                "image_hidden": False,
                "program_module": "Nutrition",
                "status_mode": "manual",
                "manual_status": "Planning",
                "status": "Planning",
                "category": "Nutrition",
                "start_date": now_iso,
                "end_date": now_iso,
                "location": json.dumps({"latitude": 0, "longitude": 0, "address": "Program location to be finalized"}),
                "volunteers_needed": 0,
                "volunteers": [],
                "joined_user_ids": [],
                "linked_event_count": 0,
                "updated_at": now_iso,
                "icon": "restaurant",
                "color": "#dc2626",
                "id": "program:Nutrition",
                "program_id": None,
            },
            {
                "programs_id": "program:Education",
                "created_at": now_iso,
                "title": "Education",
                "description": "Learning, literacy, and skill development for students.",
                "partner_id": "",
                "image_url": "",
                "image_hidden": False,
                "program_module": "Education",
                "status_mode": "manual",
                "manual_status": "Planning",
                "status": "Planning",
                "category": "Education",
                "start_date": now_iso,
                "end_date": now_iso,
                "location": json.dumps({"latitude": 0, "longitude": 0, "address": "Program location to be finalized"}),
                "volunteers_needed": 0,
                "volunteers": [],
                "joined_user_ids": [],
                "linked_event_count": 0,
                "updated_at": now_iso,
                "icon": "school",
                "color": "#2563eb",
                "id": "program:Education",
                "program_id": None,
            },
            {
                "programs_id": "program:Livelihood",
                "created_at": now_iso,
                "title": "Livelihood",
                "description": "Economic empowerment and vocational training programs.",
                "partner_id": "",
                "image_url": "",
                "image_hidden": False,
                "program_module": "Livelihood",
                "status_mode": "manual",
                "manual_status": "Planning",
                "status": "Planning",
                "category": "Livelihood",
                "start_date": now_iso,
                "end_date": now_iso,
                "location": json.dumps({"latitude": 0, "longitude": 0, "address": "Program location to be finalized"}),
                "volunteers_needed": 0,
                "volunteers": [],
                "joined_user_ids": [],
                "linked_event_count": 0,
                "updated_at": now_iso,
                "icon": "work",
                "color": "#7c3aed",
                "id": "program:Livelihood",
                "program_id": None,
            },
            {
                "programs_id": "program:Disaster",
                "created_at": now_iso,
                "title": "Disaster",
                "description": "Preparedness, relief, and recovery programs for affected communities.",
                "partner_id": "",
                "image_url": "",
                "image_hidden": False,
                "program_module": "Disaster",
                "status_mode": "manual",
                "manual_status": "Planning",
                "status": "Planning",
                "category": "Disaster",
                "start_date": now_iso,
                "end_date": now_iso,
                "location": json.dumps({"latitude": 0, "longitude": 0, "address": "Program location to be finalized"}),
                "volunteers_needed": 0,
                "volunteers": [],
                "joined_user_ids": [],
                "linked_event_count": 0,
                "updated_at": now_iso,
                "icon": "warning",
                "color": "#f97316",
                "id": "program:Disaster",
                "program_id": None,
            },
        ]
        
        for prog in seeded_programs:
            programs_to_insert.append(prog)
            print(f"   ✓ Prepared: {prog['title']}")
        
        # Step 3: Insert into programs table
        print(f"\nStep 3: Inserting {len(programs_to_insert)} programs...")
        with connection.cursor() as cursor:
            for prog in programs_to_insert:
                cursor.execute("""
                    INSERT INTO programs (
                        programs_id, created_at, title, description, partner_id,
                        image_url, image_hidden, program_module, status_mode, manual_status,
                        status, category, start_date, end_date, location,
                        volunteers_needed, volunteers, joined_user_ids, linked_event_count,
                        updated_at, icon, color, id, program_id
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s
                    )
                """, (
                    prog["programs_id"], prog["created_at"], prog["title"], prog["description"], prog["partner_id"],
                    prog["image_url"], prog["image_hidden"], prog["program_module"], prog["status_mode"], prog["manual_status"],
                    prog["status"], prog["category"], prog["start_date"], prog["end_date"], prog["location"],
                    prog["volunteers_needed"], prog["volunteers"], prog["joined_user_ids"], prog["linked_event_count"],
                    prog["updated_at"], prog["icon"], prog["color"], prog["id"], prog["program_id"]
                ))
                print(f"   ✓ Inserted: {prog['title']}")
        
        # Step 4: Drop program_tracks table
        print("\nStep 4: Dropping program_tracks table...")
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS program_tracks CASCADE")
            print("   ✓ program_tracks table dropped")
        
        connection.commit()
        
        print(f"\n✅ MIGRATION COMPLETE!")
        print(f"   - Migrated {len(tracks_data)} existing program tracks")
        print(f"   - Added {len(seeded_programs)} seeded programs")
        print(f"   - Total programs: {len(programs_to_insert)}")
        print(f"   - Dropped program_tracks table")
        
        # Verify
        print("\nStep 5: Verifying...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM programs")
            count = cursor.fetchone()[0]
            print(f"   ✓ programs table now has {count} records")

if __name__ == "__main__":
    migrate_programs()
