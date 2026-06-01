"""
Migrate data from program_tracks to programs table and update the system to use programs table only.
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

print("=== Migrating from program_tracks to programs table ===\n")

# Step 1: Get all data from program_tracks
cursor.execute("SELECT * FROM program_tracks")
program_tracks = cursor.fetchall()

print(f"Found {len(program_tracks)} programs in program_tracks table")

# Step 2: Check current programs table
cursor.execute("SELECT * FROM programs")
existing_programs = cursor.fetchall()
print(f"Found {len(existing_programs)} programs in programs table")

# Step 3: Migrate each program_track to programs table
migrated_count = 0
for track in program_tracks:
    program_id = track['program_tracks_id']
    title = track['title']
    description = track.get('description', '')
    
    print(f"\nMigrating: {title} (ID: {program_id})")
    
    # Check if already exists in programs
    cursor.execute("SELECT programs_id FROM programs WHERE programs_id = %s", (program_id,))
    exists = cursor.fetchone()
    
    if exists:
        print(f"  ✓ Already exists in programs table, skipping")
        continue
    
    # Insert into programs table
    cursor.execute("""
        INSERT INTO programs (
            programs_id,
            title,
            description,
            category,
            status,
            location,
            volunteers_needed,
            volunteers,
            joined_user_ids,
            created_at,
            image_hidden,
            linked_event_count
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
    """, (
        program_id,
        title,
        description or f'{title} program',
        title,  # category
        'Planning',  # status
        '{"latitude": 14.5995, "longitude": 120.9842, "address": "Philippines"}',  # location (default Philippines)
        0,  # volunteers_needed
        '{}',  # volunteers (empty array)
        '{}',  # joined_user_ids (empty array)
        datetime.utcnow().isoformat(),  # created_at
        False,  # image_hidden
        0  # linked_event_count
    ))
    
    migrated_count += 1
    print(f"  ✓ Migrated to programs table")

# Commit the migration
conn.commit()

print(f"\n=== Migration Complete ===")
print(f"Migrated {migrated_count} programs from program_tracks to programs table")

# Step 4: Verify the migration
cursor.execute("SELECT programs_id, title, category FROM programs ORDER BY created_at DESC")
all_programs = cursor.fetchall()

print(f"\n=== Programs in programs table ({len(all_programs)}) ===")
for prog in all_programs:
    print(f"  - {prog['title']} (ID: {prog['programs_id']}, Category: {prog['category']})")

cursor.close()
conn.close()

print("\n✅ Migration successful! The system will now use the 'programs' table.")
print("   You can now delete the 'program_tracks' table if needed.")
