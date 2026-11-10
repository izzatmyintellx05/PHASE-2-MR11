---
title: Test Plan and UAT Test Cases
file: 07 MFE MR11 - Test Plan and UAT Test Cases.docx
readers: Client UAT team, project owners
---
## 1. Introduction

This plan explains how the client will check, with their own workbooks, that the MR11 System does what the Software Requirements Specification says. It covers how testing is organised, what the developers have already checked, the 36 test cases for user acceptance testing (UAT), and where to record any problems.

Before handing the system over for UAT, the developers ran their own checks on 21 October 2026. The type check and production build passed, and 23 of the 24 API checks passed. The one failure is a known issue: a workbook uploaded through the browser can't be downloaded back.

## 2. How testing is organised

| Item | Plan |
| --- | --- |
| Environment | A separate staging copy, meaning a Vercel preview deployment with its own Supabase project, so testing never touches live data |
| Test data | The latest real workbook from each department, plus a set that is a month old, to check that history carries forward correctly |
| Testers | One named person from each department, the CEO or someone standing in for them, and the client's administrator |
| Accounts | One account for each role, created by the administrator in Admin Permissions |
| Recording problems | Each failure is recorded in section 5 with the test ID, the steps taken, a screenshot, the workbook used and the time |
| Ready to start when | Staging is deployed, `/api/health/db` shows CONNECTED, and every tester has an account and their workbook |
| Finished when | Every test case has been run, no Critical or High defects remain open, and the client has signed the Project Sign-off and Closure Report |

### 2.1 How serious a defect is

| Severity | What it means | Example |
| --- | --- | --- |
| Critical | The system can't be used, and there is no way around it | Nobody can sign in, or uploads are lost |
| High | Business figures or access rights are wrong | Total Processed is wrong, or a user can see another department's workbook |
| Medium | A feature works, but only with a workaround | A filter leaves out one of its values |
| Low | Cosmetic | Alignment or wording |

## 3. What the developers have already checked

These checks were run on 21 October 2026 against commit `0cc8c36`, on a local server in demonstration mode, with the sample workbooks and no database.

| Check | Result |
| --- | --- |
| `npm install`, `npm run lint` (TypeScript) and `npm run build` | Passed. The frontend bundle is 640 KB (200 KB compressed) and the API bundle is 200 KB |
| `/health` | Passed, returning `status: ok` |
| Signing in with a valid account, a wrong password and an unknown email | Passed, returning a token, `WRONG_PASSWORD` and `USER_NOT_FOUND` |
| Calling the API with no token, and with an invalid token | Passed, returning 401 and 401 `INVALID_TOKEN` |
| Building the MR11 from the sample workbooks | Passed, with 10 rows, status READY and 78 columns |
| Live market data | Passed. USD to MYR was 4.0835 from Bank Negara Malaysia, and the LME aluminium cash price was USD 3,003.50 per tonne, both as of 20 October 2026 |
| A BD user opening their own department, then the Finance department | Passed, returning 200 and then 403 |
| A BD user calling Admin, the CEO summary and row delete | Passed, returning 403 each time |
| A Finance user uploading to BD, then a BD user uploading to BD | Passed, returning 403, then 200 in 0.35 seconds with the MR11 rebuilt |
| Uploading with no file | Passed, returning 400 `FILE_REQUIRED` |
| The CEO opening the CEO summary, then a department | Passed, returning 200 and then 403 |
| Password rules (under 8 characters, and the same as the current password) | Passed, returning 400 `WEAK_PASSWORD` and `SAME_PASSWORD` |
| Exporting the MR11 to Excel | Passed, producing a 12.5 KB .xlsx file |
| Planning series history | Passed, with 13 series |
| Downloading a workbook that was uploaded through the browser | **Known issue**, returning 404 `FILE_NOT_FOUND` |

These checks didn't cover the screens in a browser, or saving to Supabase, because no database was connected. UAT covers both.

## 4. UAT test cases

For each case, testers write Pass, Fail or Blocked in the Result column, and add the defect ID in Notes when a case fails. The Req column shows which requirement in the SRS each case proves.

| ID | Req | Steps | Expected result | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| UAT-01 | AUTH-01 | Sign in with your own account | The MR11 page opens, and the sidebar shows your pages | | |
| UAT-02 | AUTH-02 | Sign in with a wrong password, then with an unknown email | You see "Wrong password", then "No account found for this email" | | |
| UAT-03 | AUTH-04, 05 | Change the default password, sign out, then sign in with the old password and then the new one | The amber reminder disappears, the old password fails and the new one works | | |
| UAT-04 | AUTH-05 | Try a new password that is 7 characters long | It is refused with "at least 8 characters" | | |
| UAT-05 | AUTH-06 | Sign out, then press the browser's Back button | The sign-in page shows, and no data is visible | | |
| UAT-06 | AUTH-07 | As a BD user, type /departments/FINANCE into the address bar | You are taken back to the MR11 page | | |
| UAT-07 | DEPT-03 | Sign in as a Shell Plan user, then as a Design user | Both of them see the Shell Plan & Design page | | |
| UAT-08 | AUTH-07 | Sign in as the CEO | The CEO Executive Hub and the MR11 are visible, but no department pages or Admin Permissions | | |
| UAT-09 | DEPT-02, 06 | As BD, upload the latest workbook | Success, and the page shows the file name, the uploader and the time; the MR11 is updated | | |
| UAT-10 | DEPT-02 | As Finance, upload the latest workbook | As for UAT-09 | | |
| UAT-11 | DEPT-03, 08 | As Shell Plan & Design, upload the combined workbook | As for UAT-09, and the approval history lists the approvals | | |
| UAT-12 | DEPT-08 | As Planning, upload the workbook | As for UAT-09, and the Series Ledger lists the series | | |
| UAT-13 | DEPT-08 | As Production, upload the workbook | As for UAT-09, and the series history is updated | | |
| UAT-14 | DEPT-04 | As Dispatch, upload the Local file and then the Overseas file | Each upload replaces only its own file, and both stay listed | | |
| UAT-15 | DEPT-05 | Upload a .csv file or a damaged file | An error appears, and the previous workbook stays active | | |
| UAT-16 | DEPT-01, 07 | Open each department page | The colours, merged cells and date headers match the Excel file | | |
| UAT-17 | MR11-01 | Count the MR11 rows and the BD rows that contain data | The two counts match | | |
| UAT-18 | MR11-04 | For three sample projects, compare the Finance columns with the Finance file | The values match | | |
| UAT-19 | MR11-05, 06 | For three projects, check the Shell Plan status, the Design status and the colours of the completion dates | The values and colours follow the rules in the User Guide | | |
| UAT-20 | MR11-07 | For three projects, check Total Processed and Processed Date | Total Processed is the sum of Cumulative Processed for the row's blocks, and the date is when it last changed | | |
| UAT-21 | MR11-08 | For three projects, check Total Produced and Produced Date | Total Produced is the sum of Cumulative Produced, and the date is the latest day with output | | |
| UAT-22 | MR11-09, 10 | Check the Dispatch columns for one Local and one Overseas project | The totals match; the Overseas project shows ETD/ATD and the Local one shows "Delivered:" | | |
| UAT-23 | MR11-11 | Find a Re-Design Only row (in blue font) | Its Production and Dispatch columns show "-" | | |
| UAT-24 | MR11-12 | Check the month columns and the yearly totals for two projects | Months that have ended show the actual m² dispatched, and later months show the forecast | | |
| UAT-25 | PRICE-01 to 03 | Check one Variable, one Fixed and one Freeze LME row | LME Adjusted is (LME minus rate) divided by 1,000 and multiplied by 21.5, then 0, then "Check", and the Final Selling Price adds up | | |
| UAT-26 | MR11-15 | Use search, filters, column groups, zoom and full screen, then reload the page | Each one works, and your settings are remembered | | |
| UAT-27 | MR11-17 | Export the MR11 and open it in Excel | The two-row header, colours, merged cells and number formats match what's on screen | | |
| UAT-28 | MR11-18 | As an administrator, delete a row and then restore it | The row leaves the MR11, appears under Deleted rows, and comes back when restored | | |
| UAT-29 | MR11-19 | Click Sync | The MR11 is rebuilt and the figures don't change | | |
| UAT-30 | CEO-01 | Choose a region and a month, then compare the stage totals with the MR11 | The totals match | | |
| UAT-31 | CEO-02 | Open the pipeline for the current month | It shows the BD forecast, Design, Processed, Produced and Dispatched, with Re-Design Only shown separately | | |
| UAT-32 | ADMIN-02 | Create a user with a department preset, then sign in as that user | They see only that department and the MR11 | | |
| UAT-33 | ADMIN-03 | Change that user's roles, then have them sign out and sign in again | Their new access applies after the new sign-in | | |
| UAT-34 | ADMIN-04 | Delete that user, then try to delete the main administrator | The deleted user can no longer sign in, and the main administrator is protected | | |
| UAT-35 | Quality | Upload in one browser, then open the MR11 in another browser as a different user | The second user sees the new data after refreshing | | |
| UAT-36 | Quality | Ask IT to redeploy the system, then sign in again | Users, workbooks and the MR11 are all unchanged | | |

## 5. Defect log

| Defect ID | Test ID | Severity | Description | Raised by | Status | Fixed in |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | | | | | | |
| D-02 | | | | | | |
| D-03 | | | | | | |
| D-04 | | | | | | |
| D-05 | | | | | | |

## 6. UAT summary

| Measure | Count |
| --- | --- |
| Test cases | 36 |
| Passed | |
| Failed | |
| Blocked | |
| Critical or High defects still open | |

| UAT completed by | Position | Signature | Date |
| --- | --- | --- | --- |
| | | | |
