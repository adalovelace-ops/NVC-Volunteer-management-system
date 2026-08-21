#!/usr/bin/env python3
import os
try:
    from .db import get_postgres_connection, load_environment
except ImportError:
    from db import get_postgres_connection, load_environment

load_environment()

with get_postgres_connection() as conn:
    cur = conn.cursor()
    
    # Get all tables
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tables = cur.fetchall()

    print("Truncating tables:")
    for table in tables:
        name = table[0]
        # Skip tables we don't want to truncate or that don't need it
        if name in ("spatial_ref_sys",):
            continue
        print(f"  Truncating {name}...")
        try:
            cur.execute(f'TRUNCATE TABLE "{name}" CASCADE')
        except Exception as err:
            print(f"  Error truncating {name}: {err}")
            conn.rollback()

    conn.commit()
    print("Wipe complete!")
