"""Check column names in volunteers and partners tables."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

print("\n=== VOLUNTEERS TABLE COLUMNS ===\n")
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'volunteers'
    ORDER BY ordinal_position
""")
for col in cursor.fetchall():
    print(f"{col['column_name']}: {col['data_type']}")

print("\n=== PARTNERS TABLE COLUMNS ===\n")
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'partners'
    ORDER BY ordinal_position
""")
for col in cursor.fetchall():
    print(f"{col['column_name']}: {col['data_type']}")

cursor.close()
conn.close()
