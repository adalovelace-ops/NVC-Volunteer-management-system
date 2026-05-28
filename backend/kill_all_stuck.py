"""Kill all stuck 'idle in transaction' processes"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url, connect_timeout=10)

print("Finding all stuck 'idle in transaction' processes...")
with conn.cursor() as cur:
    cur.execute("""
        SELECT DISTINCT pid
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
          AND query_start < NOW() - INTERVAL '1 minute'
    """)
    
    pids = [row[0] for row in cur.fetchall()]
    
    if pids:
        print(f"Found {len(pids)} stuck processes: {pids}")
        for pid in pids:
            try:
                cur.execute("SELECT pg_terminate_backend(%s)", (pid,))
                result = cur.fetchone()[0]
                if result:
                    print(f"  Killed PID {pid}")
                else:
                    print(f"  Could not kill PID {pid}")
            except Exception as e:
                print(f"  Error killing PID {pid}: {e}")
        conn.commit()
    else:
        print("No stuck processes found")

conn.close()
print("Done!")
