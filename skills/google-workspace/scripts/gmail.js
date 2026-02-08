#!/usr/bin/env node
/**
 * Google Workspace - Gmail Helper (Read-Only)
 *
 * Commands:
 *   node gmail.js list [maxResults] [query]     — List recent messages
 *   node gmail.js read <messageId>              — Read a specific message
 *   node gmail.js search <query> [maxResults]   — Search messages
 *   node gmail.js labels                        — List all labels
 *   node gmail.js threads <query> [maxResults]  — List threads matching query
 *
 * All operations are READ-ONLY (gmail.readonly scope).
 */

const { google } = require('googleapis');
const { getAuth } = require('./google-auth');

const auth = getAuth();
const gmail = google.gmail({ version: 'v1', auth });

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeBase64Url(str) {
  if (!str) return '';
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function getHeader(headers, name) {
  const h = (headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

function extractBody(payload) {
  // Simple text/plain body
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  // Multipart — find text/plain part
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }
  // Fallback: text/html
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return '[HTML] ' + decodeBase64Url(payload.body.data).substring(0, 2000);
  }
  return '';
}

function formatMessage(msg) {
  const headers = msg.payload?.headers || [];
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    subject: getHeader(headers, 'Subject'),
    date: getHeader(headers, 'Date'),
    snippet: msg.snippet,
    labels: msg.labelIds,
    body: extractBody(msg.payload),
  };
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function listMessages(maxResults = 10, query = '') {
  const params = { userId: 'me', maxResults: parseInt(maxResults, 10) };
  if (query) params.q = query;

  const res = await gmail.users.messages.list(params);
  const messages = res.data.messages || [];

  if (messages.length === 0) {
    console.log('No messages found.');
    return;
  }

  // Fetch summaries for each message
  const summaries = await Promise.all(
    messages.map(async (m) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      const headers = full.data.payload?.headers || [];
      return {
        id: m.id,
        from: getHeader(headers, 'From'),
        subject: getHeader(headers, 'Subject'),
        date: getHeader(headers, 'Date'),
        snippet: full.data.snippet,
      };
    })
  );

  console.log(JSON.stringify(summaries, null, 2));
}

async function readMessage(messageId) {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  console.log(JSON.stringify(formatMessage(res.data), null, 2));
}

async function searchMessages(query, maxResults = 10) {
  await listMessages(maxResults, query);
}

async function listLabels() {
  const res = await gmail.users.labels.list({ userId: 'me' });
  const labels = (res.data.labels || []).map((l) => ({ id: l.id, name: l.name, type: l.type }));
  console.log(JSON.stringify(labels, null, 2));
}

async function listThreads(query, maxResults = 10) {
  const params = { userId: 'me', maxResults: parseInt(maxResults, 10) };
  if (query) params.q = query;

  const res = await gmail.users.threads.list(params);
  const threads = res.data.threads || [];

  if (threads.length === 0) {
    console.log('No threads found.');
    return;
  }

  const summaries = await Promise.all(
    threads.map(async (t) => {
      const full = await gmail.users.threads.get({
        userId: 'me',
        id: t.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      const firstMsg = full.data.messages?.[0];
      const headers = firstMsg?.payload?.headers || [];
      return {
        threadId: t.id,
        messageCount: full.data.messages?.length || 0,
        from: getHeader(headers, 'From'),
        subject: getHeader(headers, 'Subject'),
        date: getHeader(headers, 'Date'),
        snippet: firstMsg?.snippet,
      };
    })
  );

  console.log(JSON.stringify(summaries, null, 2));
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

(async () => {
  try {
    switch (command) {
      case 'list':
        await listMessages(args[0], args.slice(1).join(' '));
        break;
      case 'read':
        if (!args[0]) {
          console.error('Usage: gmail.js read <messageId>');
          process.exit(1);
        }
        await readMessage(args[0]);
        break;
      case 'search':
        if (!args[0]) {
          console.error('Usage: gmail.js search <query> [maxResults]');
          process.exit(1);
        }
        await searchMessages(args[0], args[1]);
        break;
      case 'labels':
        await listLabels();
        break;
      case 'threads':
        await listThreads(args[0], args[1]);
        break;
      default:
        console.error('Gmail Helper — Read Only');
        console.error('Commands: list, read, search, labels, threads');
        console.error('Examples:');
        console.error('  node gmail.js list 5');
        console.error('  node gmail.js read 18dc1234abcd');
        console.error('  node gmail.js search "from:boss@company.com" 10');
        console.error('  node gmail.js labels');
        console.error('  node gmail.js threads "subject:meeting" 5');
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
