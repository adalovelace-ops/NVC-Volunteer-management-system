"""
Populate the new location_region, location_city, location_barangay fields
from existing location JSON data.
"""
import sys
sys.path.insert(0, '.')
from db import get_connection
import json

def parse_address(address_str):
    """Parse 'Barangay, City, Region' format into components"""
    if not address_str:
        return None, None, None
    
    parts = [p.strip() for p in address_str.split(',')]
    
    if len(parts) == 3:
        return parts[0], parts[1], parts[2]  # barangay, city, region
    elif len(parts) == 2:
        return None, parts[0], parts[1]  # city, region
    elif len(parts) == 1:
        return None, None, parts[0]  # just region or city
    
    return None, None, None

def populate_location_fields():
    with get_connection() as conn:
        cursor = conn.cursor()
        
        print("=== Populating project location fields ===")
        cursor.execute('SELECT projects_id, title, location FROM projects')
        projects = cursor.fetchall()
        
        for project_id, title, location_json in projects:
            location = json.loads(location_json) if location_json else {}
            address = location.get('address', '')
            
            barangay, city, region = parse_address(address)
            
            # For projects, we only care about region and city
            cursor.execute("""
                UPDATE projects 
                SET location_region = %s, location_city = %s
                WHERE projects_id = %s
            """, (region, city, project_id))
            
            print(f"  {title[:50]}: Region={region}, City={city}")
        
        conn.commit()
        print(f"✓ Updated {len(projects)} projects")
        
        print("\n=== Populating event location fields ===")
        cursor.execute('SELECT events_id, title, location, parent_project_id FROM events')
        events = cursor.fetchall()
        
        for event_id, title, location_json, parent_project_id in events:
            location = json.loads(location_json) if location_json else {}
            address = location.get('address', '')
            
            barangay, city, region = parse_address(address)
            
            # For events, try to inherit region/city from parent project
            if parent_project_id:
                cursor.execute("""
                    SELECT location_region, location_city 
                    FROM projects 
                    WHERE projects_id = %s
                """, (parent_project_id,))
                parent_result = cursor.fetchone()
                
                if parent_result:
                    parent_region, parent_city = parent_result
                    # Use parent's region/city if available
                    region = region or parent_region
                    city = city or parent_city
            
            cursor.execute("""
                UPDATE events 
                SET location_region = %s, location_city = %s, location_barangay = %s
                WHERE events_id = %s
            """, (region, city, barangay, event_id))
            
            print(f"  {title[:50]}: Region={region}, City={city}, Barangay={barangay}")
        
        conn.commit()
        print(f"✓ Updated {len(events)} events")
        
        print("\n✅ Location fields populated successfully!")
        cursor.close()

if __name__ == '__main__':
    populate_location_fields()
