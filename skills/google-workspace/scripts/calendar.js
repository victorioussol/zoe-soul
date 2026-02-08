#!/usr/bin/env node
/**
 * Google Workspace - Google Calendar Helper (Read + Write, NO Delete)
 *
 * Commands:
 *   node calendar.js list [maxResults] [calendarId]           — List upcoming events
 *   node calendar.js today [calendarId]                       — Today's events
 *   node calendar.js week [calendarId]                        — This week's events
 *   node calendar.js get <eventId> [calendarId]               — Get event details
 *   node calendar.js search <query> [maxResults] [calendarId] — Search events
 *   node calendar.js create <jsonFile>                        — Create event from JSON file
 *   node calendar.js quick <text> [calendarId]                — Quick-add event from text
 *   node calendar.js update <eventId> <jsonFile> [calendarId] — Update event from JSON file
 *   node calendar.js calendars                                — List all calendars
 *
 * NOTE: Delete is intentionally NOT supported for safety.
 *
 * JSON format for create/update:
 * {
 *   "summary": "Meeting with Bob",
 *   "description": "Discuss project plan",
 *   "location": "Zoom",
 *   "start": { "dateTime": "2026-02-10T10:00:00-08:00" },
 *   "end": { "dateTime": "2026-02-10T11:00:00-08:00" },
 *   "attendees": [{ "email": "bob@example.com" }],
 *   "reminders": { "useDefault": true }
 * }
 */

const fs = require('fs');
const { google } = require('googleapis');
const { getAuth } = require('./google-auth');

const auth = getAuth();
const calendar = google.calendar({ version: 'v3', auth });

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatEvent(ev) {
  return {
    id: ev.id,
    summary: ev.summary,
    description: ev.description || '',
    location: ev.location || '',
    start: ev.start?.dateTime || ev.start?.date || '',
    end: ev.end?.dateTime || ev.end?.date || '',
    status: ev.status,
    htmlLink: ev.htmlLink,
    creator: ev.creator?.email,
    attendees: (ev.attendees || []).map((a) => ({
      email: a.email,
      responseStatus: a.responseStatus,
    })),
    hangoutLink: ev.hangoutLink || '',
    recurringEventId: ev.recurringEventId || '',
  };
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function endOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() + (7 - d.getDay()));
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function listEvents(maxResults = 10, calendarId = 'primary') {
  const res = await calendar.events.list({
    calendarId,
    maxResults: parseInt(maxResults, 10),
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = (res.data.items || []).map(formatEvent);
  console.log(JSON.stringify(events, null, 2));
}

async function todayEvents(calendarId = 'primary') {
  const res = await calendar.events.list({
    calendarId,
    timeMin: startOfDay(),
    timeMax: endOfDay(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = (res.data.items || []).map(formatEvent);
  console.log(JSON.stringify(events, null, 2));
}

async function weekEvents(calendarId = 'primary') {
  const res = await calendar.events.list({
    calendarId,
    timeMin: startOfDay(),
    timeMax: endOfWeek(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = (res.data.items || []).map(formatEvent);
  console.log(JSON.stringify(events, null, 2));
}

async function getEvent(eventId, calendarId = 'primary') {
  const res = await calendar.events.get({ calendarId, eventId });
  console.log(JSON.stringify(formatEvent(res.data), null, 2));
}

async function searchEvents(query, maxResults = 10, calendarId = 'primary') {
  const res = await calendar.events.list({
    calendarId,
    q: query,
    maxResults: parseInt(maxResults, 10),
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = (res.data.items || []).map(formatEvent);
  console.log(JSON.stringify(events, null, 2));
}

async function createEvent(jsonPath, calendarId = 'primary') {
  let eventData;
  if (jsonPath === '-') {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    eventData = JSON.parse(Buffer.concat(chunks).toString());
  } else {
    eventData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  const res = await calendar.events.insert({
    calendarId,
    requestBody: eventData,
    sendUpdates: 'all',
  });
  console.log('Event created:');
  console.log(JSON.stringify(formatEvent(res.data), null, 2));
}

async function quickAdd(text, calendarId = 'primary') {
  const res = await calendar.events.quickAdd({
    calendarId,
    text,
  });
  console.log('Event created:');
  console.log(JSON.stringify(formatEvent(res.data), null, 2));
}

async function updateEvent(eventId, jsonPath, calendarId = 'primary') {
  let patchData;
  if (jsonPath === '-') {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    patchData = JSON.parse(Buffer.concat(chunks).toString());
  } else {
    patchData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  const res = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: patchData,
    sendUpdates: 'all',
  });
  console.log('Event updated:');
  console.log(JSON.stringify(formatEvent(res.data), null, 2));
}

async function listCalendars() {
  const res = await calendar.calendarList.list();
  const cals = (res.data.items || []).map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary || false,
    accessRole: c.accessRole,
    timeZone: c.timeZone,
  }));
  console.log(JSON.stringify(cals, null, 2));
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

(async () => {
  try {
    switch (command) {
      case 'list':
        await listEvents(args[0], args[1]);
        break;
      case 'today':
        await todayEvents(args[0]);
        break;
      case 'week':
        await weekEvents(args[0]);
        break;
      case 'get':
        if (!args[0]) {
          console.error('Usage: calendar.js get <eventId> [calendarId]');
          process.exit(1);
        }
        await getEvent(args[0], args[1]);
        break;
      case 'search':
        if (!args[0]) {
          console.error('Usage: calendar.js search <query> [maxResults] [calendarId]');
          process.exit(1);
        }
        await searchEvents(args[0], args[1], args[2]);
        break;
      case 'create':
        if (!args[0]) {
          console.error('Usage: calendar.js create <jsonFile|-> [calendarId]');
          process.exit(1);
        }
        await createEvent(args[0], args[1]);
        break;
      case 'quick':
        if (!args[0]) {
          console.error('Usage: calendar.js quick "<text>" [calendarId]');
          process.exit(1);
        }
        await quickAdd(args.join(' '));
        break;
      case 'update':
        if (!args[0] || !args[1]) {
          console.error('Usage: calendar.js update <eventId> <jsonFile|-> [calendarId]');
          process.exit(1);
        }
        await updateEvent(args[0], args[1], args[2]);
        break;
      case 'calendars':
        await listCalendars();
        break;
      default:
        console.error('Calendar Helper — Read + Write (No Delete)');
        console.error('Commands: list, today, week, get, search, create, quick, update, calendars');
        console.error('Examples:');
        console.error('  node calendar.js today');
        console.error('  node calendar.js week');
        console.error('  node calendar.js list 20');
        console.error('  node calendar.js search "standup" 5');
        console.error('  node calendar.js quick "Lunch with Alice tomorrow at noon"');
        console.error('  node calendar.js create event.json');
        console.error('  node calendar.js update abc123 patch.json');
        console.error('  node calendar.js calendars');
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
