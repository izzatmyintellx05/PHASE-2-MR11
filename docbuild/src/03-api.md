---
title: API Reference
file: 03 MFE MR11 - API Reference.docx
readers: Client IT, integrators
---
## 1. Introduction

This reference describes the system's API for anyone who needs to call it directly, for example to automate an upload or to read the MR11 into another tool. The API has 24 endpoints under `/api`, and they all exchange JSON over HTTPS.

Apart from sign-in and the two health checks, every endpoint needs a session token. You get the token by signing in, and you send it with each request in the header `Authorization: Bearer <token>`.

## 2. Conventions

- **Base address:** `https://<host>/api`
- **Request bodies:** JSON (`Content-Type: application/json`), except for uploads, which are sent as a multipart form.
- **Successful responses** look like `{ "success": true, "data": ... }`.
- **Errors** look like `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- **Department codes:** `BD`, `FINANCE`, `SHELLPLAN`, `DESIGN`, `PLANNING`, `PRODUCTION` and `DISPATCH`. `SHELLPLAN` and `DESIGN` both return the same combined workbook.
- **Size limits:** JSON bodies can be up to 100 MB and uploaded files up to 25 MB.

## 3. Signing in and roles

1. Call `POST /api/auth/login` with an email address and password.
2. Keep the `token` you get back. It is a JWT signed with the server's `JWT_SECRET`, and it is valid for 7 days.
3. Send it with every request as `Authorization: Bearer <token>`.
4. The token carries the roles the user had when they signed in, so after a role change the user needs to sign in again to get a new token.

| Role | What it can call |
| --- | --- |
| Any signed-in user | `/auth/me`, `/auth/change-password`, the `/departments` list, and every MR11 read, sync and export endpoint |
| A department role | That department's own `/departments/:code` endpoints (Shell Plan and Design share theirs) |
| CEO | `/visualization` |
| ADMIN | Everything, including `/admin/*` and deleting or restoring MR11 rows |

## 4. Error codes

| HTTP status | Code | When it happens |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | The email, password or password fields are missing |
| 400 | `FILE_REQUIRED` | An upload was sent without a file |
| 400 | `WEAK_PASSWORD`, `SAME_PASSWORD`, `DEFAULT_PASSWORD`, `WRONG_PASSWORD` | A password change broke one of the rules |
| 401 | `AUTH_REQUIRED` | No Bearer token was sent |
| 401 | `INVALID_TOKEN` | The token has expired, is invalid, or was signed with a different secret |
| 401 | `USER_NOT_FOUND`, `WRONG_PASSWORD` | Sign-in failed |
| 403 | `ACCESS_DENIED`, `UNAUTHORIZED_DEPARTMENT_UPLOAD` | The user's role is not allowed to do this |
| 404 | `DEPT_NOT_FOUND`, `FILE_NOT_FOUND` | The department is unknown, or no original file is stored |
| 500 | `UPLOAD_FAILED`, `SAVE_FAILED`, `AUTH_ERROR` | Something went wrong on the server or in the database; the message explains what |

## 5. Health checks

| Method | Path | Access | What it returns |
| --- | --- | --- | --- |
| GET | `/health` | Public | `{ status: "ok", service: "MFE Formwork MR11 System" }` |
| GET | `/api/health/db` | Public | A `status` of CONNECTED, NOT_CONFIGURED or ERROR, the connection string with the password hidden, the server time, the PostgreSQL version, the list of tables, and the active files and row counts |

## 6. Authentication endpoints (/api/auth)

| Method | Path | Access | Body | What it returns |
| --- | --- | --- | --- | --- |
| POST | `/login` | Public | `{ email, password }` | The `token` and `user { id, email, fullName, roles[], usingDefaultPassword }`, also repeated under `data`. Errors: 400 `VALIDATION_ERROR`, 401 `USER_NOT_FOUND`, 401 `WRONG_PASSWORD` |
| GET | `/me` | Signed in | None | `data.user { id, email, fullName, roles[] }`, or 404 if the account no longer exists |
| POST | `/change-password` | Signed in | `{ currentPassword, newPassword }` | `{ success: true, message: "Password changed." }`. Errors: 400 `WEAK_PASSWORD` (under 8 characters), `SAME_PASSWORD`, `DEFAULT_PASSWORD` or `WRONG_PASSWORD`, and 500 `SAVE_FAILED` |

## 7. Department endpoints (/api/departments)

| Method | Path | Access | Input | What it returns |
| --- | --- | --- | --- | --- |
| GET | `/` | Signed in | None | Every department, with `activeVersion { id, originalFilename, status, uploadedAt }` |
| GET | `/:code` (also `/:code/workbook` and `/:code/active`) | That department, or ADMIN | None | The department with its `activeVersion`, including the `parsedWorkbook` |
| POST | `/:code/upload` (also `POST /:code`) | That department, or ADMIN | A multipart form with the field `file` (.xlsx, up to 25 MB). For Dispatch only, add `part=local` or `part=overseas` as a query or form field; if you leave it out, the server works it out from the file name or columns | "<code> workbook uploaded and set as active. Master MR11 regenerated." Errors: 400 `FILE_REQUIRED`, 403, and 500 `UPLOAD_FAILED` |
| GET | `/:code/download` | That department, or ADMIN | None | The original file, or 404 `FILE_NOT_FOUND` for files uploaded through the browser (only the parsed data is kept) |

## 8. MR11 endpoints (/api/mr11)

| Method | Path | Access | Input | What it returns |
| --- | --- | --- | --- | --- |
| GET | `/` | Signed in | None | See section 8.1 |
| POST | `/regenerate` | Signed in | None | Rebuilds the MR11 from every department's latest workbook and returns `{ runId }` |
| GET | `/export` | Signed in | None | The file `MR11_Master_Order_<timestamp>.xlsx`, or 400 if there is no MR11 yet |
| GET | `/planning-series` | Signed in | None | `[{ projectNo, projectShortname, stream, fontColor, seriesNumber, totalProcessed, totalQuantity, closingDate }]` |
| GET | `/production-series` | Signed in | None | `[{ projectShortname, stream, fontColor, seriesNumber, totalProduced }]` |
| GET | `/shellplan-history` | Signed in | None | `[{ projectNo, shortName, projectName, stream, fillColor, status, revision, approvedDate, submittedDate, recordedOn }]`, newest first |
| GET | `/dispatch-monthly` | Signed in | None | `[{ shortName, projectNo, stream, productType, file, totalDispatch, months: { "2026-10": m² } }]` |
| GET | `/deleted-rows` | ADMIN | None | `[{ key, shortName, projectNo, projectName, stream, productType, deletedAt, deletedBy }]` |
| POST | `/rows/delete` | ADMIN | `{ key }`, the row's `_rowKey` | The updated list of deleted rows, after the MR11 is rebuilt. Returns 404 if the row is no longer in the MR11 |
| POST | `/rows/restore` | ADMIN | `{ key }` | The updated list of deleted rows, after the MR11 is rebuilt |

### 8.1 What GET /api/mr11 returns

| Field | What it contains |
| --- | --- |
| `run` | `{ id, status, generatedAt, recordCount, records[], sourceSnapshot }`, with the prices in `records` worked out for today |
| `fxRate` | `{ rate, source, asOf, live }`, the USD to MYR rate |
| `currencyRates` | `[{ code, rate, inBd, source }]`, the value of 1 USD in each currency shown |
| `lmePrice` | `{ cash, threeMonth, previousCash, asOf, source, live }`, in USD per tonne |
| `orderedHeaders` | The 78 MR11 column names, in the order they are shown |
| `headerGroups` | The groups shown under a two-row header (Payment terms) |
| `numberFormats` | The number of decimal places for each column |
| `columnDepartments` and `departmentColors` | Which department each column comes from, and that department's highlight colour |

## 9. Administration endpoints (/api/admin, ADMIN only)

| Method | Path | Body | What it returns |
| --- | --- | --- | --- |
| GET | `/users` | None | `[{ id, email, fullName, createdAt, roles[] }]` |
| POST | `/users` | `{ email, password, fullName, primaryProfile }`, where the profile is ADMIN, BD, FINANCE, SHELLPLAN, DESIGN, PLANNING, PRODUCTION or DISPATCH | 201 with the new user, or 400 if the email is already in use |
| PATCH | `/users/:userId/permissions` | `{ roles: ["BD", ...] }` or `{ primaryProfile }` | The user with their new roles. The main admin account always keeps ADMIN |
| DELETE | `/users/:userId` | None | Confirms the deletion, or 403 for the main admin account |

## 10. Visualization endpoint (/api/visualization)

| Method | Path | Access | What it returns |
| --- | --- | --- | --- |
| GET | `/` | ADMIN and CEO | `kpi { totalProjects, totalSellingUSD, totalOrderedM2, totalProduced }`, `designStatusCounts` and `streamDistribution`. Please note that `totalOrderedM2` and `totalProduced` always come back as 0 because of a known issue; the CEO Executive Hub uses `/api/mr11` instead |

## 11. Examples

```
# sign in and keep the token
TOKEN=$(curl -s https://<host>/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"<password>"}' | jq -r .token)

# read the MR11
curl -s https://<host>/api/mr11 -H "Authorization: Bearer $TOKEN"

# upload the BD workbook
curl -s -X POST https://<host>/api/departments/BD/upload -H "Authorization: Bearer $TOKEN" -F "file=@bd.xlsx"

# upload the Overseas Dispatch file
curl -s -X POST "https://<host>/api/departments/DISPATCH/upload?part=overseas" -H "Authorization: Bearer $TOKEN" -F "file=@dispatch-overseas.xlsx"

# export the MR11 to Excel
curl -s -o mr11.xlsx https://<host>/api/mr11/export -H "Authorization: Bearer $TOKEN"
```
