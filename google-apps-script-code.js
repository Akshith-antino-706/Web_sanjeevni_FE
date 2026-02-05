/**
 * Google Apps Script code to handle GET requests for fetching volunteer data
 */

// Handle GET requests to fetch volunteer data
function doGet(e) {
  const action = e.parameter.action;
  const volunteerName = e.parameter.volunteer;

  if (action === 'getAllData' && volunteerName) {
    return getAllVolunteerData(volunteerName);
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
function getAllVolunteerData(volunteerName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'data_v5_' + encodeURIComponent(volunteerName);

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

      // Read header row to determine column indices dynamically
      const headers = values[0] || [];
      const colIdx = {};
      headers.forEach((header, idx) => {
        const h = String(header).toLowerCase().trim();
        if (h === 'date' || h.includes('attendance date')) {
          colIdx.date = idx;
        } else if (h === 'time' && !h.includes('extra') && !h.includes('from') && !h.includes('till')) {
          colIdx.time = idx;
        } else if (h.includes('extra') && h.includes('from')) {
          colIdx.extraFrom = idx;
        } else if (h.includes('extra') && h.includes('till')) {
          colIdx.extraTill = idx;
        } else if (h.includes('reason')) {
          colIdx.reason = idx;
        } else if (h === 'duty' || (h.includes('duty') && !h.includes('from') && !h.includes('hour'))) {
          colIdx.duty = idx;
        } else if (h.includes('hour') || h.includes('hrs')) {
          colIdx.hours = idx;
        } else if (h.includes('duty') && h.includes('from')) {
          colIdx.location = idx;
        } else if (h.includes('remark')) {
          colIdx.remarks = idx;
        }
      });

      // Fallback to default positions (accounting for Timestamp at index 0)
      if (colIdx.date === undefined) colIdx.date = 1;
      if (colIdx.time === undefined) colIdx.time = 2;
      if (colIdx.extraFrom === undefined) colIdx.extraFrom = 3;
      if (colIdx.extraTill === undefined) colIdx.extraTill = 4;
      if (colIdx.reason === undefined) colIdx.reason = 5;
      if (colIdx.duty === undefined) colIdx.duty = 6;
      if (colIdx.hours === undefined) colIdx.hours = 7;
      if (colIdx.location === undefined) colIdx.location = 8;
      if (colIdx.remarks === undefined) colIdx.remarks = 9;

      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (!row[0] && !row[1] && !row[2]) continue;
        attendanceData.push({
          date: formatDate(row[colIdx.date]),
          time: formatTime(row[colIdx.time]),
          extraFrom: formatTime(row[colIdx.extraFrom]),
          extraTill: formatTime(row[colIdx.extraTill]),
          reason: row[colIdx.reason] || '',
          duty: row[colIdx.duty] || '',
          hours: row[colIdx.hours] || '',
          location: row[colIdx.location] || '',
          remarks: row[colIdx.remarks] || ''
        });
      }
    }

    // Find Supervision Sheet (Case-Insensitive)
    const supTargetName = targetName + '_supervision';
    let supSheet = allSheets.find(s => s.getName().toLowerCase().trim() === supTargetName);

    let supervisionData = [];
    if (supSheet) {
      const supValues = supSheet.getDataRange().getValues();

      // Read header row to determine column indices dynamically
      const headers = supValues[0] || [];
      const colIndex = {};
      headers.forEach((header, idx) => {
        const h = String(header).toLowerCase().trim();
        if (h.includes('supervisor') && !h.includes('date')) {
          colIndex.supervisor = idx;
        } else if (h.includes('time') || h.includes('hrs') || h.includes('hours')) {
          colIndex.time = idx;
        } else if (h.includes('date') && !h.includes('supervisor')) {
          colIndex.date = idx;
        } else if (h.includes('remark')) {
          colIndex.remark = idx;
        }
      });

      // Fallback to default positions if headers not found
      // Columns: S.No/Timestamp(0) | Supervisor Name(1) | Time(2) | Date(3) | Remark(4)
      if (colIndex.supervisor === undefined) colIndex.supervisor = 1;
      if (colIndex.time === undefined) colIndex.time = 2;
      if (colIndex.date === undefined) colIndex.date = 3;
      if (colIndex.remark === undefined) colIndex.remark = 4;

      for (let i = 1; i < supValues.length; i++) {
        const row = supValues[i];
        // Skip only if supervisor AND time are both empty (use dynamic column indices)
        const supervisor = row[colIndex.supervisor];
        const timeVal = row[colIndex.time];
        if (!supervisor && (timeVal === undefined || timeVal === '' || timeVal === null)) continue;

        const dateVal = row[colIndex.date];

        supervisionData.push({
          supervisorName: supervisor || '',
          timeInHrs: timeVal !== undefined && timeVal !== '' ? String(timeVal) : '',
          date: formatDate(dateVal) || (dateVal ? String(dateVal) : ''),
          remark: row[colIndex.remark] || ''
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
  cache.remove('data_v5_' + encodeURIComponent(volunteerName));
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

// Helper function to format time as HH:MM
function formatTime(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const hours = value.getHours().toString().padStart(2, '0');
    const minutes = value.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  // Handle ISO string format like "2025-12-17T08:00:00.000Z"
  const str = String(value);
  if (str.includes('T') && str.includes(':')) {
    const timePart = str.split('T')[1];
    if (timePart) {
      const [hours, minutes] = timePart.split(':');
      return `${hours}:${minutes}`;
    }
  }
  return str;
}
