#!/usr/bin/env python3
"""Update the project parent and create an event inside that project."""

import os
from datetime import datetime
from dotenv import load_dotenv
import json
import psycopg

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_DB_URL')
if not SUPABASE_URL:
    raise SystemExit('SUPABASE_DB_URL not set')

project_id = 'project-1780244863222'
program_id = 'program:FinalTest'
event_id = f'event:{project_id}-ActivityDay'

conn = psycopg.connect(SUPABASE_URL)
with conn.cursor() as cur:
    print('Updating project parentProjectId to program:', program_id)
    cur.execute(
        "UPDATE projects SET parent_project_id = %s, program_id = %s WHERE id = %s",
        (program_id, program_id, project_id)
    )

    now = datetime.utcnow().isoformat() + 'Z'
    print('Creating event:', event_id)
    cur.execute(
        "INSERT INTO events (id, title, description, partner_id, image_url, image_hidden, program_module, is_event, parent_project_id, status_mode, manual_status, program_id, status, category, start_date, end_date, location, location_region, location_city, location_barangay, volunteers_needed, volunteers, joined_user_ids, skills_needed, internal_tasks, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            event_id,
            'Nutrition Test Project - Activity Day',
            'Activity day event inside the project',
            None,
            None,
            False,
            'Nutrition',
            True,
            project_id,
            None,
            None,
            program_id,
            'In Progress',
            'Nutrition',
            now,
            now,
            psycopg.types.json.dumps({"latitude": 10.68, "longitude": 122.97, "address": "Binalbagan, Negros Island Region (NIR)"}),
            None,
            None,
            None,
            15,
            json.dumps([]),
            json.dumps([]),
            json.dumps([]),
            json.dumps([]),
            now,
            now,
        )
    )
conn.commit()
conn.close()
print('Done.')
