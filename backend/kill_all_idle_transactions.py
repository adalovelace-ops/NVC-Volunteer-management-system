"""Kill ALL idle in transaction processes"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url, connect_timeout=10)

print("Finding ALL 'idle in transaction' processes...")
with conn.cursor() as cur:
    cur.execute("""
        SELECT pid, usename, state, query_start, NOW() - query_start AS duration
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
        ORDER BY query_start;
    """)
    
    processes = cur.fetchall()
    
    if processes:
        print(f"Found {len(processes)} idle in transaction processes:")
        for pid, user, state, start, duration in processes:
            print(f"  PID {pid}: {user} - {duration}")
        
        print("\nKilling all of them...")
        killed = 0
        for pid, _, _, _, _ in processes:
            try:
                cur.execute("SELECT pg_terminate_backend(%s)", (pid,))
                result = cur.fetchone()[0]
                if result:
                    print(f"  ✓ Killed PID {pid}")
                    killed += 1
                else:
                    print(f"  ✗ Could not kill PID {pid}")
            except Exception as e:
                print(f"  ✗ Error killing PID {pid}: {e}")
        
        conn.commit()
        print(f"\nKilled {killed}/{len(processes)} processes")
    else:
        print("No idle in transaction processes found")

conn.close()
print("Done!")
