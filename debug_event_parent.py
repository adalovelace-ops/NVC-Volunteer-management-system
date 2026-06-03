#!/usr/bin/env python3
import json
import psycopg
from backend.db import get_postgres_connection

conn = get_postgres_connection()
cursor = conn.cursor()

# First, let's see what columns exist
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects'
    ORDER BY ordinal_position
""")
columns = cursor.fetchall()
print("Projects table columns:")
for col in columns:
    print(f"  {col[0]}: {col[1]}")

# Now get the data - use the actual column names from the schema
cursor.execute('SELECT * FROM projects ORDER BY title LIMIT 5')
rows = cursor.fetchall()
print(f"\nTotal rows: {len(rows)}")

# Get column names from cursor description
col_names = [desc[0] for desc in cursor.description]
print(f"\nColumn names: {col_names}")

cursor.close()
conn.close()

# Find the event and both projects
event = None
na_project = None
nutrition_test_project = None
nutrition_program = None

for p in all_projects:
    title = p.get('title', '').lower()
    if 'quarterly assessment test' in title and p.get('isEvent'):
        event = p
    elif title == 'n/a':
        na_project = p
    elif 'nutrition test' in title and not p.get('isEvent'):
        nutrition_test_project = p
    elif 'nutrition test program' in title:
        nutrition_program = p

print("=" * 80)
print("EVENT:")
if event:
    print(f"  ID: {event.get('id')}")
    print(f"  Title: {event.get('title')}")
    print(f"  Parent Project ID: {event.get('parentProjectId')}")
    print(f"  Is Event: {event.get('isEvent')}")
else:
    print("  NOT FOUND")

print("\n" + "=" * 80)
print("N/A PROJECT:")
if na_project:
    print(f"  ID: {na_project.get('id')}")
    print(f"  Title: {na_project.get('title')}")
    print(f"  Parent Project ID: {na_project.get('parentProjectId')}")
    print(f"  Is Event: {na_project.get('isEvent')}")
else:
    print("  NOT FOUND")

print("\n" + "=" * 80)
print("NUTRITION TEST PROJECT:")
if nutrition_test_project:
    print(f"  ID: {nutrition_test_project.get('id')}")
    print(f"  Title: {nutrition_test_project.get('title')}")
    print(f"  Parent Project ID: {nutrition_test_project.get('parentProjectId')}")
    print(f"  Is Event: {nutrition_test_project.get('isEvent')}")
else:
    print("  NOT FOUND")

print("\n" + "=" * 80)
print("NUTRITION PROGRAM:")
if nutrition_program:
    print(f"  ID: {nutrition_program.get('id')}")
    print(f"  Title: {nutrition_program.get('title')}")
    print(f"  Parent Project ID: {nutrition_program.get('parentProjectId')}")
else:
    print("  NOT FOUND")

print("\n" + "=" * 80)
print("ANALYSIS:")
if event and na_project:
    if event.get('parentProjectId') == na_project.get('id'):
        print(f"✓ Event's parentProjectId CORRECTLY points to N/A project")
    else:
        print(f"✗ MISMATCH!")
        print(f"  Event parentProjectId: {event.get('parentProjectId')}")
        print(f"  N/A project ID: {na_project.get('id')}")
        if event.get('parentProjectId') == nutrition_program.get('id'):
            print(f"  → Event is pointing to PROGRAM instead of N/A project")
        elif event.get('parentProjectId') == nutrition_test_project.get('id'):
            print(f"  → Event is pointing to NUTRITION TEST project instead of N/A project")
