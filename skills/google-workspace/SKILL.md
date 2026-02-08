---
name: google-workspace
description: Read Gmail, manage Google Calendar events, and read Google Sheets via Google APIs. Use this skill whenever the user asks about emails, calendar events, schedules, meetings, or spreadsheet data. Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN env vars.
---

# Google Workspace

Access Gmail, Google Calendar, and Google Sheets/Drive using the `exec` tool to run helper scripts.

## Prerequisites

- `GOOGLE_CLIENT_ID` environment variable set
- `GOOGLE_CLIENT_SECRET` environment variable set
- `GOOGLE_REFRESH_TOKEN` environment variable set

All three are OAuth 2.0 credentials obtained via Google Cloud Console.

## Available Scripts

All scripts live under `skills/google-workspace/scripts/` and are invoked via the `exec` tool.

---

### Gmail (Read-Only)

```bash
# List recent messages (default 10)
node skills/google-workspace/scripts/gmail.js list

# List with custom count
node skills/google-workspace/scripts/gmail.js list 20

# List with Gmail search query
node skills/google-workspace/scripts/gmail.js list 10 "from:alice@example.com"

# Read a specific message by ID
node skills/google-workspace/scripts/gmail.js read <messageId>

# Search messages
node skills/google-workspace/scripts/gmail.js search "subject:invoice" 10

# List all labels
node skills/google-workspace/scripts/gmail.js labels

# List threads matching a query
node skills/google-workspace/scripts/gmail.js threads "is:unread" 5
```

**Gmail search operators** (use in queries):
- `from:sender@example.com` — from specific sender
- `to:recipient@example.com` — to specific recipient
- `subject:keyword` — subject contains keyword
- `is:unread` — unread messages
- `is:starred` — starred messages
- `has:attachment` — messages with attachments
- `after:2026/01/01` — messages after date
- `before:2026/02/01` — messages before date
- `label:important` — messages with label
- `in:inbox` / `in:sent` / `in:trash` — messages in folder

---

### Google Calendar (Read + Write, NO Delete)

```bash
# List upcoming events (default 10)
node skills/google-workspace/scripts/calendar.js list

# Today's events
node skills/google-workspace/scripts/calendar.js today

# This week's events
node skills/google-workspace/scripts/calendar.js week

# Get a specific event
node skills/google-workspace/scripts/calendar.js get <eventId>

# Search events by keyword
node skills/google-workspace/scripts/calendar.js search "standup" 5

# Quick-add from natural language
node skills/google-workspace/scripts/calendar.js quick "Lunch with Alice tomorrow at noon"

# Create event from JSON file
# First write the JSON to a temp file, then reference it:
node skills/google-workspace/scripts/calendar.js create /tmp/event.json

# Update event from JSON file
node skills/google-workspace/scripts/calendar.js update <eventId> /tmp/patch.json

# List all calendars
node skills/google-workspace/scripts/calendar.js calendars
```

**Creating events**: Write a JSON file first, then pass the path:

```json
{
  "summary": "Team Standup",
  "description": "Daily sync",
  "location": "Zoom",
  "start": { "dateTime": "2026-02-10T09:00:00-08:00" },
  "end": { "dateTime": "2026-02-10T09:30:00-08:00" },
  "attendees": [{ "email": "bob@example.com" }],
  "reminders": { "useDefault": true }
}
```

**Updating events**: Only include the fields to change:

```json
{
  "summary": "Updated: Team Standup",
  "start": { "dateTime": "2026-02-10T10:00:00-08:00" },
  "end": { "dateTime": "2026-02-10T10:30:00-08:00" }
}
```

**IMPORTANT**: Delete is intentionally not supported. Never attempt to delete calendar events.

---

### Google Sheets & Drive (Read-Only)

```bash
# List recent Drive files (default 10)
node skills/google-workspace/scripts/sheets.js files

# List with custom count
node skills/google-workspace/scripts/sheets.js files 20

# Search Drive files by name or content
node skills/google-workspace/scripts/sheets.js search "budget"

# Get spreadsheet metadata (sheet names, dimensions)
node skills/google-workspace/scripts/sheets.js info <spreadsheetId>

# Read entire first sheet of a spreadsheet
node skills/google-workspace/scripts/sheets.js read <spreadsheetId>

# Read specific range
node skills/google-workspace/scripts/sheets.js read <spreadsheetId> "Sheet1!A1:D10"
```

**Finding a spreadsheet ID**: The ID is the long string in the Google Sheets URL:
`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`

---

## Permissions Summary

| Service | Access Level |
|---------|-------------|
| Gmail | Read-only (list, read, search) |
| Calendar | Read + Write (list, create, update) — NO delete |
| Sheets/Drive | Read-only (list, read, search) |

## Troubleshooting

- **"Missing Google OAuth credentials"**: Ensure all three env vars are set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)
- **"invalid_grant"**: The refresh token has expired or been revoked. Generate a new one via Google OAuth Playground.
- **"Access Not Configured"**: Enable the required API in Google Cloud Console (Gmail API, Calendar API, Drive API).
- **403 Insufficient Permission**: The OAuth scopes don't include the required access. Re-authorize with correct scopes.

## Testing Auth

```bash
node skills/google-workspace/scripts/google-auth.js
```

Returns "Google OAuth2 token refresh successful." if credentials are valid.
