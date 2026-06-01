#!/usr/bin/env python3
"""Diagnose volunteer join request flow"""

import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_DB_URL", "").strip()

if not SUPABASE_URL:
    print("ERROR: SUPABASE_DB_URL not found in environment")
    sys.exit(1)

try:
    import psycopg
except ImportError:
    print("ERROR: psycopg not installed. Install with: pip install psycopg[binary]")
    sys.exit(1)

from backend.app_storage_seed import (
    get_postgres_hot_storage_collection,
)

def get_connection():
    """Connect directly to Supabase PostgreSQL."""
    return psycopg.connect(SUPABASE_URL, connect_timeout=5)

def main():
    conn = get_connection()
    
    print("=" * 70)
    print("VOLUNTEER JOIN REQUEST DIAGNOSTIC")
    print("=" * 70)
    
    # Check 1: List all volunteerMatches
    print("\n[1] Current volunteerMatches in database:")
    try:
        matches = get_postgres_hot_storage_collection(conn, "volunteerMatches")
        if matches:
            print(f"✅ Found {len(matches)} volunteer matches:")
            for match in matches:
                print(f"   - ID: {match.get('id')}")
                print(f"     Volunteer: {match.get('volunteerId')}")
                print(f"     Project: {match.get('projectId')}")
                print(f"     Status: {match.get('status')}")
                print(f"     Requested At: {match.get('requestedAt')}")
                print()
        else:
            print("⚠️  No volunteer matches found")
    except Exception as e:
        print(f"❌ Error fetching matches: {e}")
    
    # Check 2: List all volunteers
    print("\n[2] Current volunteers in database:")
    try:
        volunteers = get_postgres_hot_storage_collection(conn, "volunteers")
        if volunteers:
            print(f"✅ Found {len(volunteers)} volunteers:")
            for vol in volunteers[:3]:  # Show first 3
                print(f"   - ID: {vol.get('id')}")
                print(f"     Name: {vol.get('name')}")
                print(f"     User ID: {vol.get('userId')}")
        else:
            print("⚠️  No volunteers found")
    except Exception as e:
        print(f"❌ Error fetching volunteers: {e}")
    
    # Check 3: List all events  
    print("\n[3] Current events in database:")
    try:
        events = get_postgres_hot_storage_collection(conn, "events")
        if events:
            print(f"✅ Found {len(events)} events:")
            for event in events[:3]:  # Show first 3
                print(f"   - ID: {event.get('id')}")
                print(f"     Title: {event.get('title')}")
                print(f"     Status: {event.get('status')}")
        else:
            print("⚠️  No events found")
    except Exception as e:
        print(f"❌ Error fetching events: {e}")
    
    # Check 4: List all projects (programs)
    print("\n[4] Current projects (programs) in database:")
    try:
        projects = get_postgres_hot_storage_collection(conn, "projects")
        if projects:
            print(f"✅ Found {len(projects)} projects:")
            for proj in projects[:3]:  # Show first 3
                print(f"   - ID: {proj.get('id')}")
                print(f"     Title: {proj.get('title')}")
                print(f"     Is Event: {proj.get('isEvent')}")
                print(f"     Parent Project ID: {proj.get('parentProjectId')}")
        else:
            print("⚠️  No projects found")
    except Exception as e:
        print(f"❌ Error fetching projects: {e}")
    
    conn.close()
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print("""
If volunteerMatches shows 0 items, then:
1. No volunteer join requests have been created yet, OR
2. Requests are being saved to a different location

Check that when volunteer clicks 'Request to Join':
- The request is being sent to the backend
- The backend is storing it in 'volunteerMatches' collection
- The record has status='Requested'
    """)

if __name__ == "__main__":
    main()
