"""
Check volunteer data for Rainer Acidillo to see why they have counts.
"""
from dotenv import load_dotenv
from db import get_connection
from app_storage_seed import get_postgres_hot_storage_collection
import json

load_dotenv()

def check_volunteer_data():
    with get_connection() as connection:
        print("=== CHECKING VOLUNTEER DATA ===\n")
        
        # Get all volunteers
        volunteers = get_postgres_hot_storage_collection(connection, "volunteers")
        print(f"Total volunteers: {len(volunteers)}\n")
        
        for vol in volunteers:
            print(f"Volunteer: {vol.get('name')} (ID: {vol.get('id')})")
            print(f"  User ID: {vol.get('userId')}")
            print(f"  Past Projects: {vol.get('pastProjects', [])}")
            print(f"  Total Hours: {vol.get('totalHoursContributed', 0)}")
            print()
        
        # Get all join records
        joins = get_postgres_hot_storage_collection(connection, "volunteerProjectJoins")
        print(f"\nTotal join records: {len(joins)}\n")
        
        for join in joins:
            print(f"Join Record: {join.get('id')}")
            print(f"  Volunteer ID: {join.get('volunteerId')}")
            print(f"  Volunteer Name: {join.get('volunteerName')}")
            print(f"  Project ID: {join.get('projectId')}")
            print(f"  Status: {join.get('participationStatus')}")
            print()
        
        # Get all projects/events
        projects = get_postgres_hot_storage_collection(connection, "projects")
        events = get_postgres_hot_storage_collection(connection, "events")
        all_projects = projects + events
        
        print(f"\nTotal projects/events: {len(all_projects)}\n")
        
        for proj in all_projects:
            if proj.get('volunteers') or proj.get('joinedUserIds'):
                print(f"Project: {proj.get('title')} (ID: {proj.get('id')})")
                print(f"  Volunteers: {proj.get('volunteers', [])}")
                print(f"  Joined User IDs: {proj.get('joinedUserIds', [])}")
                print(f"  Is Event: {proj.get('isEvent', False)}")
                print()

if __name__ == "__main__":
    check_volunteer_data()
