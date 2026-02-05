/**
 * =====================================================
 * RBAC (Role-Based Access Control) Functions for Sanjeevni
 * =====================================================
 *
 * Add these functions to your existing Google Apps Script project.
 *
 * SETUP INSTRUCTIONS:
 * 1. In your Google Sheets, create a new sheet named "Users" with columns:
 *    - Email (Column A)
 *    - Name (Column B)
 *    - Role (Column C) - values: "admin" or "volunteer"
 *    - Volunteer_Sheet_Name (Column D) - must match name in Volunteers list
 *    - Created_Date (Column E)
 *    - Last_Login (Column F)
 *
 * 2. Add yourself as the first admin user in the Users sheet
 *
 * 3. Copy all functions below into your Apps Script editor
 *
 * 4. Deploy as Web App with:
 *    - Execute as: Me
 *    - Who has access: Anyone
 */

// Get the Users sheet
function getUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Users');

  // Create Users sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    // Add headers
    sheet.getRange(1, 1, 1, 6).setValues([
      ['Email', 'Name', 'Role', 'Volunteer_Sheet_Name', 'Created_Date', 'Last_Login']
    ]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  return sheet;
}

// Get user by email
function getUserByEmail(email) {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase()) {
      return {
        email: data[i][0],
        name: data[i][1],
        role: data[i][2],
        volunteerSheetName: data[i][3],
        createdDate: data[i][4],
        lastLogin: data[i][5],
        rowIndex: i + 1
      };
    }
  }

  return null;
}

// Update last login timestamp
function updateLastLogin(email) {
  const user = getUserByEmail(email);
  if (user) {
    const sheet = getUsersSheet();
    sheet.getRange(user.rowIndex, 6).setValue(new Date());
  }
}

// Validate Google ID token
function validateGoogleToken(idToken) {
  try {
    const response = UrlFetchApp.fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      { muteHttpExceptions: true }
    );

    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    }
  } catch (e) {
    Logger.log('Token validation error: ' + e.message);
  }
  return null;
}

// Authenticate user with ID token
function authenticateUser(idToken) {
  const tokenInfo = validateGoogleToken(idToken);

  if (!tokenInfo || !tokenInfo.email) {
    return {
      status: 'error',
      message: 'Invalid token'
    };
  }

  const user = getUserByEmail(tokenInfo.email);

  if (!user) {
    return {
      status: 'error',
      message: 'Access denied. User not registered.'
    };
  }

  // Update last login
  updateLastLogin(tokenInfo.email);

  return {
    status: 'success',
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      volunteerSheetName: user.volunteerSheetName
    }
  };
}

// Authenticate user by email (fallback method)
function authenticateUserByEmail(email) {
  const user = getUserByEmail(email);

  if (!user) {
    return {
      status: 'error',
      message: 'Access denied. User not registered.'
    };
  }

  // Update last login
  updateLastLogin(email);

  return {
    status: 'success',
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      volunteerSheetName: user.volunteerSheetName
    }
  };
}

// Check if user is admin (for protected operations)
function isAdmin(email) {
  const user = getUserByEmail(email);
  return user && user.role === 'admin';
}

// Get all users (admin only)
function getAllUsers(requestingEmail) {
  if (!isAdmin(requestingEmail)) {
    return {
      status: 'error',
      message: 'Access denied. Admin only.'
    };
  }

  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < data.length; i++) {
    users.push({
      email: data[i][0],
      name: data[i][1],
      role: data[i][2],
      volunteerSheetName: data[i][3]
    });
  }

  return {
    status: 'success',
    users: users
  };
}

// Add new user (admin only)
function addNewUser(requestingEmail, newEmail, name, role, volunteerSheetName) {
  if (!isAdmin(requestingEmail)) {
    return {
      status: 'error',
      message: 'Access denied. Admin only.'
    };
  }

  // Check if user already exists
  if (getUserByEmail(newEmail)) {
    return {
      status: 'error',
      message: 'User already exists.'
    };
  }

  // Validate role
  if (role !== 'admin' && role !== 'volunteer') {
    return {
      status: 'error',
      message: 'Invalid role. Must be "admin" or "volunteer".'
    };
  }

  const sheet = getUsersSheet();
  sheet.appendRow([
    newEmail,
    name,
    role,
    volunteerSheetName || '',
    new Date(),
    ''
  ]);

  return {
    status: 'success',
    message: 'User added successfully.'
  };
}

// Delete user (admin only)
function deleteUserByEmail(requestingEmail, targetEmail) {
  if (!isAdmin(requestingEmail)) {
    return {
      status: 'error',
      message: 'Access denied. Admin only.'
    };
  }

  // Prevent self-deletion
  if (requestingEmail.toLowerCase() === targetEmail.toLowerCase()) {
    return {
      status: 'error',
      message: 'Cannot delete your own account.'
    };
  }

  const user = getUserByEmail(targetEmail);

  if (!user) {
    return {
      status: 'error',
      message: 'User not found.'
    };
  }

  const sheet = getUsersSheet();
  sheet.deleteRow(user.rowIndex);

  return {
    status: 'success',
    message: 'User deleted successfully.'
  };
}

// Update user role (admin only)
function updateUserRole(requestingEmail, targetEmail, newRole) {
  if (!isAdmin(requestingEmail)) {
    return {
      status: 'error',
      message: 'Access denied. Admin only.'
    };
  }

  if (newRole !== 'admin' && newRole !== 'volunteer') {
    return {
      status: 'error',
      message: 'Invalid role.'
    };
  }

  const user = getUserByEmail(targetEmail);

  if (!user) {
    return {
      status: 'error',
      message: 'User not found.'
    };
  }

  const sheet = getUsersSheet();
  sheet.getRange(user.rowIndex, 3).setValue(newRole);

  return {
    status: 'success',
    message: 'User role updated.'
  };
}

// =====================================================
// UPDATED doGet FUNCTION
// =====================================================
// Replace your existing doGet function with this one

function doGet(e) {
  const action = e.parameter.action;

  // Authentication actions
  if (action === 'authenticate') {
    const idToken = e.parameter.idToken;
    const result = authenticateUser(idToken);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'authenticateByEmail') {
    const email = e.parameter.email;
    const result = authenticateUserByEmail(email);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Admin actions - require token for email extraction
  if (action === 'getUsers') {
    const token = e.parameter.token;
    const tokenInfo = validateGoogleToken(token);
    const email = tokenInfo ? tokenInfo.email : e.parameter.email;

    if (!email) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Authentication required'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const result = getAllUsers(email);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'addUser') {
    const token = e.parameter.token;
    const tokenInfo = validateGoogleToken(token);
    const requestingEmail = tokenInfo ? tokenInfo.email : null;

    if (!requestingEmail) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Authentication required'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const newEmail = e.parameter.email;
    const name = e.parameter.name;
    const role = e.parameter.role || 'volunteer';
    const volunteerName = e.parameter.volunteerName || '';

    const result = addNewUser(requestingEmail, newEmail, name, role, volunteerName);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'deleteUser') {
    const token = e.parameter.token;
    const tokenInfo = validateGoogleToken(token);
    const requestingEmail = tokenInfo ? tokenInfo.email : null;

    if (!requestingEmail) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Authentication required'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const targetEmail = e.parameter.email;
    const result = deleteUserByEmail(requestingEmail, targetEmail);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Attendance getData - calls getVolunteerData from google-apps-script-code.js
  if (action === 'getData') {
    const volunteer = e.parameter.volunteer;
    const email = e.parameter.email;
    if (volunteer && typeof getVolunteerData === 'function') {
      return getVolunteerData(volunteer, email);
    }
  }

  // Supervision getSupervisionData - calls getSupervisionData from google-apps-script-code.js
  if (action === 'getSupervisionData') {
    const volunteer = e.parameter.volunteer;
    const email = e.parameter.email;
    if (volunteer && typeof getSupervisionData === 'function') {
      return getSupervisionData(volunteer, email);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: 'Invalid action'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * =====================================================
 * QUICK START GUIDE
 * =====================================================
 *
 * 1. Copy all functions above into your Google Apps Script
 *
 * 2. Create a "Users" sheet in your Google Sheets with these columns:
 *    Email | Name | Role | Volunteer_Sheet_Name | Created_Date | Last_Login
 *
 * 3. Add your first admin user manually:
 *    your.email@gmail.com | Your Name | admin | | [today's date] |
 *
 * 4. In the HTML file, replace GOOGLE_CLIENT_ID with your actual OAuth Client ID:
 *    - Go to Google Cloud Console > APIs & Services > Credentials
 *    - Create OAuth 2.0 Client ID (Web Application)
 *    - Add your Apps Script web app URL to Authorized JavaScript Origins
 *    - Copy the Client ID
 *
 * 5. Deploy your Apps Script as a Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 *
 * 6. Update the SCRIPT_URL in the HTML file if needed
 *
 * 7. Test by opening the HTML file and signing in with Google
 */
