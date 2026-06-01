"""Check volunteer user account."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Check volunteer user
cursor.execute("""
    SELECT users_id, email, name, role
    FROM users
    WHERE email = 'volunteer@example.com'
""")

user = cursor.fetchone()

if user:
    print(f"\n=== Volunteer User Account ===")
    print(f"User ID: {user['users_id']}")
    print(f"Email: {user['email']}")
    print(f"Name: {user['name']}")
    print(f"Role: {user['role']}")
    
    # Check volunteer profile
    cursor.execute("""
        SELECT volunteers_id, name, user_id
        FROM volunteers
        WHERE user_id = %s
    """, (user['users_id'],))
    
    volunteer = cursor.fetchone()
    
    if volunteer:
        print(f"\n=== Volunteer Profile ===")
        print(f"Volunteer ID: {volunteer['volunteers_id']}")
        print(f"Name: {volunteer['name']}")
        print(f"User ID: {volunteer['user_id']}")
        print(f"\n✅ Profile is correctly linked!")
    else:
        print(f"\n❌ NO VOLUNTEER PROFILE FOUND for user_id: {user['users_id']}")
else:
    print("\n❌ User not found!")

cursor.close()
conn.close()
