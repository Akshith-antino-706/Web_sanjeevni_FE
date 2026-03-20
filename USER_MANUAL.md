# Sanjeevni - Volunteer Attendance & Supervision System
## User Manual

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Logging In](#2-logging-in)
3. [Navigation](#3-navigation)
4. [Financial Year Filter](#4-financial-year-filter)
5. [Attendance - Submitting](#5-attendance---submitting)
6. [Attendance - Viewing Data](#6-attendance---viewing-data)
7. [Attendance - Pivot Tables](#7-attendance---pivot-tables)
8. [Supervision - Submitting](#8-supervision---submitting)
9. [Supervision - Viewing Data](#9-supervision---viewing-data)
10. [Supervision - Pivot Tables](#10-supervision---pivot-tables)
11. [Admin Panel](#11-admin-panel)
12. [Signing Out](#12-signing-out)

---

## 1. Getting Started

Sanjeevni is a web-based attendance and supervision tracking system for the Sanjivini Society for Mental Health. It allows volunteers to log their daily attendance and supervision hours, and admins to manage users and view reports.

**Access the app** by opening the URL provided by your administrator in any modern web browser (Chrome, Safari, Edge, Firefox).

---

## 2. Logging In

### Email + PIN Login
1. Enter your **registered email address**
2. Enter your **PIN** (4-6 digits)
3. Click **Login** (or press Enter)

> **Note:** If you see "Access denied", contact your administrator to get your account set up.

Your session is saved automatically. On your next visit, you will be logged in without needing to enter credentials again.

---

## 3. Navigation

After logging in, the top header bar shows:

| Element | Description |
|---------|-------------|
| **Avatar & Name** | Your profile icon (first letter of name) and your name with role |
| **Attendance / Supervision** | Two tabs to switch between attendance and supervision |
| **FY Filter** | Financial year dropdown to filter data |
| **Admin Panel** | (Admin only) Button to manage users |
| **Sign Out** | Log out of the application |

Click **Attendance** or **Supervision** to switch between the two modules. The active tab is highlighted in rose color.

---

## 4. Financial Year Filter

The **FY** dropdown in the top header filters all displayed data by Indian Financial Year (April - March).

- **2025-26** means April 2025 to March 2026
- The filter is set to **2025-26** by default
- All financial years present in your data are listed (newest first)
- Changing the FY instantly updates the attendance/supervision tables and pivot summaries

---

## 5. Attendance - Submitting

The attendance form is on the **left side** of the screen when the Attendance tab is active.

### Fields

| Field | Description | Required |
|-------|-------------|----------|
| **Volunteer Name** | Select your name from the searchable dropdown. Start typing to filter. | Yes |
| **Date** | Auto-set to today. Click to change using the date picker. | Yes |
| **Time** | Select your shift: `10am-2pm`, `2pm-5:30pm`, `5:30pm-7:30pm`, or `extra time` | Yes |
| **Extra Time (From)** | Start time of extra duty. Only enabled when Time = "extra time". Type time like `10:00` or `2:30` — AM/PM is auto-detected. | When applicable |
| **Extra Time (Till)** | End time of extra duty. Same behavior as above. | When applicable |
| **Duty** | Select your duty type (see list below) | Yes |
| **Reason (for Others)** | If Duty = "Others", describe the reason here | When Duty = Others |
| **No. of Hours** | Auto-calculated from Extra Time From and Till. Cannot be edited manually. | Auto |
| **Duty From** | Select `Centre` or `Home` | Yes |
| **Remarks** | Any additional notes (optional) | No |

### Duty Options
- CI
- Supervisor meeting
- Supervision Given
- Supervision Taken
- EC meeting
- Trainings
- COP
- Tie Ups
- Sub-committee meeting
- Workshop
- Orientation
- Volunteer Meeting
- Others

### How Extra Time Works
1. Select **"extra time"** in the Time dropdown
2. The Extra Time (From) and Extra Time (Till) fields will become active
3. Enter your start and end times (e.g., `10:00` and `2:30`)
4. AM/PM is automatically detected based on Sanjeevni working hours (10 AM - 8:30 PM)
5. The **No. of Hours** field auto-calculates the duration

> If you select any other time slot (e.g., 10am-2pm), the extra time fields are grayed out and disabled.

### Auto-Prefill
When you select your name, the form auto-fills with your **last submitted entry** data:
- Time slot, Duty, Duty From, and Extra Time values are carried over
- **Date** is always set to today (not the last entry date)
- **Remarks** are always cleared for a fresh entry

### Submitting
1. Fill in all required fields
2. Click **Submit Attendance**
3. A success message with confetti will appear
4. The data table on the right refreshes automatically after a few seconds

---

## 6. Attendance - Viewing Data

The **right side** of the screen shows your attendance records in a table.

### Table Columns
| Column | Description |
|--------|-------------|
| S. No | Serial number |
| Date | Date of attendance |
| Time | Time slot selected |
| Extra Time (From) | Extra time start (if applicable) |
| Extra Time (Till) | Extra time end (if applicable) |
| Reason for extra time | Reason provided (if applicable) |
| Duty | Duty type |
| No. Of Hours | Calculated hours for extra time |
| Duty from Centre/Home | Where the duty was performed |
| Remarks | Any notes |

- The table header is sticky (stays visible while scrolling)
- A badge at the top shows the total number of records
- Data is filtered by the selected Financial Year

---

## 7. Attendance - Pivot Tables

Below the attendance data table, two summary pivot tables are shown:

### COUNTA of Duty
Shows a count of how many times each duty was performed, broken down by Centre and Home:

| Duty | Centre | Home | Grand Total |
|------|--------|------|-------------|
| CI | 5 | 2 | 7 |
| Supervisor meeting | 3 | 0 | 3 |
| EC meeting | 1 | 0 | 1 |
| **Grand Total** | **9** | **2** | **11** |

### Total Extra Hours
Shows the total extra hours worked by the volunteer.

**Calculation rules:**
1. Only rows where **Time = "extra time"** are counted
2. Rows with **Duty = EC meeting** or **Supervisor meeting** are excluded
3. Only rows where **No. of Hours** has a value are counted
4. Displayed in **H:MM:SS** format (e.g., `13:00:00` = 13 hours)

---

## 8. Supervision - Submitting

Click the **Supervision** tab to switch to the supervision form.

### Fields

| Field | Description | Required |
|-------|-------------|----------|
| **Volunteer Name** | Select the volunteer being supervised | Yes |
| **Date** | Select the date of supervision | Yes |
| **Supervisor** | Select the supervisor from the dropdown (searchable) | Yes |
| **Time** | Enter the duration. Use the dropdown next to it to select **Min** (minutes) or **Hrs** (hours). Accepts decimals (e.g., 1.5 hours, 30 minutes). | Yes |
| **Remark** | Optional notes about the supervision session | No |

### Available Supervisors
Feisal, Kavita, Kalpana, Mamta, Neelam, Niharika, Praveen, Ranjita, Vickie

### Submitting
1. Fill in all required fields
2. Click **Submit Supervision**
3. A success message appears
4. The supervision data table refreshes automatically

> **Note:** If Supervisor or Date is missing, a warning popup will appear asking you to fill in the required field.

---

## 9. Supervision - Viewing Data

When the Supervision tab is active, the right side shows supervision records.

### Table Columns
| Column | Description |
|--------|-------------|
| S. No | Serial number |
| Date | Date of supervision |
| Supervisor | Name of the supervisor |
| Time (in Hrs) | Duration in hours |
| Remark | Any notes |

---

## 10. Supervision - Pivot Tables

### COUNTA of Supervisions
Shows how many times each supervisor supervised this volunteer:

| Supervisor | Count |
|------------|-------|
| Kavita | 5 |
| Praveen | 3 |
| **Grand Total** | **8** |

### Total Supervision Hours
Shows the volunteer name and the **total supervision hours** summed across all sessions (displayed as a decimal, e.g., `12.50`).

---

## 11. Admin Panel

> **Admin only** — This section is only visible to users with the Admin role.

Click the **Admin Panel** button in the top header to open the User Management panel.

### Add New User

| Field | Description |
|-------|-------------|
| **Email** | The new user's email address |
| **Name** | The new user's display name |
| **Role** | Select `Volunteer` or `Admin` |
| **Add to Dropdown** | Checkbox (checked by default). When checked, the name is automatically added to the volunteer dropdowns in the forms. |

Click **Add User** to create the account.

> If the email already exists, you'll see a "User already exists" error. In that case, use the Dropdown column in the User List to add the name to the dropdown.

### User List

The user list shows all registered users with these columns:

| Column | Description |
|--------|-------------|
| **Email** | User's email address |
| **Name** | User's display name |
| **Role** | Admin (rose badge) or Volunteer (beige badge) |
| **Dropdown** | **Add** (green) or **Remove** (red) button to manage dropdown presence |
| **Actions** | **Delete** button to remove the user (cannot delete yourself) |

### Managing Dropdowns

- Click the green **Add** button to add a user's name to the volunteer dropdowns
- Click the red **Remove** button to remove a user's name from the dropdowns
- Changes take effect immediately in the forms
- Volunteer-role users are added to: Volunteer Name dropdown (attendance & supervision)
- Admin-role users are additionally added to: Supervisor dropdown

### Deleting a User

1. Click the **Delete** button next to the user
2. Confirm the deletion in the popup
3. The user is removed from the backend and from all dropdowns

---

## 12. Signing Out

Click the **Sign Out** button in the top-right corner.

This will:
- Clear your session data
- Return you to the login screen
- You will need to log in again on your next visit

---

## Role Permissions Summary

| Feature | Volunteer | Admin |
|---------|-----------|-------|
| Submit own attendance | Yes | Yes |
| Submit attendance for others | No | Yes |
| Submit own supervision | Yes | Yes |
| Submit supervision for others | No | Yes |
| View own data | Yes | Yes |
| View others' data | No | Yes |
| Access Admin Panel | No | Yes |
| Add/Remove users | No | Yes |
| Manage dropdowns | No | Yes |

---

## Tips & Troubleshooting

- **Can't see your name in the dropdown?** Ask your admin to add you via the Admin Panel.
- **"Failed to load users" in Admin Panel?** Refresh the page and try again. Ensure you're logged in as an admin.
- **Extra Time fields are grayed out?** Select "extra time" in the Time dropdown to enable them.
- **Data not showing after submission?** Wait a few seconds — the system refreshes automatically after 4 seconds to allow the backend to process.
- **"Authentication required" error?** Your session may have expired. Sign out and log in again.
- **Wrong AM/PM on times?** The system auto-detects AM/PM based on working hours (10 AM - 8:30 PM). You can manually type AM/PM to override.

---

*Sanjeevni - Society for Mental Health*
*Volunteer Attendance & Supervision System*
