#!/usr/bin/env python3
"""Check project categories and parent relationships."""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

print("\n=== Checking Projects ===\n")

# Get all projects
response = supabase.table('projects').select(
    'id, title, category, programModule, program_id, parentProjectId, parent_project_id, isEvent, startDate, status'
).execute()

projects = response.data

# Filter upcoming projects
import datetime
upcoming = []
for p in projects:
    if p.get('startDate'):
        try:
            start = datetime.datetime.fromisoformat(p['startDate'].replace('Z', '+00:00'))
            if start >= datetime.datetime.now(datetime.timezone.utc):
                upcoming.append(p)
        except:
            pass

# Sort by start date
upcoming.sort(key=lambda x: x.get('startDate', ''))

print(f"Found {len(upcoming)} upcoming projects:\n")

for p in upcoming[:10]:  # Show first 10
    print(f"Title: {p.get('title', 'N/A')}")
    print(f"  Category: {p.get('category', 'N/A')}")
    print(f"  Program Module: {p.get('programModule', 'N/A')}")
    print(f"  Parent Project ID: {p.get('parentProjectId', 'N/A')}")
    print(f"  program_id: {p.get('program_id', 'N/A')}")
    print(f"  Start Date: {p.get('startDate', 'N/A')}")
    print(f"  Is Event: {p.get('isEvent', False)}")
    print()

# Now check if those parent IDs exist and what their categories are
print("\n=== Checking Parent Programs ===\n")

parent_ids = set()
for p in upcoming:
    if p.get('parentProjectId'):
        parent_ids.add(p['parentProjectId'])
    if p.get('program_id'):
        parent_ids.add(p['program_id'])

for parent_id in parent_ids:
    parent = next((p for p in projects if p['id'] == parent_id), None)
    if parent:
        print(f"Parent: {parent.get('title', 'N/A')} (ID: {parent_id})")
        print(f"  Category: {parent.get('category', 'N/A')}")
        print(f"  Program Module: {parent.get('programModule', 'N/A')}")
        print()
