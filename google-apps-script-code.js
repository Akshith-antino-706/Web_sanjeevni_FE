/**
 * Google Apps Script code to handle GET requests for fetching volunteer data
 */

// Handle GET requests to fetch volunteer data
function doGet(e) {
  const action = e.parameter.action;
  const volunteerName = e.parameter.volunteer;
  const email = e.parameter.email;

  if (action === 'getAllData' && volunteerName) {
    return getAllVolunteerData(volunteerName, email);
  }

  if (action === 'getUsers') {
    if (typeof getUsers === 'function') {
      return getUsers(e);
    }
  }

  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid request' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fetch both attendance and supervision data in one call for speed
// Optimized with CacheService to reduce spreadsheet access time
function getAllVolunteerData(volunteerName, email) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'data_v3_' + encodeURIComponent(volunteerName);

  try {
    // 1. Try to get data from Cache first (lightning fast)
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('Serving from GAS Cache: ' + volunteerName);
      return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    const allSheets = spreadsheet.getSheets();
    const targetName = (volunteerName || '').toLowerCase().trim();

    // Find Attendance Sheet (Case-Insensitive)
    let attendanceSheet = allSheets.find(s => s.getName().toLowerCase().trim() === targetName);

    let attendanceData = [];
    if (attendanceSheet) {
      const values = attendanceSheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (!row[0] && !row[1] && !row[2]) continue;
        attendanceData.push({
          date: formatDate(row[0]),
          time: row[1] || '',
          extraFrom: row[2] || '',
          extraTill: row[3] || '',
          reason: row[4] || '',
          duty: row[5] || '',
          hours: row[6] || '',
          location: row[7] || '',
          remarks: row[8] || ''
        });
      }
    }

    // Find Supervision Sheet (Case-Insensitive)
    const supTargetName = targetName + '_supervision';
    let supSheet = allSheets.find(s => s.getName().toLowerCase().trim() === supTargetName);

    let supervisionData = [];
    if (supSheet) {
      const supValues = supSheet.getDataRange().getValues();
      for (let i = 1; i < supValues.length; i++) {
        const row = supValues[i];
        if (!row[0] && !row[1] && !row[2]) continue;
        supervisionData.push({
          supervisorName: row[1] || '',
          timeInHrs: row[2] !== undefined && row[2] !== '' ? String(row[2]) : '',
          date: formatDate(row[3]) || (row[3] ? String(row[3]) : ''),
          remark: row[4] || ''
        });
      }
    }

    const result = {
      status: 'success',
      attendance: attendanceData,
      supervision: supervisionData,
      fetchTime: new Date().toISOString()
    };

    const jsonResult = JSON.stringify(result);

    // 2. Put in Cache for 10 minutes (600 seconds)
    // This makes subsequent loads for this name instant
    try {
      cache.put(cacheKey, jsonResult, 600);
    } catch (e) {
      console.warn('Cache put failed (likely too large): ' + e.message);
    }

    return ContentService.createTextOutput(jsonResult).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HELPER: Invalidate cache for a volunteer
 * Call this from doPost when new data is added
 */
function invalidateVolunteerCache(volunteerName) {
  const cache = CacheService.getScriptCache();
  cache.remove('data_v3_' + encodeURIComponent(volunteerName));
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
