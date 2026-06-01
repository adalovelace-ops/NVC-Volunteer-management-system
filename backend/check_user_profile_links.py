"""Check if users are properly linked to their profiles."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

print("\n=== CHECKING USER-PROFILE LINKAGE ===\n")

# Get all users
cursor.execute("""
    SELECT users_id, email, name, role, approval_status
    FROM users
    ORDER BY role, email
""")
users = cursor.fetchall()

print(f"Found {len(users)} users:\n")

for user in users:
    print(f"USER: {user['email']}")
    print(f"  ID: {user['users_id']}")
    print(f"  Name: {user['name']}")
    print(f"  Role: {user['role']}")
    print(f"  Status: {user['approval_status']}")
    
    # Check for volunteer profile
    if user['role'] == 'volunteer':
        cursor.execute("""
            SELECT volunteers_id, name, user_id, registration_status
            FROM volunteers
            WHERE user_id = %s
        """, (user['users_id'],))
        volunteer_profile = cursor.fetchone()
        
        if volunteer_profile:
            print(f"  ✅ Volunteer Profile Found:")
            print(f"     Profile ID: {volunteer_profile['volunteers_id']}")
            print(f"     Profile Name: {volunteer_profile['name']}")
            print(f"     Status: {volunteer_profile['registration_status']}")
        else:
            print(f"  ❌ NO VOLUNTEER PROFILE FOUND!")
            print(f"     Need to create volunteer profile with user_id = {user['users_id']}")
    
    # Check for partner organization
    elif user['role'] == 'partner':
        cursor.execute("""
            SELECT partners_id, name, owner_user_id, status
            FROM partners
            WHERE owner_user_id = %s
        """, (user['users_id'],))
        partner_org = cursor.fetchone()
        
        if partner_org:
            print(f"  ✅ Partner Organization Found:")
            print(f"     Org ID: {partner_org['partners_id']}")
            print(f"     Org Name: {partner_org['name']}")
            print(f"     Status: {partner_org['status']}")
        else:
            print(f"  ❌ NO PARTNER ORGANIZATION FOUND!")
            print(f"     Need to create partner org with owner_user_id = {user['users_id']}")
    
    print()

cursor.close()
conn.close()
