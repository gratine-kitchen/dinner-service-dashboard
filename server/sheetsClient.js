// server/sheetsClient.js
const { google } = require('googleapis');

const sheets = google.sheets('v4');

let auth = null;

function initializeAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // Service account authentication (preferred for backend)
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
  } else if (process.env.GOOGLE_API_KEY) {
    // API key authentication (simpler but read-only)
    auth = process.env.GOOGLE_API_KEY;
  } else {
    throw new Error('No Google authentication credentials provided');
  }
}

async function getSheetData(sheetName, range = null) {
  if (!auth) initializeAuth();
  
  const rangeStr = range || `'${sheetName}'`;
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: rangeStr,
      auth: auth
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error.message);
    throw error;
  }
}

module.exports = {
  getSheetData,
  initializeAuth
};
