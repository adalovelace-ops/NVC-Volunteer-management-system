#!/usr/bin/env python3
import json
import sys
sys.path.insert(0, '.')
from db import get_connection

with get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT projects_id, title, is_event, location::text, location_region, location_city, parent_project_id FROM projects WHERE title ILIKE '%DISASTER%' ORDER BY title, created_at DESC")
    rows = cursor.fetchall()
    print(f'Found {len(rows)} disaster-related records')
    for r in rows:
        print('---')
        print('id:', r[0])
        print('title:', r[1])
        print('is_event:', r[2])
        print('parent:', r[6])
        print('location:', r[3])
        print('region:', r[4], 'city:', r[5])
