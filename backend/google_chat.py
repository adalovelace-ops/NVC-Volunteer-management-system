"""
Google Chat API integration.

Two capabilities live here:

1. In-app Google Chat panel (per-user, via domain-wide delegation)
   The Messages screen can render Google Chat itself. The backend lists the spaces the
   signed-in app user belongs to, loads thread history, and sends messages -- all by
   impersonating the user's Google Workspace email (domain-wide delegation). This
   requires a Workspace admin to grant the service account permission to impersonate
   users (see docs/GOOGLE_CHAT_SETUP.md).

2. Mirroring (bot identity)
   When a user sends a direct message or a project group chat message in the app, the
   backend can post a copy into a designated space using the Chat REST API
   (``spaces.messages.create``) as the bot. The mirror is fire-and-forget: a failure
   to reach Google Chat is logged and never blocks or fails the app message save.

Authentication
--------------
A Google Cloud service account signs a JWT assertion which is exchanged for a short-lived
OAuth access token.
- Bot scope (``chat.bot``): used for mirroring and requires the bot to be a member of
  each space.
- User scopes (``chat.messages``, ``chat.spaces.readonly``): used for the in-app panel.
  The JWT includes a ``sub`` claim (the app user's Google Workspace email) so the token
  acts as that user. This requires domain-wide delegation.

Configuration (.env)
--------------------
    GOOGLE_CHAT_ENABLED
        "true" to enable the Chat integration. Defaults to "false".
    GOOGLE_CHAT_SERVICE_ACCOUNT_JSON
        Path to the service account JSON file, or the raw JSON text itself.
    GOOGLE_CHAT_DM_SPACE_ID
        Space (or room key) that receives direct messages, e.g. "AAAAabc123".
    GOOGLE_CHAT_GROUP_SPACE_IDS
        JSON object mapping project id -> space (or room key), e.g.
        '{"proj-1": "AAAAxyz", "proj-2": "AAAAqrs"}'.
    GOOGLE_CHAT_GROUP_FALLBACK_SPACE_ID
        Space used for group messages whose project has no entry in
        GOOGLE_CHAT_GROUP_SPACE_IDS. Optional.
    GOOGLE_CHAT_DISPLAY_NAME
        Sender label shown in Chat (defaults to "VolCRE").
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
import jwt
from dotenv import load_dotenv

load_dotenv()

OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
CHAT_SPACES_URL = "https://chat.googleapis.com/v1/spaces"
CHAT_SPACE_MESSAGES_URL = "https://chat.googleapis.com/v1/spaces/{space_id}/messages"
CHAT_SCOPE = "https://www.googleapis.com/auth/chat.bot"
CHAT_USER_SCOPES = (
    "https://www.googleapis.com/auth/chat.messages "
    "https://www.googleapis.com/auth/chat.spaces.readonly"
)
TOKEN_EXPIRY_BUFFER_SECONDS = 60
MESSAGE_TEXT_LIMIT = 1500

# OAuth tokens are cached per (impersonated user, scope set) pair.
_token_cache: dict[str, dict[str, Any]] = {}


def is_google_chat_enabled() -> bool:
    return str(os.getenv("GOOGLE_CHAT_ENABLED", "")).strip().lower() in {"1", "true", "yes", "on"}


def _display_name() -> str:
    return str(os.getenv("GOOGLE_CHAT_DISPLAY_NAME", "")).strip() or "VolCRE"


def _load_service_account_info() -> dict[str, Any] | None:
    raw = str(os.getenv("GOOGLE_CHAT_SERVICE_ACCOUNT_JSON", "")).strip()
    if not raw:
        return None
    if os.path.isfile(raw):
        try:
            with open(raw, "r", encoding="utf-8") as handle:
                return json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"[GOOGLE_CHAT] Could not read service account file '{raw}': {exc}")
            return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print("[GOOGLE_CHAT] GOOGLE_CHAT_SERVICE_ACCOUNT_JSON is neither a file path nor valid JSON.")
        return None


def _build_jwt(info: dict[str, Any], sub: str | None = None, scopes: str = CHAT_SCOPE) -> str:
    now = int(time.time())
    claims = {
        "iss": info["client_email"],
        "scope": scopes,
        "aud": OAUTH_TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    }
    if sub:
        # Impersonate a domain user (requires domain-wide delegation on the service account).
        claims["sub"] = sub
    return jwt.encode(claims, info["private_key"], algorithm="RS256")


def _token_cache_key(sub: str | None, scopes: str) -> str:
    return f"{sub or ''}:::{scopes}"


def _get_access_token(sub: str | None = None, scopes: str = CHAT_SCOPE) -> str | None:
    now = time.time()
    key = _token_cache_key(sub, scopes)
    cached = _token_cache.get(key) or {}
    token = cached.get("token")
    if token and cached.get("expires_at", 0.0) > now + TOKEN_EXPIRY_BUFFER_SECONDS:
        return token

    info = _load_service_account_info()
    if not info:
        return None

    try:
        assertion = _build_jwt(info, sub=sub, scopes=scopes)
        response = httpx.post(
            OAUTH_TOKEN_URL,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        print(f"[GOOGLE_CHAT] Token exchange failed (sub={sub or 'bot'}): {exc}")
        return None

    token = payload.get("access_token")
    if not token:
        print(f"[GOOGLE_CHAT] Token response did not include an access token: {payload}")
        return None

    expires_in = int(payload.get("expires_in", 3600))
    _token_cache[key] = {"token": token, "expires_at": now + expires_in}
    return token


def _normalize_space_id(value: str) -> str:
    value = (value or "").strip().strip('"').strip()
    if not value:
        return ""
    return value if value.startswith("spaces/") else f"spaces/{value}"


def post_text_message(space_id: str, text: str) -> bool:
    if not is_google_chat_enabled():
        return False
    normalized_space_id = _normalize_space_id(space_id)
    if not normalized_space_id or not text:
        return False

    token = _get_access_token()
    if not token:
        return False

    try:
        response = httpx.post(
            CHAT_SPACE_MESSAGES_URL.format(space_id=normalized_space_id),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"text": text},
            timeout=20,
        )
        response.raise_for_status()
    except Exception as exc:
        print(f"[GOOGLE_CHAT] Failed to post message to '{normalized_space_id}': {exc}")
        return False

    return True


def _user_email(value: str | None) -> str:
    return (value or "").strip()


def list_spaces_for_user(user_email: str) -> list[dict[str, Any]] | None:
    """Returns the spaces the impersonated user belongs to, or None on failure."""
    email = _user_email(user_email)
    if not is_google_chat_enabled() or not email:
        return None

    token = _get_access_token(sub=email, scopes=CHAT_USER_SCOPES)
    if not token:
        return None

    spaces: list[dict[str, Any]] = []
    page_token = ""
    filter_value = "spaceType=SPACE OR spaceType=DIRECT_MESSAGE OR spaceType=GROUP_CHAT"
    try:
        while True:
            params: list[tuple[str, str]] = [
                ("filter", filter_value),
                ("pageSize", "100"),
                (
                    "fields",
                    "spaces(name,displayName,spaceType,lastActiveTime,membershipsCount,spaceThreadingState,threaded),nextPageToken",
                ),
            ]
            if page_token:
                params.append(("pageToken", page_token))
            response = httpx.get(
                CHAT_SPACES_URL,
                params=params,
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()
            spaces.extend(payload.get("spaces") or [])
            page_token = payload.get("nextPageToken") or ""
            if not page_token:
                break
            if len(spaces) >= 500:
                break
    except Exception as exc:
        print(f"[GOOGLE_CHAT] Failed to list spaces for '{email}': {exc}")
        return None

    return spaces


def list_messages_for_user(
    space_id: str,
    user_email: str,
    page_size: int = 100,
    page_token: str = "",
) -> dict[str, Any] | None:
    """Returns {messages, nextPageToken} for a space, or None on failure."""
    email = _user_email(user_email)
    if not is_google_chat_enabled() or not email:
        return None
    normalized_space_id = _normalize_space_id(space_id)
    if not normalized_space_id:
        return None

    token = _get_access_token(sub=email, scopes=CHAT_USER_SCOPES)
    if not token:
        return None

    try:
        params: list[tuple[str, str]] = [
            ("pageSize", str(max(1, min(int(page_size), 1000)))),
        ]
        if page_token:
            params.append(("pageToken", page_token))
        response = httpx.get(
            CHAT_SPACE_MESSAGES_URL.format(space_id=normalized_space_id),
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        print(f"[GOOGLE_CHAT] Failed to list messages in '{normalized_space_id}': {exc}")
        return None


def create_message_for_user(space_id: str, user_email: str, text: str) -> dict[str, Any] | None:
    """Posts a message to a space as the impersonated user. Returns the created message or None."""
    email = _user_email(user_email)
    if not is_google_chat_enabled() or not email:
        return None
    normalized_space_id = _normalize_space_id(space_id)
    content = (text or "").strip()
    if not normalized_space_id or not content:
        return None

    token = _get_access_token(sub=email, scopes=CHAT_USER_SCOPES)
    if not token:
        return None

    try:
        response = httpx.post(
            CHAT_SPACE_MESSAGES_URL.format(space_id=normalized_space_id),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"text": content},
            timeout=20,
        )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        print(f"[GOOGLE_CHAT] Failed to create message in '{normalized_space_id}': {exc}")
        return None


def _shorten(text: str, limit: int = MESSAGE_TEXT_LIMIT) -> str:
    cleaned = (text or "").strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def _format_timestamp(iso_value: str | None) -> str:
    if not iso_value:
        return ""
    try:
        parsed = datetime.fromisoformat(str(iso_value).replace("Z", "+00:00"))
        return parsed.astimezone().strftime("%b %d, %I:%M %p")
    except Exception:
        return ""


def _sender_label(sender_name: str, sender_id: str) -> str:
    name = (sender_name or "").strip()
    return name if name and name != sender_id else _display_name()


def mirror_direct_message(
    message: dict[str, Any],
    sender_name: str,
    recipient_name: str,
) -> bool:
    """Posts a direct message into the configured Google Chat DM space."""
    if not is_google_chat_enabled():
        return False

    space_id = str(os.getenv("GOOGLE_CHAT_DM_SPACE_ID", "")).strip()
    if not space_id:
        return False

    sender = _sender_label(sender_name, str(message.get("senderId") or ""))
    recipient = (recipient_name or "").strip() or str(message.get("recipientId") or "User")
    content = _shorten(message.get("content") or "")
    timestamp = _format_timestamp(message.get("timestamp"))

    lines = [f"*{sender} → {recipient}*"]
    if timestamp:
        lines.append(f"🕐 {timestamp}")
    if content:
        lines.append("")
        lines.append(content)
    for attachment in message.get("attachments") or []:
        lines.append(f"📎 {attachment}")

    return post_text_message(space_id, "\n".join(lines))


def mirror_group_message(
    message: dict[str, Any],
    project_title: str,
    sender_name: str,
) -> bool:
    """Posts a project group chat message into the project's Google Chat space."""
    if not is_google_chat_enabled():
        return False

    project_id = str(message.get("projectId") or "")
    space_id = _group_space_id(project_id)
    if not space_id:
        return False

    sender = _sender_label(sender_name, str(message.get("senderId") or ""))
    project_label = (project_title or "").strip() or project_id or "Project"
    content = _shorten(message.get("content") or "")
    timestamp = _format_timestamp(message.get("timestamp"))
    kind = str(message.get("kind") or "message")

    kind_tags = {
        "need-post": "🧭 Need Post",
        "need-response": "🔁 Need Response",
        "scope-proposal": "📋 Scope Proposal",
    }
    kind_tag = kind_tags.get(kind)

    lines = [f"*{project_label}* — {sender}"]
    if kind_tag:
        lines.append(f"`{kind_tag}`")
    if timestamp:
        lines.append(f"🕐 {timestamp}")
    if content:
        lines.append("")
        lines.append(content)
    for attachment in message.get("attachments") or []:
        lines.append(f"📎 {attachment}")

    return post_text_message(space_id, "\n".join(lines))


def _group_space_id(project_id: str) -> str:
    raw = str(os.getenv("GOOGLE_CHAT_GROUP_SPACE_IDS", "")).strip()
    mapping: dict[str, Any] = {}
    if raw:
        try:
            mapping = json.loads(raw)
        except json.JSONDecodeError:
            print("[GOOGLE_CHAT] GOOGLE_CHAT_GROUP_SPACE_IDS is not valid JSON.")
    matched = mapping.get(project_id) if project_id else None
    if matched:
        return str(matched)
    return str(os.getenv("GOOGLE_CHAT_GROUP_FALLBACK_SPACE_ID", "")).strip()
