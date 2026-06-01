#!/usr/bin/env python3
"""
Fix the DISASTER RISK PROTECTION TRAINING project location to Bacolod City.
"""
import sys
sys.path.insert(0, '.')
from db import get_connection
import json

def fix_disaster_project_location():
    """Update DISASTER project coordinates to Bacolod City."""
    project_id = 'project-1780217407655'
    
    # Bacolod City coordinates
    bacolod_lat = 10.6765
    bacolod_lng = 122.9509
    bacolod_address = "Bacolod City, Negros Occidental"
    
    # Create new location JSON
    new_location = {
        "latitude": bacolod_lat,
        "longitude": bacolod_lng,
        "address": bacolod_address
    }
    
    location_json = json.dumps(new_location)
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Update the project location
        query = """
        UPDATE projects 
        SET location = %s,
            location_region = 'Negros Island Region (NIR)',
            location_city = 'Bacolod City',
            updated_at = NOW()
        WHERE projects_id = %s
        RETURNING projects_id, title, location;
        """
        
        cursor.execute(query, (location_json, project_id))
        result = cursor.fetchone()
        
        if result:
            print(f"✅ Updated DISASTER project location to Bacolod!")
            print(f"   Project ID: {result[0]}")
            print(f"   Title: {result[1]}")
            print(f"   New Location: {result[2]}")
        else:
            print(f"❌ Project not found: {project_id}")
        
        conn.commit()

if __name__ == '__main__':
    fix_disaster_project_location()
