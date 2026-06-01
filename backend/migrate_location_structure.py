"""
Migration script to simplify location structure:
- Projects: Only store region and city
- Events: Inherit region/city from parent project, only store barangay
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

def migrate_location_structure():
    with get_connection() as conn:
        cursor = conn.cursor()
        
        print("=== STEP 1: Add new location columns to projects table ===")
        cursor.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_region TEXT")
        cursor.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_city TEXT")
        conn.commit()
        print("✓ Added location_region and location_city columns to projects")
        
        print("\n=== STEP 2: Add new location columns to events table ===")
        cursor.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS location_region TEXT")
        cursor.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS location_city TEXT")
        cursor.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS location_barangay TEXT")
        conn.commit()
        print("✓ Added location_region, location_city, and location_barangay columns to events")
        
        print("\n=== STEP 3: Migrate existing project location data ===")
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
            
            print(f"  Project: {title[:50]}")
            print(f"    Region: {region}, City: {city}")
        
        conn.commit()
        print(f"✓ Migrated {len(projects)} projects")
        
        print("\n=== STEP 4: Migrate existing event location data ===")
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
            
            print(f"  Event: {title[:50]}")
            print(f"    Region: {region}, City: {city}, Barangay: {barangay}")
        
        conn.commit()
        print(f"✓ Migrated {len(events)} events")
        
        print("\n=== STEP 5: Verify migration ===")
        cursor.execute("""
            SELECT projects_id, title, location_region, location_city 
            FROM projects 
            LIMIT 3
        """)
        print("\nSample Projects:")
        for row in cursor.fetchall():
            print(f"  {row[1]}: Region={row[2]}, City={row[3]}")
        
        cursor.execute("""
            SELECT events_id, title, location_region, location_city, location_barangay 
            FROM events 
            LIMIT 3
        """)
        print("\nSample Events:")
        for row in cursor.fetchall():
            print(f"  {row[1]}: Region={row[2]}, City={row[3]}, Barangay={row[4]}")
        
        cursor.close()
        
        print("\n✅ Migration completed successfully!")
        print("\nNOTE: The old 'location' JSON column is preserved for backward compatibility.")
        print("You can remove it later after verifying everything works correctly.")

if __name__ == '__main__':
    migrate_location_structure()
