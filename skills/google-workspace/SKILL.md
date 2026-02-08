---
name: google-workspace
description: Read Gmail, manage Google Calendar events, and read Google Sheets/Drive via Google APIs. Use when the user asks about emails, calendar, schedule, meetings, or spreadsheets.
metadata: {"moltbot":{"requires":{"env":["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","GOOGLE_REFRESH_TOKEN"]}}}
---

# Google Workspace

Access Gmail, Google Calendar, and Google Sheets/Drive. Run these commands with the `exec` tool.

## Gmail (Read-Only)

```bash
# List recent messages (default 10)
node {baseDir}/scripts/gmail.js list

# List with custom count
node {baseDir}/scripts/gmail.js list 20

# List with Gmail search query
node {baseDir}/scripts/gmail.js list 10 "from:alice@example.com"

# Read a specific message by ID
node {baseDir}/scripts/gmail.js read <messageId>

# Search messages
node {baseDir}/scripts/gmail.js search "subject:invoice" 10

# List all labels
node {baseDir}/scripts/gmail.js labels

# List threads matching a query
node {baseDir}/scripts/gmail.js threads "is:unread" 5
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

## Google Calendar (Read + Write, NO Delete)

```bash
# List upcoming events (default 10)
node {baseDir}/scripts/calendar.js list

# Today's events
node {baseDir}/scripts/calendar.js today

# This week's events
node {baseDir}/scripts/calendar.js week

# Get a specific event
node {baseDir}/scripts/calendar.js get <eventId>

# Search events by keyword
node {baseDir}/scripts/calendar.js search "standup" 5

# Quick-add from natural language
node {baseDir}/scripts/calendar.js quick "Lunch with Alice tomorrow at noon"

# Create event from JSON file — write JSON to a temp file first
node {baseDir}/scripts/calendar.js create /tmp/event.json

# Update event — only include fields to change
node {baseDir}/scripts/calendar.js update <eventId> /tmp/patch.json

# List all calendars
node {baseDir}/scripts/calendar.js calendars
```

**Creating events** — write a JSON file, then pass the path:

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

**IMPORTANT**: Delete is intentionally not supported. Never attempt to delete calendar events.

## Google Sheets & Drive (Read-Only)

```bash
# List recent Drive files (default 10)
node {baseDir}/scripts/sheets.js files

# List with custom count
node {baseDir}/scripts/sheets.js files 20

# Search Drive files by name or content
node {baseDir}/scripts/sheets.js search "budget"

# Get spreadsheet metadata (sheet names, dimensions)
node {baseDir}/scripts/sheets.js info <spreadsheetId>

# Read entire first sheet of a spreadsheet
node {baseDir}/scripts/sheets.js read <spreadsheetId>

# Read specific range
node {baseDir}/scripts/sheets.js read <spreadsheetId> "Sheet1!A1:D10"
```

**Finding a spreadsheet ID**: The ID is in the Google Sheets URL:
`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`

## Permissions Summary

| Service | Access Level |
|---------|-------------|
| Gmail | Read-only (list, read, search) |
| Calendar | Read + Write (list, create, update) — NO delete |
| Sheets/Drive | Read-only (list, read, search) |
