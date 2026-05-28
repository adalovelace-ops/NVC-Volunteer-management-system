"""Clear any deadlocked or stuck transactions"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url)

print("Checking for stuck transactions...")
with conn.cursor() as cur:
    cur.execute("""
        SELECT pid, usename, state, query_start, 
               NOW() - query_start AS duration
        FROM pg_stat_activity
        WHERE state = 'active'
          AND query_start < NOW() - INTERVAL '1 minute'
        ORDER BY query_start;
    """)
    stuck = cur.fetchall()
    
    if stuck:
        print(f"Found {len(stuck)} stuck transactions:")
        for row in stuck:
            pid, user, state, start, duration = row
            print(f"  PID {pid}: {user} - {duration}")
            try:
                cur.execute("SELECT pg_terminate_backend(%s)", (pid,))
                print(f"    ✓ Killed PID {pid}")
            except Exception as e:
                print(f"    ✗ Error killing PID {pid}: {e}")
        conn.commit()
    else:
        print("✓ No stuck transactions found")

conn.close()
print("Done!")
