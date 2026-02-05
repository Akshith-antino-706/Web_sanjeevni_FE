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

    // ========== SUPERVISION HANDLER ==========
    if (payload.type === "supervision") {
      let volunteerName = normalizeVolunteerName(payload.volunteerName || "");

      // Volunteers can only submit supervision for themselves
      if (user.role === "volunteer") {
        const assigned = normalizeVolunteerName(user.volunteerSheetName || "");
        if (!volunteerName || volunteerName.toLowerCase() !== assigned.toLowerCase()) {
          return errorResponse("Volunteers can only submit supervision for themselves");
        }
        volunteerName = assigned;
      }

      // Admins can submit for any volunteer
      if (user.role === "admin" && payload.volunteerName) {
        volunteerName = normalizeVolunteerName(payload.volunteerName);
      }

      if (!volunteerName) {
        return errorResponse("Volunteer name required for supervision");
      }

      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheetName = volunteerName + "_Supervision";

      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow([
          "Timestamp",
          "Supervisor Name",
          "Time (in Hrs)",
          "Supervision Date",
          "Remark"
        ]);
        sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
      }

      sheet.appendRow([
        new Date(),
        payload.supervisorName || "",
        payload.timeInHrs || "",
        payload.date || "",
        payload.remark || ""
      ]);

      // Also append to MASTER_SUPERVISION if it exists
      const masterSheet = ss.getSheetByName("MASTER_SUPERVISION");
      if (masterSheet) {
        masterSheet.appendRow([
          new Date(),
          volunteerName,
          payload.supervisorName || "",
          payload.timeInHrs || "",
          payload.date || "",
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

  // ========== FETCH SUPERVISION DATA ==========
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

    let targetVolunteer = requester.volunteerSheetName;

    if (requester.role === "admin" && e.parameter.volunteer) {
      targetVolunteer = e.parameter.volunteer;
    }

    if (requester.role === "volunteer" && e.parameter.volunteer) {
      const requested = normalizeVolunteerName(e.parameter.volunteer);
      const assigned = normalizeVolunteerName(requester.volunteerSheetName);
      if (requested.toLowerCase() !== assigned.toLowerCase()) {
        return errorResponse("Access denied. You can only view your own supervision data.");
      }
      targetVolunteer = e.parameter.volunteer;
    }

    return getSupervisionData(normalizeVolunteerName(targetVolunteer));
  }

  return errorResponse("Invalid action");
}

/************************************************
 * CORE FETCH LOGIC
 ************************************************/
function getVolunteerData(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return successResponse({ data: [] });
    }

    const values = sheet.getDataRange().getValues();
    const data = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row[1]) continue;

      data.push({
        date: formatDate(row[1]),
        time: row[2] || "",
        extraFrom: row[3] || "",
        extraTill: row[4] || "",
        reason: row[5] || "",
        duty: row[6] || "",
        hours: row[7] || "",
        dutyFrom: row[8] || "",
        remarks: row[9] || ""
      });
    }

    return successResponse({ data });

  } catch (err) {
    return errorResponse(err.toString());
  }
}

function getSupervisionData(volunteerName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = (volunteerName || "").trim() + "_Supervision";
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return successResponse({ data: [] });
    }

    const values = sheet.getDataRange().getValues();
    const data = [];

    // Columns: Timestamp | Supervisor Name | Time (in Hrs) | Supervision Date | Remark
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row[1] && !row[2]) continue;

      data.push({
        supervisorName: row[1] || "",
        timeInHrs: row[2] !== undefined && row[2] !== "" ? String(row[2]) : "",
        date: formatDate(row[3]) || (row[3] ? String(row[3]) : ""),
        remark: row[4] || ""
      });
    }

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
