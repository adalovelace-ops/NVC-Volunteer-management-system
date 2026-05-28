"""Check actual table schema"""
import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

conn = psycopg.connect(os.getenv("SUPABASE_DB_URL_FALLBACK"), connect_timeout=10)

tables = ['volunteer_time_logs', 'partner_project_applications', 'volunteer_event_joins']

for table in tables:
    print(f"\n=== {table} ===")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position;
        """, (table,))
        
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]}")

conn.close()
