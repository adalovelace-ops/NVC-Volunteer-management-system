"""Kill the stuck process that's blocking all queries"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url, connect_timeout=10)

pid_to_kill = 117755

print(f"Killing stuck process PID {pid_to_kill}...")
try:
    with conn.cursor() as cur:
        cur.execute("SELECT pg_terminate_backend(%s)", (pid_to_kill,))
        result = cur.fetchone()[0]
        if result:
            print(f"✓ Successfully killed PID {pid_to_kill}")
        else:
            print(f"✗ Could not kill PID {pid_to_kill} (may already be gone)")
    conn.commit()
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")

conn.close()
print("Done!")
