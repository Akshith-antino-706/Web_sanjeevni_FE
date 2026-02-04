/**
 * =====================================================
 * doPost FUNCTION - ADD THIS TO YOUR GOOGLE APPS SCRIPT
 * =====================================================
 *
 * This function handles form submissions from the web app.
 *
 * INSTRUCTIONS:
 * 1. Go to your Google Apps Script project
 * 2. Add this doPost function to your code
 * 3. Click "Deploy" > "Manage deployments"
 * 4. Edit your deployment and select "New version"
 * 5. Click "Deploy"
 */

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);

    // Get the spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get the volunteer's sheet (or create if it doesn't exist)
    let sheet = ss.getSheetByName(data.volunteerName);

    if (!sheet) {
      // Create a new sheet for this volunteer
      sheet = ss.insertSheet(data.volunteerName);
      // Add headers
      sheet.getRange(1, 1, 1, 10).setValues([[
        'Timestamp',
        'Date',
        'Time',
        'Extra Time From',
        'Extra Time Till',
        'Reason for Other',
        'Duty',
        'No of Hours',
        'Duty From',
        'Remarks'
      ]]);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    }

    // Append the new row of data
    sheet.appendRow([
      new Date(),                    // Timestamp
      data.date || '',               // Date
      data.time || '',               // Time
      data.extraFrom || '',          // Extra Time From
      data.extraTill || '',          // Extra Time Till
      data.reason || '',             // Reason for Other
      data.duty || '',               // Duty
      data.hours || '',              // No of Hours
      data.dutyFrom || '',           // Duty From
      data.remarks || ''             // Remarks
    ]);

    // Also add to master Attendance_Responses sheet if it exists
    let masterSheet = ss.getSheetByName('Attendance_Responses');
    if (masterSheet) {
      masterSheet.appendRow([
        new Date(),                    // Timestamp
        data.volunteerName || '',      // Volunteer Name
        data.date || '',               // Date
        data.time || '',               // Time
        data.extraFrom || '',          // Extra Time From
        data.extraTill || '',          // Extra Time Till
        data.reason || '',             // Reason for Other
        data.duty || '',               // Duty
        data.hours || '',              // No of Hours
        data.dutyFrom || '',           // Duty From
        data.remarks || ''             // Remarks
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Data saved successfully' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
