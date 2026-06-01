"""Check partners and volunteers tables."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Check partners table
cursor.execute("SELECT partners_id, name, status, owner_user_id FROM partners")
partners = cursor.fetchall()

print(f"\n=== Partners Table ({len(partners)} records) ===")
if partners:
    for p in partners:
        print(f"  {p['name']}: {p['status']} (owner: {p['owner_user_id'] or 'N/A'})")
else:
    print("  EMPTY - No partner organizations found")

# Check volunteers table
cursor.execute("SELECT volunteers_id, name, user_id, registration_status FROM volunteers")
volunteers = cursor.fetchall()

print(f"\n=== Volunteers Table ({len(volunteers)} records) ===")
if volunteers:
    for v in volunteers:
        print(f"  {v['name']}: {v['registration_status'] or 'N/A'} (user_id: {v['user_id'] or 'N/A'})")
else:
    print("  EMPTY - No volunteer profiles found")

# Check users table for reference
cursor.execute("SELECT role, COUNT(*) as count FROM users GROUP BY role")
user_counts = cursor.fetchall()

print(f"\n=== Users Table Summary ===")
for uc in user_counts:
    print(f"  {uc['role']}: {uc['count']}")

cursor.close()
conn.close()

print("\n=== Analysis ===")
print(f"Partner USERS: {sum(uc['count'] for uc in user_counts if uc['role'] == 'partner')}")
print(f"Partner ORGANIZATIONS: {len(partners)}")
print(f"Volunteer USERS: {sum(uc['count'] for uc in user_counts if uc['role'] == 'volunteer')}")
print(f"Volunteer PROFILES: {len(volunteers)}")
