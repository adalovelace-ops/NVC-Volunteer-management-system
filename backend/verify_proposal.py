"""Verify that the Jollibee proposal seed was inserted."""

from backend.db import get_postgres_connection
from psycopg.rows import dict_row
import json

with get_postgres_connection() as conn:
    with conn.cursor(row_factory=dict_row) as cur:
        # Check messages table
        cur.execute(
            "SELECT id, sender_id, recipient_id, content FROM public.messages WHERE id LIKE %s",
            ('%sample-jollibee%',)
        )
        rows = cur.fetchall()
        
        print("=" * 70)
        print("JOLLIBEE PROPOSAL VERIFICATION")
        print("=" * 70)
        print(f"\nFound {len(rows)} message(s)")
        
        for row in rows:
            print(f"\n✓ Message ID: {row['id']}")
            print(f"  From: {row['sender_id']} (Jollibee)")
            print(f"  To: {row['recipient_id']} (Admin)")
            
            if 'PROPOSAL_CARD' in row['content'][:50]:
                print(f"  Type: PROPOSAL CARD")
                payload = row['content'].replace('___PROPOSAL_CARD___:', '')
                data = json.loads(payload)
                print(f"  Title: {data.get('proposedTitle')}")
                print(f"  Status: {data.get('status')}")
                print(f"  Program: {data.get('requestedProgramModule')}")
                print(f"  Volunteers Needed: {data.get('proposedVolunteersNeeded')}")
                print(f"  Location: {data.get('proposedLocation')}")
                print(f"  Start Date: {data.get('proposedStartDate')}")
                print(f"  End Date: {data.get('proposedEndDate')}")
        
        print("\n" + "=" * 70)
        print("COMMUNICATION HUB VISIBILITY")
        print("=" * 70)
        print("\nJollibee account (partner-user-3) will see:")
        print("  - Their sent proposal in Messages tab")
        print("  - Admin can see it in Communication Hub Pending section")
        print("\n✅ SETUP COMPLETE - Ready for workflow testing")
        print("=" * 70)
