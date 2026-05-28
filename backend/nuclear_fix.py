"""
NUCLEAR FIX - Kill ALL stuck processes and prevent them from coming back.
The root cause: ensure_relational_mirror_tables() runs DDL on every startup
and creates stuck 'idle in transaction' connections that block all queries.
"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")

print("=" * 60)
print("NUCLEAR DATABASE FIX")
print("=" * 60)

# Step 1: Kill ALL non-idle processes except our own
print("\n[1] Killing ALL stuck/idle-in-transaction processes...")
try:
    conn = psycopg.connect(db_url, connect_timeout=10)
    with conn.cursor() as cur:
        # Kill everything that's not idle and not our own connection
        cur.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE pid != pg_backend_pid()
              AND state IN ('idle in transaction', 'idle in transaction (aborted)')
        """)
        killed_idle = len(cur.fetchall())
        
        # Also kill long-running active queries (over 2 minutes)
        cur.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE pid != pg_backend_pid()
              AND state = 'active'
              AND query_start < NOW() - INTERVAL '2 minutes'
        """)
        killed_active = len(cur.fetchall())
        
        conn.commit()
        print(f"  Killed {killed_idle} idle-in-transaction processes")
        print(f"  Killed {killed_active} long-running active processes")
    conn.close()
except Exception as e:
    print(f"  Error: {e}")

# Step 2: Test if database is now responsive
print("\n[2] Testing database responsiveness...")
import time
for attempt in range(5):
    try:
        conn = psycopg.connect(db_url, connect_timeout=10)
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = '5s'")
            cur.execute("SELECT COUNT(*) FROM users")
            count = cur.fetchone()[0]
            print(f"  SUCCESS! Found {count} users in the database")
        conn.close()
        break
    except Exception as e:
        print(f"  Attempt {attempt+1}/5 failed: {type(e).__name__}: {e}")
        if attempt < 4:
            print(f"  Waiting 3 seconds before retry...")
            time.sleep(3)
            # Kill any new stuck processes
            try:
                conn2 = psycopg.connect(db_url, connect_timeout=10)
                with conn2.cursor() as cur2:
                    cur2.execute("""
                        SELECT pg_terminate_backend(pid)
                        FROM pg_stat_activity
                        WHERE pid != pg_backend_pid()
                          AND state IN ('idle in transaction', 'idle in transaction (aborted)')
                    """)
                    n = len(cur2.fetchall())
                    if n > 0:
                        print(f"  Killed {n} more stuck processes")
                    conn2.commit()
                conn2.close()
            except Exception:
                pass

# Step 3: Check remaining locks
print("\n[3] Checking remaining locks...")
try:
    conn = psycopg.connect(db_url, connect_timeout=10)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM pg_locks l
            JOIN pg_stat_activity a ON l.pid = a.pid
            WHERE NOT l.granted
        """)
        waiting = cur.fetchone()[0]
        print(f"  Waiting locks: {waiting}")
        
        cur.execute("""
            SELECT COUNT(*) FROM pg_stat_activity
            WHERE state = 'idle in transaction'
        """)
        idle_tx = cur.fetchone()[0]
        print(f"  Idle-in-transaction connections: {idle_tx}")
    conn.close()
except Exception as e:
    print(f"  Error: {e}")

print("\n" + "=" * 60)
print("DONE - Now restart the backend")
print("=" * 60)
