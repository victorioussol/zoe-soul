#!/usr/bin/env node
/**
 * Google Workspace - Google Sheets & Drive Helper (Read-Only)
 *
 * Commands:
 *   node sheets.js files [maxResults] [query]           — List Drive files (Sheets, Docs, etc.)
 *   node sheets.js read <spreadsheetId> [range]         — Read spreadsheet data
 *   node sheets.js info <spreadsheetId>                 — Get spreadsheet metadata
 *   node sheets.js search <query> [maxResults]          — Search Drive for files
 *
 * All operations are READ-ONLY (drive.readonly scope).
 */

const { google } = require('googleapis');
const { getAuth } = require('./google-auth');

const auth = getAuth();
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

// ── Commands ─────────────────────────────────────────────────────────────────

async function listFiles(maxResults = 10, query = '') {
  const params = {
    pageSize: parseInt(maxResults, 10),
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, owners)',
    orderBy: 'modifiedTime desc',
  };

  // Default: only show Sheets, Docs, and Slides
  let q = "trashed = false";
  if (query) {
    q += ` and (name contains '${query.replace(/'/g, "\\'")}')`;
  }
  params.q = q;

  const res = await drive.files.list(params);
  const files = (res.data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    owner: f.owners?.[0]?.emailAddress || '',
  }));
  console.log(JSON.stringify(files, null, 2));
}

async function readSheet(spreadsheetId, range = '') {
  if (range) {
    // Read specific range
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    console.log(JSON.stringify({
      range: res.data.range,
      values: res.data.values || [],
    }, null, 2));
  } else {
    // Get sheet names first, then read first sheet
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = meta.data.sheets.map((s) => s.properties.title);
    
    const firstSheet = sheetNames[0];
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: firstSheet,
    });
    console.log(JSON.stringify({
      spreadsheetTitle: meta.data.properties.title,
      sheet: firstSheet,
      availableSheets: sheetNames,
      range: res.data.range,
      values: res.data.values || [],
    }, null, 2));
  }
}

async function sheetInfo(spreadsheetId) {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const info = {
    title: res.data.properties.title,
    locale: res.data.properties.locale,
    timeZone: res.data.properties.timeZone,
    spreadsheetUrl: res.data.spreadsheetUrl,
    sheets: res.data.sheets.map((s) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId,
      index: s.properties.index,
      rowCount: s.properties.gridProperties?.rowCount,
      columnCount: s.properties.gridProperties?.columnCount,
    })),
  };
  console.log(JSON.stringify(info, null, 2));
}

async function searchFiles(query, maxResults = 10) {
  const params = {
    pageSize: parseInt(maxResults, 10),
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, owners)',
    q: `trashed = false and (name contains '${query.replace(/'/g, "\\'")}' or fullText contains '${query.replace(/'/g, "\\'")}')`,
    orderBy: 'modifiedTime desc',
  };

  const res = await drive.files.list(params);
  const files = (res.data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    owner: f.owners?.[0]?.emailAddress || '',
  }));
  console.log(JSON.stringify(files, null, 2));
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

(async () => {
  try {
    switch (command) {
      case 'files':
        await listFiles(args[0], args.slice(1).join(' '));
        break;
      case 'read':
        if (!args[0]) {
          console.error('Usage: sheets.js read <spreadsheetId> [range]');
          console.error('  range example: "Sheet1!A1:D10"');
          process.exit(1);
        }
        await readSheet(args[0], args[1]);
        break;
      case 'info':
        if (!args[0]) {
          console.error('Usage: sheets.js info <spreadsheetId>');
          process.exit(1);
        }
        await sheetInfo(args[0]);
        break;
      case 'search':
        if (!args[0]) {
          console.error('Usage: sheets.js search <query> [maxResults]');
          process.exit(1);
        }
        await searchFiles(args[0], args[1]);
        break;
      default:
        console.error('Sheets & Drive Helper — Read Only');
        console.error('Commands: files, read, info, search');
        console.error('Examples:');
        console.error('  node sheets.js files 10');
        console.error('  node sheets.js search "budget"');
        console.error('  node sheets.js info 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms');
        console.error('  node sheets.js read 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms');
        console.error('  node sheets.js read 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms "Sheet1!A1:D10"');
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
