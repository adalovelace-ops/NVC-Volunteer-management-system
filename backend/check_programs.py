"""
Check where programs are stored and manually insert if needed.
"""
from dotenv import load_dotenv
from db import get_connection
from app_storage_seed import get_postgres_hot_storage_collection
import json

load_dotenv()

def check_programs():
    with get_connection() as connection:
        print("=== CHECKING PROGRAMS STORAGE ===\n")
        
        # Check hot storage
        print("1. Checking programs table (hot storage)...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM programs")
            count = cursor.fetchone()[0]
            print(f"   Found {count} records in programs table")
            
            if count > 0:
                cursor.execute("SELECT * FROM programs LIMIT 10")
                for row in cursor.fetchall():
                    print(f"   - Row: {row}")
        
        # Check programs collection via API
        print("\n2. Checking programs collection (via API)...")
        programs = get_postgres_hot_storage_collection(connection, "programs")
        print(f"   Found {len(programs)} programs")
        for prog in programs:
            print(f"   - {prog.get('id')}: {prog.get('title')}")
        
        # Check program_tracks
        print("\n3. Checking programTracks collection...")
        tracks = get_postgres_hot_storage_collection(connection, "programTracks")
        print(f"   Found {len(tracks)} program tracks")
        for track in tracks:
            print(f"   - {track.get('id')}: {track.get('title')}")
        
        # Check program_tracks table
        print("\n4. Checking program_tracks table...")
        with connection.cursor() as cursor:
            try:
                cursor.execute("SELECT COUNT(*) FROM program_tracks")
                count = cursor.fetchone()[0]
                print(f"   Found {count} records in program_tracks table")
            except Exception as e:
                print(f"   Error: {e}")

if __name__ == "__main__":
    check_programs()
