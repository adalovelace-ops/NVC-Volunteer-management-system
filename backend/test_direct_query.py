"""Test direct database query to see if we can fetch data"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
print(f"Connecting to database...")
conn = psycopg.connect(db_url, connect_timeout=10)

print("Testing direct query on users table...")
try:
    with conn.cursor() as cur:
        cur.execute("SET statement_timeout = '10s'")
        cur.execute("SELECT COUNT(*) FROM users")
        count = cur.fetchone()[0]
        print(f"✓ Found {count} users")
        
        cur.execute("SELECT id, name, role FROM users LIMIT 5")
        users = cur.fetchall()
        print(f"✓ Sample users:")
        for user_id, name, role in users:
            print(f"  - {user_id}: {name} ({role})")
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")

conn.close()
print("Done!")
