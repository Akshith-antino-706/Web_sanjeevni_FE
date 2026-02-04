/**
 * Google Apps Script code to handle GET requests for fetching volunteer data
 *
 * ADD THIS TO YOUR EXISTING GOOGLE APPS SCRIPT PROJECT:
 * 1. Go to https://script.google.com
 * 2. Open your existing project (the one with the POST handler)
 * 3. Add this doGet function
 * 4. Save and Deploy as Web App (make sure to select "Anyone" for access)
 * 5. Copy the new deployment URL if it changed
 */

// Handle GET requests to fetch volunteer data
function doGet(e) {
  const action = e.parameter.action;
  const volunteerName = e.parameter.volunteer;

  if (action === 'getData' && volunteerName) {
    return getVolunteerData(volunteerName);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid request' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fetch volunteer data from their sheet
function getVolunteerData(volunteerName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // Try to get the sheet with the volunteer's name
    let sheet = spreadsheet.getSheetByName(volunteerName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          data: [],
          message: 'No sheet found for volunteer'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Get all data from the sheet
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    // Skip header row and map data to objects
    // Adjust these column indices based on your actual sheet structure
    const headers = values[0]; // First row is headers
    const data = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      // Skip empty rows
      if (!row[0] && !row[1] && !row[2]) continue;

      // Map row data to object
      // Adjust these based on your column order in the sheet
      data.push({
        date: formatDate(row[0]),       // Column A: Date
        time: row[1] || '',              // Column B: Time
        extraFrom: row[2] || '',         // Column C: Extra Time (From)
        extraTill: row[3] || '',         // Column D: Extra Time (Till)
        reason: row[4] || '',            // Column E: Reason
        duty: row[5] || '',              // Column F: Duty
        hours: row[6] || '',             // Column G: No. of Hours
        location: row[7] || '',          // Column H: Duty From (Centre/Home)
        remarks: row[8] || ''            // Column I: Remarks
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        data: data
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper function to format dates
function formatDate(value) {
  if (!value) return '';

  if (value instanceof Date) {
    const day = value.getDate();
    const month = value.getMonth() + 1;
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return value.toString();
}

/**
 * IMPORTANT: After adding this code:
 *
 * 1. Click "Deploy" > "Manage deployments"
 * 2. Click the pencil icon to edit your deployment
 * 3. Select "New version" in the Version dropdown
 * 4. Make sure "Execute as" is set to "Me"
 * 5. Make sure "Who has access" is set to "Anyone"
 * 6. Click "Deploy"
 *
 * NOTE: If your sheet columns are in a different order, adjust the column
 * indices in the getVolunteerData function (row[0], row[1], etc.)
 *
 * Your sheet structure should be:
 * Column A: Date
 * Column B: Time
 * Column C: Extra Time (From)
 * Column D: Extra Time (Till)
 * Column E: Reason for extra time
 * Column F: Duty
 * Column G: No. of Hours
 * Column H: Duty from Centre/Home
 * Column I: Remarks
 */
