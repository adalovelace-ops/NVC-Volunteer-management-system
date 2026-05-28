"""Check for database locks"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url, connect_timeout=10)

print("Checking for locks...")
with conn.cursor() as cur:
    cur.execute("""
        SELECT 
            l.locktype,
            l.relation::regclass AS table_name,
            l.mode,
            l.granted,
            a.pid,
            a.usename,
            a.state,
            a.query_start,
            NOW() - a.query_start AS duration,
            LEFT(a.query, 100) AS query
        FROM pg_locks l
        LEFT JOIN pg_stat_activity a ON l.pid = a.pid
        WHERE l.relation IS NOT NULL
        ORDER BY a.query_start NULLS LAST
        LIMIT 50;
    """)
    
    locks = cur.fetchall()
    if locks:
        print(f"Found {len(locks)} locks:")
        for lock in locks:
            locktype, table, mode, granted, pid, user, state, start, duration, query = lock
            status = "✓ GRANTED" if granted else "✗ WAITING"
            print(f"\n{status} - PID {pid} ({user})")
            print(f"  Table: {table}")
            print(f"  Mode: {mode}")
            print(f"  State: {state}")
            print(f"  Duration: {duration}")
            print(f"  Query: {query}")
    else:
        print("No locks found")

conn.close()
