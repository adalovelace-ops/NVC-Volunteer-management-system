"""Check for database locks - simple version"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url, connect_timeout=10)

print("Checking for locks...")
with conn.cursor() as cur:
    # Check for waiting locks
    cur.execute("""
        SELECT 
            l.pid,
            l.granted,
            l.relation::regclass AS table_name,
            l.mode,
            a.state,
            NOW() - a.query_start AS duration
        FROM pg_locks l
        LEFT JOIN pg_stat_activity a ON l.pid = a.pid
        WHERE l.relation IS NOT NULL
          AND (NOT l.granted OR a.state = 'idle in transaction')
        ORDER BY a.query_start NULLS LAST;
    """)
    
    locks = cur.fetchall()
    if locks:
        print(f"Found {len(locks)} problematic locks:")
        for pid, granted, table, mode, state, duration in locks:
            status = "GRANTED" if granted else "WAITING"
            print(f"  PID {pid}: {status} - {table} ({mode}) - {state} - {duration}")
    else:
        print("No problematic locks found")

conn.close()
