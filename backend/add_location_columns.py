"""
Directly add location columns to projects and events tables
"""
import sys
sys.path.insert(0, '.')
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL
db_url = os.getenv('SUPABASE_DB_URL')
if not db_url:
    print("ERROR: SUPABASE_DB_URL not found in .env")
    sys.exit(1)

print(f"Connecting to database...")

# Connect with a longer timeout
conn = psycopg.connect(db_url, options='-c statement_timeout=60000')  # 60 second timeout
cursor = conn.cursor()

try:
    print("\n=== Adding location columns to projects table ===")
    
    print("  Adding location_region...")
    cursor.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_region TEXT")
    conn.commit()
    print("  ✓ location_region added")
    
    print("  Adding location_city...")
    cursor.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_city TEXT")
    conn.commit()
    print("  ✓ location_city added")
    
    print("  Adding location_barangay...")
    cursor.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_barangay TEXT")
    conn.commit()
    print("  ✓ location_barangay added")
    
    print("\n=== Adding location columns to events table ===")
    
    print("  Adding location_region...")
    cursor.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS location_region TEXT")
    conn.commit()
    print("  ✓ location_region added")
    
    print("  Adding location_city...")
    cursor.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS location_city TEXT")
    conn.commit()
    print("  ✓ location_city added")
    
    print("  Adding location_barangay...")
    cursor.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS location_barangay TEXT")
    conn.commit()
    print("  ✓ location_barangay added")
    
    print("\n✅ All location columns added successfully!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    conn.rollback()
finally:
    cursor.close()
    conn.close()
