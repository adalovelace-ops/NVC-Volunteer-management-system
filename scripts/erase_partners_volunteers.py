#!/usr/bin/env python3
"""
Erase all partner and volunteer accounts from the PostgreSQL database.
Keeps admin users intact.
"""

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'backend'))

from backend.db import get_postgres_connection, load_environment

def erase_partners_and_volunteers():
    load_environment()
    
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            # 1. Get all user IDs to delete (partners and volunteers)
            cur.execute("""
                SELECT users_id FROM users 
                WHERE role IN ('partner', 'volunteer')
            """)
            user_ids = [row[0] for row in cur.fetchall()]
            
            print(f"Found {len(user_ids)} non-admin users to delete: {user_ids}")
            
            if not user_ids:
                print("No partner/volunteer users to delete.")
                return
            
            # 2. Delete related data first
            
            # Delete volunteers profiles
            for uid in user_ids:
                cur.execute("DELETE FROM volunteers WHERE user_id = %s", (uid,))
                print(f"  Deleted volunteer profile for user {uid}")
            
            # Delete partners profiles
            partner_ids = [uid for uid in user_ids if 'partner' in str(uid).lower()]
            for pid in partner_ids:
                cur.execute("DELETE FROM partners WHERE owner_user_id = %s", (pid,))
                print(f"  Deleted partner profile for user {pid}")
            
            # 3. Delete the users themselves
            placeholders = ','.join(['%s'] * len(user_ids))
            cur.execute(f"DELETE FROM users WHERE users_id IN ({placeholders})", user_ids)
            print(f"  Deleted {cur.rowcount} users")
            
            # 4. Clean up any messages from these users
            for uid in user_ids:
                cur.execute("DELETE FROM messages WHERE sender_id = %s OR recipient_id = %s", (uid, uid))
                print(f"  Cleaned messages for user {uid}")
            
            conn.commit()
            print("\n✅ All partner and volunteer accounts erased successfully!")

if __name__ == "__main__":
    erase_partners_and_volunteers()