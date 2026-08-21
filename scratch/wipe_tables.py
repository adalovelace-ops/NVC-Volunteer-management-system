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

# Get all tables
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
""")
tables = cur.fetchall()

print("Truncating tables:")
for table in tables:
    name = table[0]
    # We don't want to truncate information_schema or system catalog tables,
    # but since we filter table_schema = 'public', they are safe.
    print(f"  Truncating {name}...")
    try:
        cur.execute(f'TRUNCATE TABLE "{name}" CASCADE')
    except Exception as err:
        print(f"  Error truncating {name}: {err}")
        conn.rollback()

conn.commit()
print("Wipe complete!")
conn.close()
