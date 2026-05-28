"""Seed one pending PBSP proposal card for Communication Hub review testing."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from backend.db import get_postgres_connection
from backend.relational_mirror import ensure_relational_mirror_tables


ADMIN_USER_ID = "admin-1"
PBSP_USER_ID = "partner-user-2"
APPLICATION_ID = "partner-application-sample-pbsp-nutrition-card"
MESSAGE_ID = "msg-sample-pbsp-proposal-card"
PROPOSAL_PREFIX = "___PROPOSAL_CARD___:"


def main() -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    proposal_details = {
        "targetProjectId": None,
        "targetProjectTitle": "Nutrition Program",
        "targetProjectDescription": "Partner-led supplemental feeding and nutrition education.",
        "targetProjectAddress": "Bacolod City, Negros Occidental",
        "requestedProgramModule": "Nutrition",
        "proposedTitle": "Nutrition Project Proposal",
        "proposedDescription": (
            "PBSP proposes a community nutrition support project for undernourished children "
            "and parent groups in Bacolod City. The activity will combine feeding sessions, "
            "nutrition education, and volunteer-supported monitoring."
        ),
        "proposedStartDate": "2026-06-15",
        "proposedEndDate": "2026-07-15",
        "proposedLocation": "Bacolod City, Negros Occidental",
        "proposedVolunteersNeeded": 18,
        "skillsNeeded": ["nutrition education", "community coordination", "documentation"],
        "communityNeed": (
            "Partner barangays reported families needing supplemental feeding support and "
            "practical nutrition guidance for children."
        ),
        "expectedDeliverables": (
            "Four feeding sessions, parent nutrition orientations, attendance monitoring, "
            "and a short completion report with photos."
        ),
        "attachments": [],
    }
    application = {
        "id": APPLICATION_ID,
        "projectId": "program:Nutrition::sample-pbsp-card",
        "partnerUserId": PBSP_USER_ID,
        "partnerName": "PBSP Account",
        "partnerEmail": "partnerships@pbsp.org.ph",
        "proposalDetails": proposal_details,
        "status": "Pending",
        "requestedAt": now_iso,
        "reviewedAt": None,
        "reviewedBy": None,
        "reviewNotes": None,
    }
    card_payload = {
        **proposal_details,
        "status": "Pending",
        "proposedById": PBSP_USER_ID,
        "proposedByName": "PBSP Account",
        "applicationId": APPLICATION_ID,
        "timestamp": now_iso,
    }

    with get_postgres_connection() as connection:
        ensure_relational_mirror_tables(connection)
        connection.rollback()

        with connection.cursor() as cursor:
            cursor.execute(
                "alter table public.partner_project_applications add column if not exists review_notes text"
            )
            cursor.execute(
                """
                insert into public.partner_project_applications (
                  id, project_id, partner_user_id, partner_name, partner_email,
                  proposal_details, status, requested_at, reviewed_at, reviewed_by, review_notes
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (id) do update set
                  project_id = excluded.project_id,
                  partner_user_id = excluded.partner_user_id,
                  partner_name = excluded.partner_name,
                  partner_email = excluded.partner_email,
                  proposal_details = excluded.proposal_details,
                  status = excluded.status,
                  requested_at = excluded.requested_at,
                  reviewed_at = excluded.reviewed_at,
                  reviewed_by = excluded.reviewed_by,
                  review_notes = excluded.review_notes
                """,
                (
                    application["id"],
                    application["projectId"],
                    application["partnerUserId"],
                    application["partnerName"],
                    application["partnerEmail"],
                    json.dumps(application["proposalDetails"]),
                    application["status"],
                    application["requestedAt"],
                    application["reviewedAt"],
                    application["reviewedBy"],
                    application["reviewNotes"],
                ),
            )
            cursor.execute(
                """
                create table if not exists public.messages (
                  id text primary key,
                  sender_id text not null,
                  recipient_id text not null,
                  project_id text,
                  content text not null,
                  timestamp text not null,
                  read boolean not null default false,
                  attachments text not null default '[]'
                )
                """
            )
            cursor.execute(
                """
                insert into public.messages (
                  id, sender_id, recipient_id, project_id, content, timestamp, read, attachments
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (id) do update set
                  sender_id = excluded.sender_id,
                  recipient_id = excluded.recipient_id,
                  project_id = excluded.project_id,
                  content = excluded.content,
                  timestamp = excluded.timestamp,
                  read = excluded.read,
                  attachments = excluded.attachments
                """,
                (
                    MESSAGE_ID,
                    PBSP_USER_ID,
                    ADMIN_USER_ID,
                    None,
                    f"{PROPOSAL_PREFIX}{json.dumps(card_payload, separators=(',', ':'))}",
                    now_iso,
                    False,
                    json.dumps([]),
                ),
            )
        connection.commit()

    print(
        json.dumps(
            {
                "applicationId": APPLICATION_ID,
                "messageId": MESSAGE_ID,
                "sender": "PBSP Account",
                "recipient": "NVC Admin Account",
                "status": "Pending",
                "title": proposal_details["proposedTitle"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
