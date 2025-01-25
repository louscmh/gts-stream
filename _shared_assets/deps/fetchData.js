const { google } = require('googleapis');
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  keyFile: 'gts-database-cab56273fa2c.json', // Path to your JSON key file
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

async function fetchSheetData() {
  const authClient = await auth.getClient();
  const sheetId = '1OqMK95_fTbYHY3GUXq_7nafhRy8yBHWko_gcTf-CKzg'; // Replace with your Google Sheet ID
  const range = 'Seeding!A1:W126'; // Specify the range you want to access

  const response = await sheets.spreadsheets.values.get({
    auth: authClient,
    spreadsheetId: sheetId,
    range: range,
  });
  return response.data.values;
}

module.exports = { fetchSheetData };
