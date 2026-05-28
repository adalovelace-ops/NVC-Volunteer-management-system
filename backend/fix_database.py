"""
Database fix script to resolve schema issues and deadlocks
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    import psycopg
except ImportError:
    print("ERROR: psycopg not installed. Run: pip install psycopg")
    sys.exit(1)

def get_db_connection():
    """Get database connection using fallback URL (more stable)"""
    db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
    if not db_url:
        print("ERROR: No database URL found in .env")
        sys.exit(1)
    
    print(f"Connecting to database...")
    try:
        conn = psycopg.connect(db_url, connect_timeout=10)
        print("✓ Connected successfully")
        return conn
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        sys.exit(1)

def check_stuck_transactions(conn):
    """Check for stuck/long-running transactions"""
    print("\n=== Checking for Stuck Transactions ===")
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT pid, usename, state, query_start, 
                       NOW() - query_start AS duration,
                       LEFT(query, 100) AS query_preview
                FROM pg_stat_activity
                WHERE state = 'active'
                  AND query_start < NOW() - INTERVAL '2 minutes'
                ORDER BY query_start;
            """)
            stuck = cur.fetchall()
            
            if stuck:
                print(f"Found {len(stuck)} stuck transactions:")
                for row in stuck:
                    pid, user, state, start, duration, query = row
                    print(f"  PID {pid}: {user} - {duration} - {query}")
                return [row[0] for row in stuck]  # Return PIDs
            else:
                print("✓ No stuck transactions found")
                return []
    except Exception as e:
        print(f"✗ Error checking transactions: {e}")
        return []

def kill_stuck_transactions(conn, pids):
    """Kill stuck transactions"""
    if not pids:
        return
    
    print(f"\n=== Killing {len(pids)} Stuck Transactions ===")
    killed = 0
    for pid in pids:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT pg_terminate_backend(%s)", (pid,))
                result = cur.fetchone()[0]
                if result:
                    print(f"✓ Killed PID {pid}")
                    killed += 1
                else:
                    print(f"✗ Could not kill PID {pid}")
        except Exception as e:
            print(f"✗ Error killing PID {pid}: {e}")
    
    print(f"Killed {killed}/{len(pids)} processes")
    conn.commit()

def check_table_schemas(conn):
    """Check table schemas for issues"""
    print("\n=== Checking Table Schemas ===")
    
    tables_to_check = [
        'users', 'partners', 'projects', 'events', 'volunteers',
        'status_updates', 'volunteer_matches', 'volunteer_time_logs',
        'volunteer_event_joins', 'partner_project_applications', 'reports'
    ]
    
    for table in tables_to_check:
        try:
            with conn.cursor() as cur:
                # Check if table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, (table,))
                exists = cur.fetchone()[0]
                
                if not exists:
                    print(f"✗ Table '{table}' does not exist")
                    continue
                
                # Check id column type
                cur.execute("""
                    SELECT column_name, data_type, is_identity
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = %s
                    AND column_name = 'id';
                """, (table,))
                
                result = cur.fetchone()
                if result:
                    col_name, data_type, is_identity = result
                    if data_type in ('integer', 'bigint', 'smallint'):
                        print(f"✓ {table}.id: {data_type} (OK)")
                    else:
                        print(f"⚠ {table}.id: {data_type} (Should be integer type)")
                else:
                    print(f"✗ {table}: No 'id' column found")
                    
        except Exception as e:
            print(f"✗ Error checking {table}: {e}")

def check_indexes(conn):
    """Check if performance indexes exist"""
    print("\n=== Checking Performance Indexes ===")
    
    expected_indexes = [
        'idx_time_logs_project',
        'idx_time_logs_volunteer',
        'idx_partner_apps_project',
        'idx_volunteer_joins_project',
        'idx_volunteers_user',
    ]
    
    for idx_name in expected_indexes:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM pg_indexes
                        WHERE indexname = %s
                    );
                """, (idx_name,))
                exists = cur.fetchone()[0]
                
                if exists:
                    print(f"✓ {idx_name}")
                else:
                    print(f"✗ {idx_name} (missing)")
        except Exception as e:
            print(f"✗ Error checking {idx_name}: {e}")

def vacuum_analyze(conn):
    """Run VACUUM ANALYZE to clean up and update statistics"""
    print("\n=== Running VACUUM ANALYZE ===")
    try:
        # Need to commit any pending transaction first
        conn.commit()
        # VACUUM cannot run inside a transaction block
        old_isolation = conn.isolation_level
        conn.set_isolation_level(0)  # AUTOCOMMIT
        
        with conn.cursor() as cur:
            cur.execute("VACUUM ANALYZE;")
        
        conn.set_isolation_level(old_isolation)
        print("✓ VACUUM ANALYZE completed")
    except Exception as e:
        print(f"⚠ VACUUM ANALYZE failed (non-critical): {e}")

def main():
    print("=" * 60)
    print("DATABASE FIX SCRIPT")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        # Step 1: Check for stuck transactions
        stuck_pids = check_stuck_transactions(conn)
        
        # Step 2: Kill stuck transactions if found
        if stuck_pids:
            response = input(f"\nKill {len(stuck_pids)} stuck transactions? (y/n): ")
            if response.lower() == 'y':
                kill_stuck_transactions(conn, stuck_pids)
        
        # Step 3: Check table schemas
        check_table_schemas(conn)
        
        # Step 4: Check indexes
        check_indexes(conn)
        
        # Step 5: Run VACUUM ANALYZE
        vacuum_analyze(conn)
        
        print("\n" + "=" * 60)
        print("DATABASE CHECK COMPLETE")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Restart the backend: python -m uvicorn backend.api:app --reload --port 8000")
        print("2. Run tests: .\\test-basic.ps1")
        
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
    finally:
        conn.close()
        print("\n✓ Database connection closed")

if __name__ == "__main__":
    main()
