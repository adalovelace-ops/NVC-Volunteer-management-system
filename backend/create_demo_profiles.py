"""
Create partner organizations and volunteer profiles for demo accounts.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

print("=== Creating Demo Profiles ===\n")

# Get partner users
cursor.execute("SELECT users_id, email, name FROM users WHERE role = 'partner'")
partner_users = cursor.fetchall()

print(f"Found {len(partner_users)} partner users")

# Create partner organizations
for user in partner_users:
    org_name = user['name']
    partner_id = f"partner-{user['users_id']}"
    
    # Check if already exists
    cursor.execute("SELECT partners_id FROM partners WHERE owner_user_id = %s", (user['users_id'],))
    exists = cursor.fetchone()
    
    if exists:
        print(f"  ✓ {org_name} - already has organization")
        continue
    
    print(f"  + Creating organization for {org_name}")
    
    cursor.execute("""
        INSERT INTO partners (
            partners_id,
            owner_user_id,
            name,
            description,
            category,
            sector_type,
            dswd_accreditation_no,
            advocacy_focus,
            status,
            created_at,
            registration_documents
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        partner_id,
        user['users_id'],
        org_name,
        f"{org_name} - Partner organization",
        'Livelihood',
        'NGO',
        f'DSWD-{partner_id[-8:]}',
        ['Livelihood', 'Education'],
        'Approved',
        datetime.utcnow().isoformat(),
        '[]'
    ))
    print(f"    ✓ Organization created")

# Get volunteer users
cursor.execute("SELECT users_id, email, name FROM users WHERE role = 'volunteer'")
volunteer_users = cursor.fetchall()

print(f"\nFound {len(volunteer_users)} volunteer users")

# Create volunteer profiles
for user in volunteer_users:
    vol_name = user['name']
    volunteer_id = f"volunteer-{user['users_id']}"
    
    # Check if already exists
    cursor.execute("SELECT volunteers_id FROM volunteers WHERE user_id = %s", (user['users_id'],))
    exists = cursor.fetchone()
    
    if exists:
        print(f"  ✓ {vol_name} - already has profile")
        continue
    
    print(f"  + Creating profile for {vol_name}")
    
    cursor.execute("""
        INSERT INTO volunteers (
            volunteers_id,
            user_id,
            name,
            email,
            skills,
            availability,
            past_projects,
            total_hours_contributed,
            rating,
            registration_status,
            affiliations,
            created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        volunteer_id,
        user['users_id'],
        vol_name,
        user['email'],
        ['General Support'],
        '{}',
        '{}',
        0.0,
        0.0,
        'Approved',
        '[]',
        datetime.utcnow().isoformat()
    ))
    print(f"    ✓ Profile created")

conn.commit()

# Verify
cursor.execute("SELECT COUNT(*) as count FROM partners")
partner_count = cursor.fetchone()['count']

cursor.execute("SELECT COUNT(*) as count FROM volunteers")
volunteer_count = cursor.fetchone()['count']

print(f"\n=== Complete ===")
print(f"Partner organizations: {partner_count}")
print(f"Volunteer profiles: {volunteer_count}")

cursor.close()
conn.close()

print("\n✅ Demo profiles created! Refresh Partner Management and Volunteer Management to see them.")
