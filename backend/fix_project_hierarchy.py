"""
Fix the project hierarchy so projects appear on the map.

The map only shows:
1. Projects that have a parentProjectId (belong to a program)
2. Events (isEvent = true)

This script will:
1. Create a Nutrition program if it doesn't exist
2. Update the existing project to belong to that program
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import json

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Check if Nutrition program exists
cursor.execute("""
    SELECT projects_id, title, parent_project_id, is_event
    FROM projects 
    WHERE title ILIKE '%nutrition%' AND parent_project_id IS NULL AND is_event = false
    ORDER BY created_at DESC
""")

programs = cursor.fetchall()
print(f"Found {len(programs)} potential Nutrition programs")

if programs:
    nutrition_program_id = programs[0]['projects_id']
    print(f"Using existing program: {programs[0]['title']} (ID: {nutrition_program_id})")
else:
    # Create a Nutrition program
    print("Creating new Nutrition program...")
    cursor.execute("""
        INSERT INTO projects (
            projects_id, title, description, category, program_module, 
            status, is_event, parent_project_id, location, created_at, updated_at
        ) VALUES (
            'program-nutrition-' || extract(epoch from now())::bigint,
            'Nutrition Program',
            'Nutrition and food security initiatives to support undernourished children and communities',
            'Nutrition',
            'Nutrition',
            'In Progress',
            false,
            NULL,
            '{"address": "Negros Island Region (NIR)", "latitude": 10.68, "longitude": 122.97}'::jsonb,
            now(),
            now()
        )
        RETURNING projects_id
    """)
    nutrition_program_id = cursor.fetchone()['projects_id']
    print(f"Created Nutrition program with ID: {nutrition_program_id}")
    conn.commit()

# Find standalone projects (no parent, not events)
cursor.execute("""
    SELECT projects_id, title, parent_project_id, is_event
    FROM projects 
    WHERE parent_project_id IS NULL AND is_event = false AND projects_id != %s
    ORDER BY created_at DESC
""", (nutrition_program_id,))

standalone_projects = cursor.fetchall()
print(f"\nFound {len(standalone_projects)} standalone projects that won't appear on the map:")

for proj in standalone_projects:
    print(f"  - {proj['title']} (ID: {proj['projects_id']})")

if standalone_projects:
    print(f"\nUpdating {len(standalone_projects)} projects to belong to the Nutrition program...")
    
    for proj in standalone_projects:
        cursor.execute("""
            UPDATE projects 
            SET parent_project_id = %s, updated_at = now()
            WHERE projects_id = %s
        """, (nutrition_program_id, proj['projects_id']))
        print(f"  ✓ Updated: {proj['title']}")
    
    conn.commit()
    print("\n✅ All projects updated successfully!")
    print(f"Projects now belong to program: {nutrition_program_id}")
else:
    print("\nNo standalone projects found to update.")

# Verify the changes
cursor.execute("""
    SELECT projects_id, title, parent_project_id, is_event
    FROM projects 
    WHERE parent_project_id = %s OR projects_id = %s
    ORDER BY created_at DESC
""", (nutrition_program_id, nutrition_program_id))

hierarchy = cursor.fetchall()
print(f"\n=== Current Hierarchy ===")
for item in hierarchy:
    if item['projects_id'] == nutrition_program_id:
        print(f"📁 PROGRAM: {item['title']}")
    elif item['is_event']:
        print(f"  📅 EVENT: {item['title']}")
    else:
        print(f"  📋 PROJECT: {item['title']}")

cursor.close()
conn.close()

print("\n✅ Done! Your projects should now appear on the Impact Explorer map.")
