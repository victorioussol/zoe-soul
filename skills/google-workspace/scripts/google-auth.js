#!/usr/bin/env node
/**
 * Google Workspace - Shared OAuth2 Auth Module
 *
 * Provides an authenticated Google OAuth2 client using refresh-token credentials
 * stored in environment variables. Used by all other Google Workspace scripts.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 *
 * Usage (as module):
 *   const { getAuth } = require('./google-auth');
 *   const auth = getAuth();
 */

const { google } = require('googleapis');

function getAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables.'
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

module.exports = { getAuth };

// CLI mode — quick connectivity test
if (require.main === module) {
  (async () => {
    try {
      const auth = getAuth();
      const token = await auth.getAccessToken();
      console.log('Google OAuth2 token refresh successful.');
      console.log('Token type:', token.token ? 'Bearer' : 'unknown');
    } catch (err) {
      console.error('Auth test failed:', err.message);
      process.exit(1);
    }
  })();
}
