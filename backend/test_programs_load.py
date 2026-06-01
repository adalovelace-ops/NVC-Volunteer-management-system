"""
Test if programs are loading correctly from the database.
"""
from dotenv import load_dotenv
from db import get_connection
from app_storage_seed import get_postgres_hot_storage_collection
import json

load_dotenv()

def test_programs():
    with get_connection() as connection:
        print("=== TESTING PROGRAMS LOAD ===\n")
        
        # Get programs from database
        programs = get_postgres_hot_storage_collection(connection, "programs")
        print(f"Programs count: {len(programs)}\n")
        
        for prog in programs:
            print(f"Program: {prog.get('title')} (ID: {prog.get('id')})")
            print(f"  Parent Project ID: {prog.get('parentProjectId')}")
            print(f"  Is Event: {prog.get('isEvent')}")
            print(f"  Icon: {prog.get('icon')}")
            print(f"  Color: {prog.get('color')}")
            print()
        
        # Filter for top-level programs (no parentProjectId, not events)
        top_level = [p for p in programs if not p.get('parentProjectId') and not p.get('isEvent')]
        print(f"\nTop-level programs (should be shown): {len(top_level)}")
        for prog in top_level:
            print(f"  - {prog.get('id')}: {prog.get('title')}")

if __name__ == "__main__":
    test_programs()
