"""Check all users in database."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

cursor.execute("""
    SELECT users_id, email, name, role, approval_status 
    FROM users 
    ORDER BY role, email
""")

users = cursor.fetchall()

print(f"\n=== Users in Database ({len(users)}) ===\n")
print(f"{'ROLE':<12} | {'EMAIL':<40} | {'NAME':<25} | {'STATUS'}")
print("-" * 100)

for user in users:
    role = (user['role'] or 'unknown').upper()
    email = user['email'] or 'N/A'
    name = user['name'] or 'N/A'
    status = user['approval_status'] or 'N/A'
    print(f"{role:<12} | {email:<40} | {name:<25} | {status}")

# Count by role
cursor.execute("""
    SELECT role, COUNT(*) as count 
    FROM users 
    GROUP BY role 
    ORDER BY role
""")

counts = cursor.fetchall()

print(f"\n=== Summary ===")
for count in counts:
    print(f"  {count['role']}: {count['count']}")

cursor.close()
conn.close()
