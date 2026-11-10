---
title: Release Notes v1.0
file: 09 MFE MR11 - Release Notes v1.0.docx
readers: Client project owner, all users, client IT
---
## 1. Introduction

Version 1.0 of the MFE Formwork MR11 System, released on 15 October 2026 (commit `0cc8c36`), is the first version offered for client acceptance. It replaces the hand-built MR11 with a web application that brings seven department workbooks together into one master schedule, with live pricing, a CEO Executive Hub and an administration area.

These notes summarise what the release includes, what changed during client testing, the known issues and what you need to know to deploy it.

| Item | Detail |
| --- | --- |
| Product | MFE Formwork MR11 System |
| Version | 1.0 |
| Release commit | `0cc8c36` on `main` |
| Release date | 15 October 2026 |
| Status | Released for UAT and client acceptance |
| Build check | `npm install`, the type check and the production build all passed on 21 October 2026 |

## 2. Highlights

- **One upload per department.** Each department carries on working in Excel and simply uploads its file, and the colours and merged cells keep their meaning.
- **An MR11 that builds itself.** Every upload rebuilds the 78-column MR11 from BD, Finance, Shell Plan & Design, Planning, Production and Dispatch.
- **Live pricing.** Selling prices are recalculated with Bank Negara Malaysia exchange rates and LME aluminium prices every time the MR11 is opened.
- **The CEO Executive Hub.** Region and month filters, totals for each stage, a chart of actuals against the forecast, and a pipeline for each month.
- **Access by role.** There are nine roles, and each department sees only its own workbook.

Screenshots of the main screens are in Appendix A.

![Figure 1: The MR11 Master Schedule with the live exchange-rate and LME cards and the Options panel](shots/mr11-admin.png)

![Figure 2: The CEO Executive Hub with monthly actuals against the forecast and the production pipeline](shots/ceo.png)

![Figure 3: The Shell Plan & Design page with the approval history above the combined workbook](shots/dept-design.png)

## 3. What's included

| Area | Features |
| --- | --- |
| Signing in and accounts | Sign-in with email and password, clear messages for a wrong email or password, password changes with rules, a reminder to change the default password, and 7-day sessions |
| Department pages | A workbook viewer that keeps colours, merged cells and date headers; uploads of up to 25 MB; a combined Shell Plan & Design page with approval history; series history for Planning and Production; and separate Local and Overseas files for Dispatch, with a table of monthly dispatches |
| MR11 Master Schedule | Search, 13 filters, column groups, department highlighting, zoom and full screen, all remembered; coloured completion dates; merged Shell Plan and Design cells; monthly actuals and forecasts up to December 2027; Excel export; row delete and restore for administrators; and Sync |
| Pricing | Selling Price from USD, MYR and any other currency; LME Adjusted for Variable, Fixed and Freeze rows; Final Selling Price; and the sources of the rates shown on screen |
| CEO Executive Hub | Totals for Design, Processed, Produced, Dispatched and Sailed; a monthly chart with a Today line; a pipeline for each month; the average price per m²; and the raw data |
| Administration | Creating users, changing their roles and deleting them, with the main administrator account protected |
| Platform | Supabase PostgreSQL as the shared store, the same data on every server instance, health checks, and deployment to Vercel or Azure |

## 4. Changes made during client testing

| Date | Change |
| --- | --- |
| 15 October 2026 | Day headers that Excel stored as date numbers now show as dates on the department pages |
| 15 October 2026 | Administrators can now delete MR11 rows, after confirming, and restore them later |
| 9 October 2026 | Location and Building Name columns added from BD, and payment term amounts shown in dollars |
| 9 October 2026 | Exchange rates now come from Bank Negara Malaysia, with more currencies and the rate sources shown on the cards |
| 9 October 2026 | The new BD layout is supported: selling price in USD from every currency and LME by type, with any currency recognised by its code, name or symbol |
| 9 October 2026 | Numbers now use comma thousands separators, and numbers with decimals show three decimal places |
| 9 October 2026 | Sign-in now says "Wrong password"; password changes and role-based page access were added |
| 9 October 2026 | The CEO month pipeline was added (BD forecast, Design, Processed, Produced and Dispatched), with the Re-Design Only label |
| 8 October 2026 | Rules for monthly forecasts and actuals, a monthly dispatch table, and past months kept when the monthly files reset |
| 8 October 2026 | Dispatch now has separate Local and Overseas files; Sabah and Sarawak count as Overseas, and Local shows "Delivered:" |
| 8 October 2026 | Streams numbered 10 and above, design status and dates for each level coloured by status, and Shell Plan approval history |
| 7 October 2026 | Shell Plan and Design combined into one workbook, the stream read from the project number, and the MR11 Options panel with filters |
| 6 October 2026 | Column groups, the rates strip, full screen and remembered settings, and merged Shell Plan and Design cells |
| 6 October 2026 | New mappings for the BD, Finance, Design, Shell Plan, Planning, Production and Dispatch files |
| 6 October 2026 | The CEO Executive Hub gained a line chart, the Sailed stage, dispatches by region, and exchange-rate and LME figures |
| 30 September 2026 | The project repository was created |

## 5. Known issues

| # | Issue | Workaround |
| --- | --- | --- |
| 1 | A workbook uploaded through the browser can't be downloaded back, because only the parsed data is kept | Keep original files in the department's shared drive |
| 2 | Admin Permissions can't give anyone the CEO role | IT can add it in the database |
| 3 | The audit log is kept only in server memory | FileVersion still records every upload with its user and time |
| 4 | Role changes take full effect only when the user next signs in | Ask the user to sign out and sign in again |
| 5 | The month columns end at December 2027 | Extend them before December 2027 |
| 6 | `/api/visualization` returns 0 for ordered and produced m² | The CEO Executive Hub doesn't use it |
| 7 | The frontend loads as a single 640 KB file | Not a problem on office connections |

## 6. Deploying this release

- For a first installation, follow the Deployment Guide: create the Supabase schema, set up the Vercel project and add the environment variables.
- The required settings are `DATABASE_URL`, `JWT_SECRET` and `NODE_ENV=production`.
- A new installation needs no data migration, and an existing Supabase database created from either schema file works as it is.
- After deploying, change the administrator password and remove the demo accounts.

## 7. Compatibility

| Item | Supported |
| --- | --- |
| Browsers | Current versions of Chrome, Edge, Firefox and Safari on a desktop or laptop |
| Workbooks | .xlsx files of up to 25 MB, using the agreed header names and colour conventions |
| Server runtime | Node.js 22 |
| Database | PostgreSQL on Supabase, with either of the repository's schema layouts |
