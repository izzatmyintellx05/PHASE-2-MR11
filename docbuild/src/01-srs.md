---
title: Software Requirements Specification
file: 01 MFE MR11 - Software Requirements Specification.docx
readers: Client project owner, UAT team
---
## 1. Introduction

This document sets out what the MFE Formwork MR11 System does, so that the client and the project team share one clear picture of version 1.0. It lists 47 functional requirements across six areas of the system, followed by the quality requirements that apply to the whole system. We checked every requirement against the source code at commit `0cc8c36`, so the list describes the system as it was actually built.

The UAT team can use the requirement IDs (for example AUTH-01 or MR11-07) to trace each test case in the Test Plan back to the requirement it proves.

## 2. Purpose and scope

Until now, the MR11 Master Schedule was put together by hand from seven separate departmental workbooks. The new system lets each department keep working in Excel and simply upload its latest file. The system then combines everything into one project-by-project schedule, gives the CEO a management view, and gives administrators a place to manage users.

| In scope for version 1.0 | Not included in version 1.0 |
| --- | --- |
| Signing in, changing your password, and accounts managed by administrators | Self-registration and single sign-on |
| Uploading and viewing workbooks for BD, Finance, Shell Plan & Design, Planning, Production and Dispatch (Local and Overseas) | Editing department data directly in the browser |
| The MR11 Master Schedule, with filters, Excel export, and row delete and restore for administrators | Email or push notifications |
| Series history, approval history and monthly dispatch figures | A mobile app |
| The CEO Executive Hub | Integration with an ERP or accounting system |
| Admin Permissions | |

## 3. Stakeholders and user roles

| Role | How they use the system |
| --- | --- |
| CEO and executives | Read the CEO Executive Hub and the MR11 |
| Business Development (BD) | Upload the master project list, including contracts, areas, prices and delivery |
| Finance | Upload payment status and the amounts received |
| Shell Plan and Design | Upload consultant drawing status, approvals and design completion |
| Planning | Upload processing series and the cumulative processed quantity |
| Production | Upload fabrication output |
| Dispatch | Upload Local and Overseas shipment and delivery data |
| System administrator | Manage users and roles, and delete or restore MR11 rows |

## 4. Permissions

A user can hold more than one role, and the ADMIN role passes every permission check.

| What the user wants to do | ADMIN | CEO | Department roles |
| --- | --- | --- | --- |
| Sign in and change their own password | Yes | Yes | Yes |
| View the MR11, export it to Excel and sync it | Yes | Yes | Yes |
| Delete or restore MR11 rows | Yes | No | No |
| View, upload and download a department workbook | All departments | No | Their own department only (Shell Plan and Design share one workbook) |
| Open the CEO Executive Hub | Yes | Yes | No |
| Open Admin Permissions | Yes | No | No |

## 5. Functional requirements

### 5.1 Signing in and accounts (AUTH)

| ID | Requirement |
| --- | --- |
| AUTH-01 | Users sign in with their email address and password. The email is matched regardless of capital letters or spaces around it. |
| AUTH-02 | If the email is not recognised, the user sees "No account found for this email". If the password is wrong, they see "Wrong password". |
| AUTH-03 | A successful sign-in starts a session that lasts 7 days. |
| AUTH-04 | Users who are still on the default password are reminded to change it. |
| AUTH-05 | Users can change their password. The new one must be at least 8 characters long, different from the current one, and not the default password. |
| AUTH-06 | When a session expires or becomes invalid, the user is signed out and taken back to the sign-in page. |
| AUTH-07 | Each page opens only for users who are allowed to see it; anyone else is taken to the MR11 page. The server applies the same rules to the data itself. |

### 5.2 Department workbooks (DEPT)

| ID | Requirement |
| --- | --- |
| DEPT-01 | Each department page shows the department's current workbook as a spreadsheet, keeping its values, fill colours, font colours and merged cells. |
| DEPT-02 | An authorised user can upload an .xlsx file of up to 25 MB, which then becomes the department's active version. |
| DEPT-03 | Shell Plan and Design share one combined workbook, called Shell Plan & Design. |
| DEPT-04 | Dispatch keeps two files, Local and Overseas, and each upload replaces only its own file. If the user does not say which file it is, the system works it out from the file name and then from the columns (ETD and ATD columns mean Overseas). |
| DEPT-05 | Every upload is saved to the database before it becomes active. If the save fails, the user is told and the previous version stays active. |
| DEPT-06 | Every upload is recorded with the user, the department and the file name, and it triggers a rebuild of the MR11. |
| DEPT-07 | Day headers that Excel stored as date numbers are shown as dates. |
| DEPT-08 | The Planning and Production pages show series history, the Shell Plan & Design page shows the approval history, and the Dispatch page shows the m² dispatched each month. |

### 5.3 MR11 Master Schedule (MR11)

| ID | Requirement |
| --- | --- |
| MR11-01 | BD's workbook is the master list. Every MR11 row starts from a BD row that has a value in at least one cell. |
| MR11-02 | Rows from the other departments are matched to a BD row by project (short name first, then project number), by stream, and by the closest font and fill colour. |
| MR11-03 | A project number may carry the stream as its last digit, so 251242 means project 25124, stream 2. |
| MR11-04 | Finance supplies Advance Received / Payment Status, Actual Received and Payment Date. |
| MR11-05 | Shell Plan supplies its status and approved date. Design supplies the Formwork Design Status, the completion date for each level and the Total Quantity Ordered m². |
| MR11-06 | Design completion dates are coloured: dark green when the work is completed and the date has passed, yellow when it is completed but the date is still ahead, and red when it is not completed. |
| MR11-07 | Total Processed is the sum of Planning's Cumulative Processed (Project) for the row's colour blocks. Processed Date is the upload date on which that total last changed. |
| MR11-08 | Total Produced is the sum of Production's Cumulative Produced (Project). Produced Date is the latest daily column with output. |
| MR11-09 | Total Dispatch, Dispatch Date, Formwork Quantity Sailed (m²) and ETD/ATD come from the Dispatch files. Local projects show "Delivered:" dates instead of sailing dates. |
| MR11-10 | A project counts as Local when it is in Peninsular Malaysia. Sabah, Sarawak, Labuan and all other countries count as Overseas, unless one of the Dispatch files already lists the project. |
| MR11-11 | BD rows in blue font (Re-Design Only) go no further than Planning, so their Production and Dispatch columns show "-". |
| MR11-12 | The monthly columns, from Jan-26 to Dec-27, show the m² actually dispatched for months that have ended and the forecast for the current and later months, with a total for each year. |
| MR11-13 | Rows of the same project and stream that share a fill colour also share merged Shell Plan and Design cells. |
| MR11-14 | Rows are sorted by project, then stream, then unfilled rows before filled ones, then fill colour, then font colour with black first. |
| MR11-15 | Users can search, filter, show or hide column groups, zoom and switch to full screen, and the page remembers these choices in their browser. |
| MR11-16 | Department users see their own department's columns highlighted in the department's colour. |
| MR11-17 | The Excel export keeps the two-row header, the row colours, the number formats and the merged cells. |
| MR11-18 | Administrators can delete a row from the MR11 and restore it later. A deleted row stays out of every rebuild until it is restored. |
| MR11-19 | Any signed-in user can press Sync to rebuild the MR11 from every department's latest workbook. |

### 5.4 Pricing and market data (PRICE)

| ID | Requirement |
| --- | --- |
| PRICE-01 | Selling Price (USD) adds together BD's USD price, its MYR price and any price in another currency, converted at today's exchange rates. |
| PRICE-02 | For rows marked "Variable", LME Adjusted (USD) equals today's LME aluminium cash price minus the row's LME Rate, divided by 1,000 and multiplied by 21.5. Rows marked "Fixed" get 0, and rows marked "Freeze" show "Check". |
| PRICE-03 | Final Selling Price (USD) is the Selling Price plus Props, WPB, Waler, Acc, plus Aluminium Weight Adjusted, plus Freight Adjusted, plus LME Adjusted. |
| PRICE-04 | Prices are recalculated every time the MR11 is opened or exported, not only when a file is uploaded. |
| PRICE-05 | Exchange rates come from Bank Negara Malaysia, with open.er-api.com and the European Central Bank (through Frankfurter) as back-ups. LME prices come from Westmetall. Both are kept for one hour at a time, and the source is shown on screen. |
| PRICE-06 | Currencies written by name or symbol are recognised as well as ISO codes, for example SGD, "Singapore Dollar" or S$. |

### 5.5 CEO Executive Hub (CEO)

| ID | Requirement |
| --- | --- |
| CEO-01 | The hub shows totals for each stage and figures for each row of the latest MR11, filtered by region and month. |
| CEO-02 | A month pipeline shows the BD forecast, Design, Processed, Produced and Dispatched m² for a chosen month. Blue-font rows are labelled Re-Design Only. |
| CEO-03 | A pricing panel shows the average selling price per m², using today's LME price and exchange rate. |

### 5.6 Administration (ADMIN)

| ID | Requirement |
| --- | --- |
| ADMIN-01 | Administrators can see every user along with their roles. |
| ADMIN-02 | Administrators can create a user with an email address, name, password and starting role preset. |
| ADMIN-03 | Administrators can change a user's roles, either by choosing a preset or role by role. |
| ADMIN-04 | Administrators can delete a user. The main account, admin@mfeformwork.com, can never be deleted or lose its ADMIN role. |

## 6. Quality requirements

| Area | Requirement |
| --- | --- |
| Availability | The system runs as serverless functions on Vercel in Singapore, or as a container on Azure App Service. A health check is available at `/health` and a database check at `/api/health/db`. |
| Data durability | Supabase PostgreSQL is the single shared source of truth. Without a database, the system runs from memory and loses its data when it restarts, which is only suitable for demonstrations. |
| Consistency | Every server instance reloads users, workbooks and the latest MR11 from the database before it answers any request. |
| Security | Passwords are stored as hashes. Every API call except sign-in and the health checks needs a valid session token, and roles are checked on the server. |
| Performance | In the pre-UAT test, uploading a BD workbook and rebuilding the MR11 took 0.35 seconds (sample data on a local server). |
| Usability | Numbers use comma thousands separators and show three decimal places when they have decimals. Payment amounts are shown in dollars. |
| Time zone | "Today" and the month boundaries follow Malaysia time (Asia/Kuala_Lumpur). |
| Browser support | Current versions of Chrome, Edge, Firefox and Safari on a desktop or laptop. |
| File limits | Uploads can be up to 25 MB per workbook, and request bodies up to 100 MB. |

## 7. Assumptions and constraints

- Departments keep their workbook layouts and header names. If a header is renamed, its column may stop mapping into the MR11. The list of mappings lives in `server/config/mr11.config.ts`.
- Font and fill colours carry meaning, so departments need to use them consistently. Small differences in shade are tolerated.
- The monthly columns cover January 2026 to December 2027. Later years need a small configuration change.
- Market data depends on public services, mainly Bank Negara Malaysia and Westmetall, staying available.

## 8. Glossary

| Term | Meaning |
| --- | --- |
| MR11 | The master schedule that follows every project from contract to dispatch |
| Stream | A sub-package of a project, taken from the project number or the Stream column |
| Series | A batch of formwork processed by Planning or fabricated by Production |
| Font and fill colour | The text and background colours of a row; they mark blocks, plants and Re-Design Only rows |
| LME | The London Metal Exchange aluminium price |
| ETD and ATD | Estimated and actual time of departure of a shipment |
| RBAC | Role-based access control |
