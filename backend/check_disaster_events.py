#!/usr/bin/env python3
"""Check all DISASTER-related projects and events for coordinate issues."""
import sys
sys.path.insert(0, '.')
from db import get_connection
import json

with get_connection() as conn:
    cursor = conn.cursor()
    
    # Check for any DISASTER-related projects or events with bad coordinates
    cursor.execute('''
        SELECT 
            projects_id,
            title,
            is_event,
            location,
            location_region,
            location_city
        FROM projects
        WHERE title ILIKE '%disaster%'
        ORDER BY created_at DESC
        LIMIT 50
    ''')
    
    rows = cursor.fetchall()
    print(f"\n=== All DISASTER-Related Projects & Events ({len(rows)} total) ===\n")
    
    bad_coords = 0
    
    for pid, title, is_event, loc_json, region, city in rows:
        project_type = 'EVENT' if is_event else 'PROJECT'
        print(f"{project_type}: {title}")
        print(f"  ID: {pid}")
        print(f"  Region: {region}, City: {city}")
        
        if loc_json:
            loc = json.loads(loc_json) if isinstance(loc_json, str) else loc_json
            lat = loc.get('latitude')
            lon = loc.get('longitude')
            addr = loc.get('address')
            
            # Check for bad coordinates
            has_bad_coords = (lat is None or lon is None or (lat == 0 and lon == 0))
            
            if has_bad_coords:
                bad_coords += 1
                print(f"  ❌ BAD COORDS: ({lat}, {lon})")
            else:
                print(f"  ✅ Coords: ({lat}, {lon})")
            
            print(f"  Address: {addr}")
        else:
            bad_coords += 1
            print(f"  ❌ NO LOCATION DATA")
        
        print()
    
    print(f"\n📊 Summary: {bad_coords} projects/events with bad coordinates")
