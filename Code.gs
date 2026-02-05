/************************************************
 * CONFIG
 ************************************************/
const SPREADSHEET_ID = "1LTIvuOVqACwmLCgzAn2Wwj8akk94geJK_143LDw7KQI";

/************************************************
 * USERS & RBAC
 ************************************************/
function getUsersSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Users");

  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.getRange(1, 1, 1, 7).setValues([[
      "Email",
      "Name",
      "Role",
      "Volunteer_Sheet_Name",
      "Created_Date",
      "Last_Login",
      "PIN"
    ]]).setFontWeight("bold");
  }
  return sheet;
}

function getUserByEmail(email) {
  const data = getUsersSheet().getDataRange().getValues();
  const target = email.toLowerCase();

  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] || "").toLowerCase() === target) {
      return {
        email: data[i][0],
        name: data[i][1],
        role: data[i][2],
        volunteerSheetName: data[i][3],
        rowIndex: i + 1
      };
    }
  }
  return null;
}

function isAdmin(email) {
  const user = getUserByEmail(email);
  return user && user.role === "admin";
}

function updateLastLogin(email) {
  const user = getUserByEmail(email);
  if (user) {
    getUsersSheet().getRange(user.rowIndex, 6).setValue(new Date());
  }
}

/************************************************
 * GOOGLE TOKEN VALIDATION
 ************************************************/
function validateGoogleToken(idToken) {
  try {
    const res = UrlFetchApp.fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return null;
    return JSON.parse(res.getContentText());
  } catch (e) {
    return null;
  }
}

/************************************************
 * NORMALIZE VOLUNTEER NAME
 ************************************************/
function normalizeVolunteerName(name) {
  if (!name) return "";
  return name
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/************************************************
 * POST: SAVE VOLUNTEER DATA (Attendance & Supervision)
 ************************************************/
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse("Empty POST body");
    }

    const payload = JSON.parse(e.postData.contents);

    // Accept either token or email for authentication
    let userEmail = null;

    // Try token first
    const tokenInfo = validateGoogleToken(payload.token);
    if (tokenInfo && tokenInfo.email) {
      userEmail = tokenInfo.email;
    } else if (payload.email) {
      userEmail = payload.email;
    }

    if (!userEmail) {
      return errorResponse("Authentication failed");
    }

    const user = getUserByEmail(userEmail);
    if (!user) return errorResponse("Access denied");

    // ========== SUPERVISION HANDLER (No RBAC - Anyone can submit for any volunteer) ==========
    if (payload.type === "supervision") {
      const volunteerName = normalizeVolunteerName(payload.volunteerName || "");

      if (!volunteerName) {
        return errorResponse("Volunteer name required for supervision");
      }

      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheetName = volunteerName + "_Supervision";

      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        // Column order matching existing sheets: S.No | Supervisor | Time | Date | Remark | Timestamp
        sheet.appendRow([
          "S. No",
          "Supervisor Name",
          "Time (in Hrs)",
          "Date",
          "Remark",
          "Timestamp"
        ]);
        sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
      }

      // Column order: S.No | Supervisor Name | Time (in Hrs) | Date | Remark | Timestamp
      // Auto-generate S.No as next row number
      const lastRow = sheet.getLastRow();
      const nextSNo = lastRow; // S.No = current last row (since header is row 1)
      const newRowNum = lastRow + 1;

      // Append the data
      sheet.appendRow([
        nextSNo, // Will be set as number format below
        payload.supervisorName || "",
        payload.timeInHrs || "",
        payload.date || "",
        payload.remark || "",
        new Date()
      ]);

      // Ensure S.No column A is formatted as plain number (not date)
      sheet.getRange(newRowNum, 1).setNumberFormat("0");
      // Ensure Time (in Hrs) column C is formatted as number (not time)
      sheet.getRange(newRowNum, 3).setNumberFormat("0.00");

      // Also append to MASTER_SUPERVISION if it exists
      const masterSheet = ss.getSheetByName("MASTER_SUPERVISION");
      if (masterSheet) {
        masterSheet.appendRow([
          new Date(),
          volunteerName,
          payload.date || "",
          payload.supervisorName || "",
          payload.timeInHrs || "",
          payload.remark || ""
        ]);
      }

      updateLastLogin(userEmail);
      return successResponse({ message: "Supervision saved successfully" });
    }

    // ========== ATTENDANCE HANDLER (default) ==========
    const sheetName = normalizeVolunteerName(user.volunteerSheetName);
    if (!sheetName) return errorResponse("Volunteer sheet not mapped");

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "Timestamp",
        "Date",
        "Time",
        "Extra Time From",
        "Extra Time Till",
        "Reason for Other Duty",
        "Duty",
        "No of Hours",
        "Duty From",
        "Remarks"
      ]);
    }

    sheet.appendRow([
      new Date(),
      payload.date || "",
      payload.time || "",
      payload.extraFrom || "",
      payload.extraTill || "",
      payload.reason || "",
      payload.duty || "",
      payload.hours || "",
      payload.dutyFrom || "",
      payload.remarks || ""
    ]);

    updateLastLogin(userEmail);
    return successResponse({});

  } catch (err) {
    return errorResponse(err.toString());
  }
}

/************************************************
 * GET: ACTION HANDLER
 ************************************************/
function doGet(e) {
  if (!e || !e.parameter) {
    return errorResponse("Invalid request");
  }

  const action = e.parameter.action;

  // ========== EMAIL + PIN LOGIN ==========
  if (action === "authenticateByEmail") {
    const email = e.parameter.email;
    const pin = e.parameter.pin;

    if (!email) return errorResponse("Email required");
    if (!pin) return errorResponse("PIN required");

    const user = getUserByEmail(email);
    if (!user) {
      return errorResponse("Access denied. User not registered.");
    }

    const sheet = getUsersSheet();
    const storedPin = sheet
      .getRange(user.rowIndex, 7)
      .getValue()
      .toString();

    if (storedPin !== pin) {
      return errorResponse("Invalid PIN.");
    }

    updateLastLogin(email);

    return successResponse({
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        volunteerSheetName: user.volunteerSheetName
      }
    });
  }

  // ========== GET USERS (ADMIN ONLY) ==========
  if (action === "getUsers") {
    const tokenInfo = validateGoogleToken(e.parameter.token);
    const email = tokenInfo ? tokenInfo.email : e.parameter.email;

    if (!email) {
      return errorResponse("Authentication required");
    }

    const requester = getUserByEmail(email);
    if (!requester || requester.role !== "admin") {
      return errorResponse("Admin only");
    }

    const data = getUsersSheet().getDataRange().getValues();
    const users = [];
    for (let i = 1; i < data.length; i++) {
      users.push({
        email: data[i][0],
        name: data[i][1],
        role: data[i][2],
        volunteerSheetName: data[i][3]
      });
    }
    return successResponse({ users });
  }

  // ========== ADD USER (ADMIN ONLY) ==========
  if (action === "addUser") {
    const tokenInfo = validateGoogleToken(e.parameter.token);
    const requestingEmail = tokenInfo ? tokenInfo.email : e.parameter.requestingEmail;

    if (!requestingEmail) {
      return errorResponse("Authentication required");
    }

    const requester = getUserByEmail(requestingEmail);
    if (!requester || requester.role !== "admin") {
      return errorResponse("Admin only");
    }

    const newEmail = e.parameter.email;
    const name = e.parameter.name;
    const role = e.parameter.role || "volunteer";
    const volunteerName = e.parameter.volunteerName || name;
    const pin = e.parameter.pin || "1234";

    if (!newEmail || !name) {
      return errorResponse("Email and name required");
    }

    if (getUserByEmail(newEmail)) {
      return errorResponse("User already exists");
    }

    const sheet = getUsersSheet();
    sheet.appendRow([
      newEmail,
      name,
      role,
      volunteerName,
      new Date(),
      "",
      pin
    ]);

    return successResponse({ message: "User added successfully" });
  }

  // ========== DELETE USER (ADMIN ONLY) ==========
  if (action === "deleteUser") {
    const tokenInfo = validateGoogleToken(e.parameter.token);
    const requestingEmail = tokenInfo ? tokenInfo.email : e.parameter.requestingEmail;

    if (!requestingEmail) {
      return errorResponse("Authentication required");
    }

    const requester = getUserByEmail(requestingEmail);
    if (!requester || requester.role !== "admin") {
      return errorResponse("Admin only");
    }

    const targetEmail = e.parameter.email;
    if (!targetEmail) {
      return errorResponse("Target email required");
    }

    if (requestingEmail.toLowerCase() === targetEmail.toLowerCase()) {
      return errorResponse("Cannot delete your own account");
    }

    const targetUser = getUserByEmail(targetEmail);
    if (!targetUser) {
      return errorResponse("User not found");
    }

    const sheet = getUsersSheet();
    sheet.deleteRow(targetUser.rowIndex);

    return successResponse({ message: "User deleted successfully" });
  }

  // ========== FETCH VOLUNTEER DATA (Attendance) ==========
  if (action === "getData") {
    const tokenInfo = validateGoogleToken(e.parameter.token);
    const email = tokenInfo ? tokenInfo.email : e.parameter.email;

    if (!email) {
      return errorResponse("Authentication required");
    }

    const requester = getUserByEmail(email);
    if (!requester) {
      return errorResponse("Access denied");
    }

    let targetSheet = requester.volunteerSheetName;

    if (requester.role === "admin" && e.parameter.volunteer) {
      targetSheet = e.parameter.volunteer;
    }

    if (requester.role === "volunteer" && e.parameter.volunteer) {
      const requestedVolunteer = normalizeVolunteerName(e.parameter.volunteer);
      const assignedVolunteer = normalizeVolunteerName(requester.volunteerSheetName);
      if (requestedVolunteer.toLowerCase() !== assignedVolunteer.toLowerCase()) {
        return errorResponse("Access denied. You can only view your own data.");
      }
      targetSheet = e.parameter.volunteer;
    }

    return getVolunteerData(normalizeVolunteerName(targetSheet));
  }

  // ========== FETCH SUPERVISION DATA (No RBAC - Anyone can view any volunteer's data) ==========
  if (action === "getSupervisionData") {
    const tokenInfo = validateGoogleToken(e.parameter.token);
    const email = tokenInfo ? tokenInfo.email : e.parameter.email;

    if (!email) {
      return errorResponse("Authentication required");
    }

    const requester = getUserByEmail(email);
    if (!requester) {
      return errorResponse("Access denied");
    }

    // Any authenticated user can fetch supervision data for any volunteer
    const targetVolunteer = e.parameter.volunteer || requester.volunteerSheetName;

    return getSupervisionData(normalizeVolunteerName(targetVolunteer));
  }

  // ========== FETCH ALL DATA (Attendance + Supervision) - Optimized Single Request ==========
  // Note: Attendance follows RBAC, Supervision does not
  if (action === "getAllData") {
    const tokenInfo = validateGoogleToken(e.parameter.token);
    const email = tokenInfo ? tokenInfo.email : e.parameter.email;

    if (!email) {
      return errorResponse("Authentication required");
    }

    const requester = getUserByEmail(email);
    if (!requester) {
      return errorResponse("Access denied");
    }

    // Attendance: RBAC-controlled (volunteers always get their own attendance only)
    let attendanceVolunteer = requester.volunteerSheetName;
    if (requester.role === "admin" && e.parameter.volunteer) {
      attendanceVolunteer = e.parameter.volunteer;
    }
    // Note: Volunteers always see only their own attendance, even if they request another volunteer

    // Supervision: No RBAC - any authenticated user can fetch any volunteer's data
    const supervisionVolunteer = e.parameter.volunteer || requester.volunteerSheetName;

    const normalizedAttendance = normalizeVolunteerName(attendanceVolunteer);
    const normalizedSupervision = normalizeVolunteerName(supervisionVolunteer);
    
    // Fetch both attendance and supervision data
    const attendanceData = getVolunteerDataRaw(normalizedAttendance);
    const supervisionData = getSupervisionDataRaw(normalizedSupervision);

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        attendance: attendanceData,
        supervision: supervisionData
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return errorResponse("Invalid action");
}

/************************************************
 * CORE FETCH LOGIC
 ************************************************/
// Raw data fetchers (return arrays, not JSON responses)
function getVolunteerDataRaw(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) return [];

    const values = sheet.getDataRange().getValues();
    const data = [];

    // Read header row to determine column indices dynamically
    const headers = values[0] || [];
    const colIdx = {};
    headers.forEach(function(header, idx) {
      var h = String(header).toLowerCase().trim();
      if (h === "date" || h.includes("attendance date")) {
        colIdx.date = idx;
      } else if (h === "time" && h.indexOf("extra") === -1 && h.indexOf("from") === -1 && h.indexOf("till") === -1) {
        colIdx.time = idx;
      } else if (h.indexOf("extra") !== -1 && h.indexOf("from") !== -1) {
        colIdx.extraFrom = idx;
      } else if (h.indexOf("extra") !== -1 && h.indexOf("till") !== -1) {
        colIdx.extraTill = idx;
      } else if (h.indexOf("reason") !== -1) {
        colIdx.reason = idx;
      } else if (h === "duty" || (h.indexOf("duty") !== -1 && h.indexOf("from") === -1 && h.indexOf("hour") === -1)) {
        colIdx.duty = idx;
      } else if (h.indexOf("hour") !== -1 || h.indexOf("hrs") !== -1) {
        colIdx.hours = idx;
      } else if (h.indexOf("duty") !== -1 && h.indexOf("from") !== -1) {
        colIdx.location = idx;
      } else if (h.indexOf("remark") !== -1) {
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
      if (!row[colIdx.date] && !row[colIdx.time]) continue;

      data.push({
        date: formatDate(row[colIdx.date]),
        time: formatTime(row[colIdx.time]),
        extraFrom: formatTime(row[colIdx.extraFrom]),
        extraTill: formatTime(row[colIdx.extraTill]),
        reason: row[colIdx.reason] || "",
        duty: row[colIdx.duty] || "",
        hours: row[colIdx.hours] || "",
        location: row[colIdx.location] || "",
        remarks: row[colIdx.remarks] || ""
      });
    }

    return data;
  } catch (err) {
    return [];
  }
}

function getSupervisionDataRaw(volunteerName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = (volunteerName || "").trim() + "_Supervision";
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) return [];

    const values = sheet.getDataRange().getValues();
    const data = [];

    // Read header row to determine column indices dynamically
    const headers = values[0] || [];
    const colIndex = {};
    headers.forEach(function(header, idx) {
      var h = String(header).toLowerCase().trim();
      if (h.indexOf("supervisor") !== -1 && h.indexOf("date") === -1) {
        colIndex.supervisor = idx;
      } else if (h.indexOf("time") !== -1 || h.indexOf("hrs") !== -1 || h.indexOf("hours") !== -1) {
        colIndex.time = idx;
      } else if (h.indexOf("date") !== -1 && h.indexOf("supervisor") === -1) {
        colIndex.date = idx;
      } else if (h.indexOf("remark") !== -1) {
        colIndex.remark = idx;
      }
    });

    // Fallback to default positions if headers not found
    // Columns: S.No/Timestamp(0) | Supervisor Name(1) | Time(2) | Date(3) | Remark(4)
    if (colIndex.supervisor === undefined) colIndex.supervisor = 1;
    if (colIndex.time === undefined) colIndex.time = 2;
    if (colIndex.date === undefined) colIndex.date = 3;
    if (colIndex.remark === undefined) colIndex.remark = 4;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      // Skip only if supervisor AND time are both empty (use dynamic column indices)
      const supervisor = row[colIndex.supervisor];
      const time = row[colIndex.time];
      if (!supervisor && (time === undefined || time === "" || time === null)) continue;

      data.push({
        date: formatDate(row[colIndex.date]) || (row[colIndex.date] ? String(row[colIndex.date]) : ""),
        supervisorName: supervisor || "",
        timeInHrs: formatHoursValue(time),
        remark: row[colIndex.remark] || ""
      });
    }

    return data;
  } catch (err) {
    return [];
  }
}

// JSON response wrappers (for individual getData/getSupervisionData actions)
function getVolunteerData(sheetName) {
  try {
    const data = getVolunteerDataRaw(sheetName);
    return successResponse({ data });
  } catch (err) {
    return errorResponse(err.toString());
  }
}

function getSupervisionData(volunteerName) {
  try {
    const data = getSupervisionDataRaw(volunteerName);
    return successResponse({ data });
  } catch (err) {
    return errorResponse(err.toString());
  }
}

/************************************************
 * HELPERS
 ************************************************/
function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );
  }
  return value.toString();
}

function formatTime(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "HH:mm"
    );
  }
  // Handle ISO string format
  const str = String(value);
  if (str.includes("T") && str.includes(":")) {
    const timePart = str.split("T")[1];
    if (timePart) {
      const [hours, minutes] = timePart.split(":");
      return hours + ":" + minutes;
    }
  }
  return str;
}

// Format hours value for supervision "Time (in Hrs)" field
// Value is already in HOURS (frontend converts before saving)
function formatHoursValue(value) {
  if (value === undefined || value === null || value === "") return "";

  // If it's a number, return as-is (already in hours)
  if (typeof value === "number") {
    return value % 1 === 0 ? String(value) : value.toFixed(2);
  }

  // If it's a Date object, Google Sheets stored it as a time serial
  // Need to convert back to decimal hours
  if (value instanceof Date) {
    const year = value.getFullYear();

    // Time-only values have year 1899 or 1900 (Excel/Sheets epoch)
    if (year === 1899 || year === 1900) {
      // Get time components and convert to fraction of day
      const hours = value.getHours();
      const mins = value.getMinutes();
      const secs = value.getSeconds();
      // Convert to decimal (fraction of 24 hours = original decimal value)
      const decimalValue = (hours * 3600 + mins * 60 + secs) / 86400;
      return decimalValue.toFixed(2);
    }

    // Full date - return empty
    return "";
  }

  // If it's a string, try to parse and format
  const str = String(value).trim();

  // Skip full date strings
  if (str.includes("GMT") || str.includes("IST") || str.includes("Standard Time")) {
    return "";
  }

  // Try to parse as number and format nicely
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return num % 1 === 0 ? String(num) : num.toFixed(2);
  }

  // Return as-is if can't parse
  return str;
}

function successResponse(payload) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "success", ...payload })
  ).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "error", message })
  ).setMimeType(ContentService.MimeType.JSON);
}

/************************************************
 * OPTIONAL: ONE-TIME SHEET CLEANUP
 ************************************************/
function normalizeAllSheetNames() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheets().forEach(sheet => {
    const clean = normalizeVolunteerName(sheet.getName());
    if (clean && clean !== sheet.getName()) {
      sheet.setName(clean);
    }
  });
}
