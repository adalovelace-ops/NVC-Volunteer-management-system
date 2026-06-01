"""
Clear barangay field from all projects (barangay should only be for events)
"""
import sys
sys.path.insert(0, '.')
from db import get_connection

with get_connection() as conn:
    cursor = conn.cursor()
    
    print("=== Clearing barangay from all projects ===")
    cursor.execute("""
        UPDATE projects 
        SET location_barangay = NULL
    """)
    
    rows_updated = cursor.rowcount
    conn.commit()
    
    print(f"✓ Cleared barangay from {rows_updated} projects")
    
    # Verify
    cursor.execute("""
        SELECT projects_id, title, location_region, location_city, location_barangay
        FROM projects
        LIMIT 5
    """)
    
    print("\nVerification (first 5 projects):")
    for row in cursor.fetchall():
        print(f"  {row[1]}: Region={row[2]}, City={row[3]}, Barangay={row[4]}")
    
    cursor.close()
    
print("\n✅ Projects now only have region and city (no barangay)")
