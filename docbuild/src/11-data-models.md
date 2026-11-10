---
title: Data Models
file: 11 MFE MR11 - Data Models.docx
readers: Client IT, developers, data analysts
---
## 1. Introduction

This document describes how the MR11 System structures its data. Data passes through six layers on its way from a department's Excel file to what the user's browser remembers, and each layer has its own shape. The sections below take them in that order and explain every field.

The full column-by-column data dictionary for the database, with data types, is in Appendix A of the System Architecture Document. This document focuses on how the pieces relate to one another and what the fields mean.

![Figure 1: How data moves through the layers of the system](diagrams/data-flow.png)

| Layer | What it is | Where it lives | Section |
| --- | --- | --- | --- |
| Workbook model | Each uploaded sheet as cells, with their values, colours and merges | FileVersion.parsedWorkbook (JSONB) | 3 |
| Database tables | Users, roles, departments, workbook versions and MR11 runs | Supabase PostgreSQL | 4 |
| Extracted rows | A sheet's rows as header and value pairs, with each row's font and fill colour | Server memory, while an MR11 is being built | 5 |
| MR11 run and rows | The finished schedule and the history it carries forward | Mr11Run (JSONB) | 6 |
| API models | The JSON that the API sends and receives | HTTP requests and responses | 7 |
| Browser state | Who is signed in, page settings and filters | React state, Zustand and localStorage | 8 |

## 2. Conventions used in this document

- Field names are written exactly as they appear in the code (camelCase), and MR11 column names as they appear on screen.
- Dates inside JSON are text in the form YYYY-MM-DD. Database timestamps are TIMESTAMP(3), which is accurate to the millisecond.
- Colours are hex text such as #FF9900, and an empty fill means the cell has no fill.
- Where we say "map", we mean a JSON object used as a lookup, such as one that gives the m² for each month.

## 3. The workbook model

When a workbook is uploaded, `server/utils/excel-normalizer.ts` turns each of its sheets into the structure below, and the department page draws the sheet back from it. Dispatch keeps its Local and Overseas files together in a single object.

![Figure 2: The workbook model stored in FileVersion.parsedWorkbook](diagrams/model-workbook.png)

### 3.1 FortuneSheet, one worksheet

| Field | Type | What it means |
| --- | --- | --- |
| name | Text | The sheet's name. For Dispatch, "Local - " or "Overseas - " is added in front |
| index and order | Number | The position of the sheet, counting from 0 |
| status | Number | 1 for the first sheet and 0 for the others |
| celldata | A list of FortuneCell | Every cell that is not empty |
| config.merge | A map from "row_col" to { r, c, rs, cs } | Merged ranges, given by the top-left cell, the number of rows and the number of columns |
| config.columnlen | A map from column to number | Column widths in pixels (Excel's width multiplied by 8) |
| config.rowlen | A map from row to number | Row heights in pixels (Excel's height multiplied by 1.33) |

### 3.2 FortuneCell and CellValue, one cell

| Field | Type | What it means |
| --- | --- | --- |
| r and c | Number | The row and column, counting from 0 |
| v.v | Text, number, true or false, or a date | The value itself. For a formula, this is its calculated result. Every cell inside a merge repeats the top-left value |
| v.m | Text | The value as display text |
| v.f | Text | The formula, if there is one, such as =SUM(B2:B9) |
| v.bg | Text | The fill colour in hex, with theme colours worked out including their tint |
| v.fc | Text | The font colour in hex |
| v.bl and v.it | 0 or 1 | Bold and italic |
| v.ht | 0, 1 or 2 | Horizontal alignment: centre, left or right |
| v.vt | 0, 1 or 2 | Vertical alignment: middle, top or bottom |
| v.tb | 0 or 2 | 2 when the text wraps |
| v.rowspan and v.colspan | Number | The size of the merge, recorded only on its top-left cell |

### 3.3 The Dispatch workbook

| Field | Type | What it means |
| --- | --- | --- |
| sheets | A list of FortuneSheet | The sheets of both files together, for anything that just needs a simple list |
| dispatchFiles.LOCAL and dispatchFiles.OVERSEAS | { originalFilename, uploadedAt, sheets } | Each file on its own, so that an upload replaces only its own part |

## 4. Database tables

Supabase holds eleven tables. Version 1.0 uses six of them. The other five are defined but not written to, because the data they were meant for is kept inside each Mr11Run instead. In the diagrams, "DOUBLE" stands for DOUBLE PRECISION and "TEXT_ARRAY" for TEXT[].

![Figure 3: Accounts, made up of users, roles and the audit log](diagrams/er-accounts.png)

![Figure 4: Workbooks and MR11 runs](diagrams/er-workbooks.png)

![Figure 5: History tables that are defined but not written to in version 1.0 (part 1)](diagrams/er-history-a.png)

![Figure 6: History tables that are defined but not written to in version 1.0 (part 2)](diagrams/er-history-b.png)

| Table | What it holds | It grows with | Used in version 1.0 |
| --- | --- | --- | --- |
| User | The people who can sign in | New accounts | Yes |
| Role | The nine roles, with fixed ids | Never | Yes |
| UserRole | Which user has which role | Role changes | Yes |
| Department | The seven departments and their active workbook | Never | Yes |
| FileVersion | Every workbook ever uploaded | Every upload | Yes |
| Mr11Run | Every build of the MR11 | Every upload, sync, row delete or restore | Yes |
| AuditLog | Records of uploads | Nothing | No; the log is kept in memory |
| Mr11Config | The visible-column setting | Nothing | No; it is only seeded |
| PlanningSeriesHistory, PlanningProjectQuantityTracker and ProductionSeriesHistory | Series history | Nothing | No; this is kept in Mr11Run.sourceSnapshot |

The enumerated types are RoleCode (ADMIN, CEO, BD, FINANCE, SHELLPLAN, DESIGN, PLANNING, PRODUCTION and DISPATCH), Mr11Status (EMPTY, PARTIAL, READY and FAILED) and FileVersionStatus (UPLOADING, PROCESSING, READY and FAILED).

## 5. Extracted rows, used while the MR11 is built

The engine's `sheetToRecordsWithStyles()` function reads the first sheet of a workbook into rows. It takes the headers from the top rows, brings up sub-headers that sit under a repeated group header such as "Payment terms", and renames duplicate headers to "Type", "Type 2", "Type 3" and so on.

| Field | Type | What it means |
| --- | --- | --- |
| data | A map from header to value | The row's values, looked up by header name |
| fontColor | Text | The row's font colour, used to match blocks across departments |
| fillColor | Text | The row's fill colour |
| rawCells | A map from column to value | The values by column position, used to drop BD rows that are empty |
| mergedCopyHeaders | A list of text | The headers whose value was copied from a merged cell, so that totals count it only once |
| dispatchPart | LOCAL or OVERSEAS | For Dispatch only, which file the row came from |

## 6. The MR11 run and its rows

Each build of the MR11 is saved as one Mr11Run. Its rows are the schedule that users see, and its snapshot carries forward everything the next build needs to know.

![Figure 7: Mr11Run, its rows and each row's internal fields](diagrams/model-mr11-row.png)

### 6.1 An MR11 row

Each row is a JSON object holding the 78 columns shown on screen (listed with their types in Appendix A.5 of the System Architecture Document), plus some internal fields whose names start with an underscore.

| Internal field | Type | What it means |
| --- | --- | --- |
| _rowKey | Text | Identifies the row from one build to the next, using its short name, stream, font, fill and product type. It is used to delete and restore rows |
| _fontColor and _fillColor | Text | The BD row's colours, used on screen and in the export |
| _streamSpan | Number | On the first row of a block, how many rows share its Shell Plan and Design cells; 0 on the rows that follow |
| _designDateParts | A list of DesignDatePart | The completion dates for each level, as { level, date, completed } |
| _pricing | BdPriceInputs | BD's price inputs: usd, myr, otherCurrency, otherPrice, lmeType, lmeRate, lmeAdjustedInFile, props, aluminium and freight |
| _priceNote | Text | Explains a price that couldn't be converted, for example because the currency wasn't recognised |
| _dispatchedByMonth | A map from month (such as "2026-10") to m² | The m² dispatched in each month |
| _dispatchFile | LOCAL or OVERSEAS | Which Dispatch file the row uses |
| _monthStages | A map from month (such as "Oct-26") to MonthStage | The CEO pipeline for each month: bd, design, processed, produced and dispatched, all in m² |
| _designOnly | True or false | True for Re-Design Only rows, which are in blue font |
| _designDate, _dispatchedDate and _atdDate | Text holding a date | Single dates that the CEO Executive Hub uses to group figures by month |

### 6.2 The source snapshot

![Figure 8: The source snapshot carried from one build to the next](diagrams/model-snapshot.png)

| Field | Type | What it means |
| --- | --- | --- |
| BD, FINANCE, DESIGN and the other department codes | Text | The FileVersion id of the workbook each department contributed. If a newer upload exists, the run is out of date |
| dispatchTracker | A map from row key to { quantity, date } | The last Total Dispatch, and the date it changed |
| dispatchByMonth | A map from row key to a map from month to m² | The Overseas Total Dispatch at the last upload of each month |
| localDispatchByMonth | A map from row key to a map from month to m² | The Local m² dispatched in each month, kept after the monthly file resets |
| productionByMonth | A map from row key to a map from month to m² | The m² produced in each month, kept after the monthly file resets |
| monthStageHistory | A map from row key to a map from month to { design, processed } | The Design and Processed forecast for each month, as it last stood |
| deletedRows | A list of DeletedMr11Row | The rows an administrator removed, with their key, names, stream, product type, deletedAt and deletedBy |
| shellplanApprovalHistory | A map from stream key to ApprovalHistoryGroup | Every Approved and Reapprove seen so far, with its revision and dates |
| engineHistory | EngineHistory | The Planning series, the Planning quantity trackers and the Production series |

## 7. API models

Every response uses the same envelope: `{ success, data }` when it works, and `{ success: false, error: { code, message } }` when it doesn't.

| Model | Fields | Returned by |
| --- | --- | --- |
| LoginResponse | token, and user { id, email, fullName, roles[], usingDefaultPassword } | POST /api/auth/login |
| CurrentUser | user { id, email, fullName, roles[] } | GET /api/auth/me |
| Department | id, code, name, description, activeVersionId, and activeVersion { id, originalFilename, status, uploadedAt, parsedWorkbook, uploadedBy } | GET /api/departments and /api/departments/:code |
| Mr11Response | run, fxRate, currencyRates[], lmePrice, visibleColumns, orderedHeaders, headerGroups, numberFormats, columnDepartments and departmentColors | GET /api/mr11 |
| FxRate | rate, source, asOf and live | Part of Mr11Response |
| CurrencyRate | code, rate, inBd and source | Part of Mr11Response |
| LmePrice | cash, threeMonth, previousCash, asOf, source and live, in USD per tonne | Part of Mr11Response |
| HeaderGroup | label, and columns [{ key, label }] | Part of Mr11Response |
| PlanningSeries | projectNo, projectShortname, projectName, stream, fontColor, seriesNumber, totalProcessed, totalQuantity and closingDate | GET /api/mr11/planning-series |
| ProductionSeries | projectShortname, projectNo, projectName, stream, fontColor, seriesNumber and totalProduced | GET /api/mr11/production-series |
| ApprovalHistoryRow | projectNo, shortName, projectName, stream, fillColor, status, revision, approvedDate, submittedDate and recordedOn | GET /api/mr11/shellplan-history |
| DispatchMonthlyRow | shortName, projectNo, stream, productType, file, fontColor, fillColor, totalDispatch and months | GET /api/mr11/dispatch-monthly |
| DeletedRow | key, shortName, projectNo, projectName, stream, productType, deletedAt and deletedBy | GET /api/mr11/deleted-rows |
| AdminUser | id, email, fullName, createdAt and roles[] | GET /api/admin/users |

## 8. Browser state

### 8.1 Who is signed in (the Zustand store in src/store/auth.store.ts)

| Field | Type | What it means |
| --- | --- | --- |
| token | Text, or nothing | The session token (a JWT) |
| user | An object, or nothing | { id, email, fullName, roles[] } |
| usingDefaultPassword | True or false | True until the user changes the default password |

### 8.2 What the browser remembers in localStorage

| Key | Type | Set by | What it remembers |
| --- | --- | --- | --- |
| mfe_token | Text | The sign-in store | The session token, sent with every API call |
| mfe_user | JSON | The sign-in store | The signed-in user |
| mfe_default_password | "1" | The sign-in store | That the default password is still in use |
| sidebar.open | True or false | The sidebar | Whether the sidebar is expanded or collapsed |
| mr11.zoom | Number | The MR11 page | The table's zoom level, from 20% to 135% |
| mr11.sidePanelOpen | True or false | The MR11 page | Whether the Options panel is showing |
| mr11.hiddenColumnGroups | A list of text | The MR11 page | Which column groups are hidden |
| mr11.showRatesStrip | True or false | The MR11 page | Whether the market cards are showing |
| zoom.PLANNING, zoom.PRODUCTION and the other department codes | Number | The department pages | The sheet's zoom level on each department page |
| design.showApprovalHistory | True or false | The Shell Plan & Design page | Whether the approval history is showing |
| dispatch.part | LOCAL or OVERSEAS | The Dispatch page | Which Dispatch file is shown |
| dispatch.showMonthly | True or false | The Dispatch page | Whether the monthly dispatch table is showing |

The MR11 filters and the search box are only kept while the page is open.

## 9. The in-memory store on the server

Each server instance keeps a working copy of the data in `server/db/prisma.ts`. It uses the same model names as the database, so the code reads as if it were using Prisma.

| Collection | Key | Where its data comes from |
| --- | --- | --- |
| users and userRoles | id | The Supabase User and UserRole tables (the seed accounts are used until these are loaded) |
| roles | id, such as role-admin | Built into the code |
| departments | id, such as dept-bd | Built into the code, with activeVersionId set from Supabase |
| fileVersions | id | The active versions in the Supabase FileVersion table |
| mr11Runs | A list | Builds made on this instance, or the latest one from Supabase |
| planningSeriesHistory | projectNo_stream_fontColor_seriesNumber | Mr11Run.sourceSnapshot.engineHistory |
| planningProjectQuantityTrackers | projectNo_stream_fontColor | Mr11Run.sourceSnapshot.engineHistory |
| productionSeriesHistory | projectShortname_stream_fontColor_seriesNumber | Mr11Run.sourceSnapshot.engineHistory |
| auditLogs and mr11Config | Not applicable | Memory only |

## 10. Configuration models (server/config/mr11.config.ts)

| Model | Fields | What it means |
| --- | --- | --- |
| ColumnMapping | target, sourceDept, sourceColumn, type (string, number or date), exact and aliases | Which department column fills an MR11 column. "exact" means the whole header must match, and the aliases are older header names that are also accepted |
| ORDERED_HEADER_LIST | A list of text | The 78 MR11 columns, in the order they are shown |
| MR11_HEADER_GROUPS | A list of HeaderGroup | The columns that sit under a shared top header (Payment terms) |
| MR11_NUMBER_FORMATS | A map from column to number of decimal places | Fixed decimal places, such as 3 for LME Rate and 2 for payment amounts |
| MR11_USD_AMOUNT_COLUMNS | A list of text | The columns shown with a dollar sign |
| MR11_COLUMN_DEPARTMENTS | A map from column to department | Which department each column comes from, used for highlighting |
| MR11_DEPARTMENT_COLORS | A map from department to hex colour | Each department's highlight colour |
| MR11_SOURCE_KEY_MAP | A map from department to header names | The headers that identify the project in each department's file |
