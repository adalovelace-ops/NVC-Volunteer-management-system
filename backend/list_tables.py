#!/usr/bin/env python3
import os
from dotenv import load_dotenv
load_dotenv()

try:
    import psycopg
except Exception as e:
    print('psycopg not available:', e)
    raise

db_url = os.getenv('SUPABASE_DB_URL')
if not db_url:
    print('No DB URL')
    raise SystemExit(1)

conn = psycopg.connect(db_url, connect_timeout=5)
cur = conn.cursor()

# List all tables in the public schema
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
""")

tables = cur.fetchall()
print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")

conn.close()
