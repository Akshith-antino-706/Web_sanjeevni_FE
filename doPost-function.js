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
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'supervision') {
      // ========== SUPERVISION HANDLER ==========
      const sheetName = (data.volunteerName || '').trim() + '_Supervision';
      if (!sheetName || sheetName === '_Supervision') {
        throw new Error('Volunteer name is required for supervision');
      }

      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.getRange(1, 1, 1, 5).setValues([[
          'Timestamp',
          'Supervisor Name',
          'Time (in Hrs)',
          'Supervision Date',
          'Remark'
        ]]);
        sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      }

      sheet.appendRow([
        new Date(),
        data.supervisorName || '',
        data.timeInHrs || '',
        data.date || '',
        data.remark || ''
      ]);

      // Also add to MASTER_SUPERVISION if it exists
      const masterSheet = ss.getSheetByName('MASTER_SUPERVISION');
      if (masterSheet) {
        masterSheet.appendRow([
          new Date(),
          data.volunteerName || '',
          data.supervisorName || '',
          data.timeInHrs || '',
          data.date || '',
          data.remark || ''
        ]);
      }
    } else {
      // ========== ATTENDANCE HANDLER (default/legacy) ==========
      let sheet = ss.getSheetByName(data.volunteerName);

      if (!sheet) {
        sheet = ss.insertSheet(data.volunteerName);
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

      sheet.appendRow([
        new Date(),
        data.date || '',
        data.time || '',
        data.extraFrom || '',
        data.extraTill || '',
        data.reason || '',
        data.duty || '',
        data.hours || '',
        data.dutyFrom || '',
        data.remarks || ''
      ]);

      const masterSheet = ss.getSheetByName('Attendance_Responses');
      if (masterSheet) {
        masterSheet.appendRow([
          new Date(),
          data.volunteerName || '',
          data.date || '',
          data.time || '',
          data.extraFrom || '',
          data.extraTill || '',
          data.reason || '',
          data.duty || '',
          data.hours || '',
          data.dutyFrom || '',
          data.remarks || ''
        ]);
      }
    }

    // Clear cache so the next load gets fresh data
    if (typeof invalidateVolunteerCache === 'function' && data.volunteerName) {
      invalidateVolunteerCache(data.volunteerName);
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
