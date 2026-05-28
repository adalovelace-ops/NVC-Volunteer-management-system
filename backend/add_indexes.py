"""
Add performance indexes to the database
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

try:
    import psycopg
except ImportError:
    print("ERROR: psycopg not installed")
    sys.exit(1)

def get_db_connection():
    db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
    if not db_url:
        print("ERROR: No database URL found")
        sys.exit(1)
    
    print("Connecting to database...")
    conn = psycopg.connect(db_url, connect_timeout=10)
    print("✓ Connected")
    return conn

def add_indexes(conn):
    """Add performance indexes"""
    print("\n=== Adding Performance Indexes ===")
    
    indexes = [
        ("idx_time_logs_project", "volunteer_time_logs", "project_id"),
        ("idx_time_logs_volunteer", "volunteer_time_logs", "volunteer_id"),
        ("idx_partner_apps_project", "partner_project_applications", "project_id"),
        ("idx_partner_apps_status", "partner_project_applications", "status"),
        ("idx_volunteer_joins_project", "volunteer_event_joins", "project_id"),
        ("idx_volunteer_joins_volunteer", "volunteer_event_joins", "volunteer_id"),
        ("idx_volunteers_user", "volunteers", "user_id"),
        ("idx_status_updates_project", "status_updates", "project_id"),
        ("idx_volunteer_matches_volunteer", "volunteer_matches", "volunteer_id"),
        ("idx_volunteer_matches_project", "volunteer_matches", "project_id"),
    ]
    
    created = 0
    skipped = 0
    
    for idx_name, table_name, column_name in indexes:
        try:
            with conn.cursor() as cur:
                # Check if index exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM pg_indexes WHERE indexname = %s
                    );
                """, (idx_name,))
                
                if cur.fetchone()[0]:
                    print(f"  ⊙ {idx_name} (already exists)")
                    skipped += 1
                    continue
                
                # Create index
                sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} ({column_name});"
                cur.execute(sql)
                conn.commit()
                print(f"  ✓ {idx_name}")
                created += 1
                
        except Exception as e:
            print(f"  ✗ {idx_name}: {e}")
            conn.rollback()
    
    print(f"\nCreated: {created}, Skipped: {skipped}")

def main():
    print("=" * 60)
    print("ADD PERFORMANCE INDEXES")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        add_indexes(conn)
        
        print("\n" + "=" * 60)
        print("INDEXES ADDED SUCCESSFULLY")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
    finally:
        conn.close()
        print("\n✓ Connection closed")

if __name__ == "__main__":
    main()
