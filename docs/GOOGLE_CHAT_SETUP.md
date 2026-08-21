# Google Chat Integration Setup

The system has two Google Chat features, both powered by the Google Chat REST API:

1. **In-app Google Chat panel (primary)** — the Messages screen shows a "Google Chat"
   section. Users see their own Google Chat spaces, read thread history, and send
   messages — all rendered natively inside the app (no new tab, no iframe). Messages are
   sent **as the signed-in user** via Google Workspace *domain-wide delegation*.
2. **Mirroring (optional)** — when a direct message or project group chat message is
   sent in the app's own chat, a copy can also be posted into a designated space by a
   bot. One-way (app → Google Chat) and fire-and-forget.

---

## 1. Create / choose a Google Cloud project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or reuse an existing one), e.g. `volcre-chat`.
3. Note the **Project ID**.

## 2. Enable the Google Chat API

1. In your project, open **APIs & Services → Library**.
2. Search for **Google Chat API** and click **Enable**.

## 3. Create a service account and download its key

1. Open **APIs & Services → Credentials → Create Credentials → Service account**.
2. Name it e.g. `volcre-chat`, then **Create and Continue → Done**.
3. In the service account list, open the account you just created:
   - **Details** tab → copy the **OAuth 2 Client ID** (needed for step 4).
   - **Keys → Add Key → Create new key → JSON** → a JSON file downloads.
4. Keep that JSON file safe. It contains the `client_email` and `private_key` used to
   authenticate.

## 4. Enable domain-wide delegation (for "send as each real user")

For the in-app panel to send messages *as* each signed-in user, the service account must
be allowed to impersonate users in your Google Workspace domain.

1. Open the [Google Workspace Admin console](https://admin.google.com/).
2. **Security → Access and data control → API controls → Manage Domain Wide Delegation.**
3. Click **Add new** and fill in:
   - **Client ID**: the service account's OAuth 2 Client ID (from step 3).
   - **OAuth scopes**:
     ```
     https://www.googleapis.com/auth/chat.messages,
     https://www.googleapis.com/auth/chat.spaces.readonly
     ```
4. Click **Authorize**.

Notes:

- Every app user who wants to use the Google Chat panel needs a **Google Workspace
  account in this domain**, and their `email` on the app user record must be that
  Workspace email.
- Domain-wide delegation is not needed for the optional mirroring feature.

## 5. (Optional, mirroring only) Create a Google Chat app and spaces

Only needed if you also want the bot mirror to work.

1. In the same project, open **APIs & Services → Google Chat API → Configuration**.
   Fill in the app name (e.g. "VolCRE Chat Bot"), set availability to your domain/users,
   and **Save / Publish**.
2. Create spaces in [Google Chat](https://chat.google.com/) and add the bot as a member
   of each one (**Space settings → Apps → Add apps**).
3. Copy each space's ID from its URL: for
   `https://chat.google.com/room/AAAAbC123...`, the part after `room/` (`AAAAbC123...`)
   is the space ID.

The panel does **not** require this — users just use their existing spaces.

## 6. Configure the backend (`.env`)

Edit `volunteer-system/.env` and fill in:

```dotenv
GOOGLE_CHAT_ENABLED=true
GOOGLE_CHAT_SERVICE_ACCOUNT_JSON=C:/path/to/service-account.json
# --- Optional: mirroring only ---
GOOGLE_CHAT_DM_SPACE_ID=AAAAbC123...            # space that receives direct messages
GOOGLE_CHAT_GROUP_SPACE_IDS={"proj-1":"AAAAxyz","proj-2":"AAAAqrs"}
GOOGLE_CHAT_GROUP_FALLBACK_SPACE_ID=AAAAdef456   # optional fallback for unmapped projects
GOOGLE_CHAT_DISPLAY_NAME=VolCRE
```

Notes:

- `GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` can be the **path** to the downloaded JSON file or
  the **raw JSON text** (surround it in single quotes in `.env` if it contains spaces).
- The **panel needs only** `GOOGLE_CHAT_ENABLED=true` and
  `GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` (plus domain-wide delegation). The `GOOGLE_CHAT_*`
  mirror variables are optional.
- Space IDs may be pasted with or without the `spaces/` prefix; the backend normalizes
  them automatically.

## 7. Restart the backend

```bash
npm run restart
```

Watch the backend console for lines starting with `[GOOGLE_CHAT]` — errors there tell
you if a token exchange or an API call failed.

## 8. Test (in-app panel)

1. Log in with a user whose email is a Workspace account in your domain.
2. Open the **Messages** screen and click **Google Chat** in the left rail.
3. The panel lists the user's Google Chat spaces.
4. Click a space to read its history; type a message and press send — it appears in
   Google Chat as that user.

## 9. Test (optional mirror)

1. Send a **direct message** or a **project group chat** message in the app.
2. The bot posts a copy into the configured space (sender, timestamp, content).

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Panel shows "Google Chat is not configured" | `GOOGLE_CHAT_ENABLED` is not `true`, or no service account JSON is set. |
| Panel error "Failed to reach Google Chat" | See backend logs; usually the token exchange failed (wrong JSON path, Chat API not enabled) or DWD is not set up. |
| `Token exchange failed` | Service account JSON path/content is wrong, or the Chat API is not enabled on the project. |
| `403` / `PERMISSION_DENIED` on list/send | Domain-wide delegation missing, the user's email is not in your Workspace domain, or the scopes (`chat.messages`, `chat.spaces.readonly`) were not authorized. |
| Panel lists no spaces | The user is not a member of any space, or their email isn't a Workspace account. |
| Mirroring: no messages appear in Chat | `GOOGLE_CHAT_DM_SPACE_ID`/`GROUP_*` unset, or the bot is not a member of the space. |
| Message posts but no sender name | The sender user has no `name` on the user record; the bot uses `GOOGLE_CHAT_DISPLAY_NAME`. |

## How it works internally

- `backend/google_chat.py` signs a JWT with the service account's private key and
  exchanges it for an OAuth token.
  - **Panel:** the JWT includes a `sub` claim (the app user's Workspace email) and scopes
    `chat.messages` + `chat.spaces.readonly`; the token then acts as that user on
    `GET /v1/spaces`, `GET /v1/spaces/{space}/messages`, and
    `POST /v1/spaces/{space}/messages`.
  - **Mirror:** a token scoped to `chat.bot` posts to `spaces.messages.create`.
  - Tokens are cached per (user, scope) pair.
- `backend/api.py` exposes `GET /google-chat/spaces`, `GET /google-chat/messages`, and
  `POST /google-chat/messages`, and starts a background thread for the optional mirror.
- `components/GoogleChatPanel.tsx` renders the space list + thread + composer inside the
  Messages screen, refreshing every ~10s.
