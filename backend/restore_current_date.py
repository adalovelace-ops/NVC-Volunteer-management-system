#!/usr/bin/env python3
"""
Restore system to current date (May 24, 2026).
Updates created_at and updated_at fields across all tables.
"""

import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_DB_URL", "").strip()

if not SUPABASE_URL:
    print("ERROR: SUPABASE_DB_URL not found")
    sys.exit(1)

try:
    import psycopg
except ImportError:
    print("ERROR: psycopg not installed")
    sys.exit(1)


def restore_dates():
    """Update all timestamps to May 24, 2026."""
    print("\n" + "="*70)
    print("  RESTORING SYSTEM TO TODAY (May 24, 2026)")
    print("="*70 + "\n")
    
    conn = psycopg.connect(SUPABASE_URL, connect_timeout=10)
    cursor = conn.cursor()
    
    # Current datetime
    now = datetime.now(timezone.utc).isoformat()
    print(f"Using timestamp: {now}\n")
    
    # Get all tables
    cursor.execute("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    """)
    tables = [row[0] for row in cursor.fetchall()]
    
    total_updated = 0
    
    for table in tables:
        # Check for timestamp columns
        cursor.execute(f"""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = '{table}'
            AND column_name IN ('created_at', 'updated_at')
        """)
        
        columns = [row[0] for row in cursor.fetchall()]
        if not columns:
            continue
        
        print(f"Updating {table}...")
        
        # Update created_at
        if 'created_at' in columns:
            cursor.execute(f'UPDATE {table} SET created_at = %s WHERE created_at IS NOT NULL', (now,))
            rows = cursor.rowcount
            if rows > 0:
                print(f"  ✓ created_at: {rows} records")
                total_updated += rows
        
        # Update updated_at
        if 'updated_at' in columns:
            cursor.execute(f'UPDATE {table} SET updated_at = %s WHERE updated_at IS NOT NULL', (now,))
            rows = cursor.rowcount
            if rows > 0:
                print(f"  ✓ updated_at: {rows} records")
                total_updated += rows
    
    conn.commit()
    conn.close()
    
    print(f"\n{'='*70}")
    print(f"✓ SUCCESS: Updated {total_updated} timestamp records")
    print(f"✓ System restored to: {now}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    try:
        restore_dates()
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)
