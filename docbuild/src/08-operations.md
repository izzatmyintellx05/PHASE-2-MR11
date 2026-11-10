---
title: Operations and Support Guide
file: 08 MFE MR11 - Operations and Support Guide.docx
readers: Client IT, the client's system administrator, vendor support
---
## 1. Introduction

This guide is for the people who will keep the MR11 System running once it is live. Day to day, the system largely looks after itself: departments upload their files, the MR11 rebuilds automatically, and prices refresh every hour.

What IT needs to do is keep an eye on the health checks, make sure database backups exist, review user accounts from time to time, and, most importantly, work through the security checklist in section 5 before go-live. The rest of the guide covers support, known issues, common changes and troubleshooting.

## 2. Routine tasks

| How often | Task | Who does it |
| --- | --- | --- |
| Daily | Departments upload their latest workbooks | Department users |
| Daily | Check `/health` and `/api/health/db`, or let an uptime monitor do it | Client IT |
| Weekly | Look through the application logs for `[DATABASE]` warnings and upload errors | Client IT or vendor support |
| Monthly | Review user accounts, remove people who have left, and check their roles | The client's administrator |
| Monthly | Confirm that database backups exist and that one can be restored | Client IT |
| Quarterly | Update the dependencies, test on staging, then redeploy | The vendor |
| Before December 2027 | Add the 2028 month columns (see section 8) | The vendor |

## 3. Monitoring and logs

| What to watch | Where | What to look for |
| --- | --- | --- |
| Whether the system is up | `https://<host>/health` | `status: ok` |
| The database connection | `https://<host>/api/health/db` | `CONNECTED`. If it says `NOT_CONFIGURED`, `DATABASE_URL` is missing |
| Application logs | In Vercel, the project's Logs page; in Azure, the App Service log stream | `[DATABASE] read notice`, `Could not save upload`, `MR11 run ... not saved` and `Auto MR11 pipeline calculation error` |
| The database itself | Supabase's Reports and Database pages | Storage size and the number of connections |
| Market data | The cards on the MR11 page | "Unavailable right now" for more than a day |

## 4. Backup and restore

### 4.1 Backups

Supabase takes automatic backups on its paid plans, so please confirm which plan you are on and how long backups are kept. For an extra copy of your own, run `pg_dump "<direct connection string>" > mfe-backup.sql` once a week and keep the file somewhere off-site.

### 4.2 Restoring everything

Restore the database in Supabase, then redeploy or restart the application. Each server instance reloads users, workbooks and the latest MR11 from the database as it starts, so nothing else needs to be done.

### 4.3 Undoing a bad upload

The simplest fix is to ask the department to upload their last good workbook again. If they no longer have it, IT can point the department back at an earlier version and then press **Sync** on the MR11 page:

```
-- list a department's versions, newest first
SELECT f.id, f."originalFilename", f."uploadedAt"
  FROM "FileVersion" f JOIN "Department" d ON d.id = f."departmentId"
 WHERE d.code = 'PLANNING' ORDER BY f."uploadedAt" DESC;
-- make an earlier version the active one
UPDATE "Department" SET "activeVersionId" = '<version id>' WHERE code = 'PLANNING';
```

### 4.4 Housekeeping

The FileVersion and Mr11Run tables grow with every upload and every rebuild. We suggest agreeing a retention rule, for example keeping 90 days of Mr11Run rows and the last 20 versions for each department, and pruning on a schedule. Always keep each department's active version and the newest Mr11Run.

## 5. Security checklist before go-live

- [ ] Make the GitHub repository private. It is currently public and contains sample workbooks, the Supabase project reference and the Azure subscription id.
- [ ] Set a long, random `JWT_SECRET` in every environment. If it is missing, the code falls back to a default value that anyone can read in the repository.
- [ ] Replace the `JWT_SECRET` written into `azure-pipelines.yml` with a secret pipeline variable.
- [ ] Change the administrator password the first time you sign in. `supabase/schema.sql` creates it as the plain text `admin123`.
- [ ] Delete the eight demo accounts (ceo@, bd@, finance@ and the others at mfeformwork.com), or give each one a new password. They all start with `admin123`.
- [ ] Restrict or remove `/api/health/db` in production. It is public and lists the tables and their row counts.
- [ ] Limit CORS to the production domain. At the moment it accepts requests from anywhere.
- [ ] Strengthen password hashing. Seeded passwords and passwords that users change use PBKDF2-SHA512 with 1,000 iterations, where OWASP recommends 210,000. Accounts created in Admin Permissions use bcrypt with a cost of 10. Once that is done, remove the sign-in fallbacks that accept plain-text and unsalted SHA-256 stored values.
- [ ] Limit repeated failed sign-in attempts.
- [ ] Plan how to revoke sessions. Tokens last 7 days and stay in the browser, and role changes only take full effect when the user signs in again.

## 6. Support

| Level | Who | What they handle |
| --- | --- | --- |
| First line | The client's system administrator | Accounts, passwords, roles, "how do I" questions and re-uploads |
| Second line | Vendor support (MyIntellX) | Data that doesn't map, upload errors, wrong figures and deployment problems |
| Third line | Vendor development | Code fixes, new columns or rules, and new releases |

| Item | Detail |
| --- | --- |
| Support contact | To be agreed |
| Support hours | To be agreed |
| Response times by severity | To be agreed |
| Warranty period | To be agreed |

When you report a problem, please include the user's email address, the page, the time (Malaysia time), what you expected to happen, what actually happened, a screenshot and the workbook that was uploaded.

## 7. Known issues and limitations in version 1.0

| # | Issue | What it means for users | Workaround or plan |
| --- | --- | --- | --- |
| 1 | A workbook uploaded through the browser returns "file not found" when downloaded, because only the parsed data is stored | Users can't download their original file again | Keep originals in the department's shared drive. A later release could store files in Supabase Storage |
| 2 | Admin Permissions has no option for the CEO role | New executives can't be given CEO access from the screen | Add the role in the database (see section 8), and add it to the screen in the next release |
| 3 | The audit log is kept only in server memory | Upload history in the log is lost on restart | FileVersion still records every upload with its user and time. The audit log could be saved properly in the next release |
| 4 | Role changes and account deletions take full effect only when the user next signs in | A removed user's token still works with the API until it expires, after up to 7 days | In an emergency, change `JWT_SECRET` to sign everyone out |
| 5 | The month columns run from January 2026 to December 2027 | There are no 2028 columns yet | Add them before December 2027 (see section 8) |
| 6 | `/api/visualization` reports 0 for ordered m² and produced m² | No effect today, because the CEO Executive Hub doesn't use it | Fix the column names, or remove the endpoint |
| 7 | A Register page exists but isn't switched on | No effect | Remove it, or build sign-up with approval |
| 8 | FileVersion and Mr11Run are never pruned | The database keeps growing | Agree a retention rule (see section 4.4) |
| 9 | The frontend loads as a single 640 KB file | The first visit is a little slower on slow connections | Split the bundle in a later release |
| 10 | The repository's own early notes (PROJECT_FLOW.md and docs/DEPARTMENT_WORKFLOWS.md) describe some features that were never built, such as delivery-delay and LC warnings, and the README lists an out-of-date default password | Possible confusion | Treat this documentation set as the reference for version 1.0 |

## 8. Common maintenance changes

| Change | Where | How |
| --- | --- | --- |
| A department renames a column header | `server/config/mr11.config.ts`, in MR11_ORDERED_COLUMNS | Add the new name to that column's list of aliases |
| Adding the 2028 month columns | The same file, in ORDERED_HEADER_LIST | Add Jan-28 to Dec-28 and "Total 2028 m2" after the 2027 columns |
| Showing more currencies on the rate card | `server/modules/mr11/mr11.controller.ts`, in SHOWN_CURRENCIES | Add the ISO code |
| Changing the LME factor (USD 21.5 per m² for every USD 1,000 per tonne) | `server/modules/mr11/mr11.pricing.ts`, in LME_USD_PER_1000 | Change the number |
| Changing how closely colours must match | `server/modules/mr11/mr11.engine.ts`, in SAME_COLOUR_DISTANCE | The default is 100 |
| Giving a user the CEO role | The Supabase SQL editor | Run the statement below, then ask the user to sign in again |

```
INSERT INTO "UserRole" (id, "userId", "roleId")
VALUES ('ur-<userId>-role-ceo', '<userId>', 'role-ceo');
```

After any change to the code, run `npm run lint` and `npm run build`, test on staging with real workbooks, and then deploy.

## 9. Troubleshooting

| What you notice | The likely cause | What to do |
| --- | --- | --- |
| Everyone sees empty department pages after a deployment | `DATABASE_URL` is missing or wrong | Check `/api/health/db`, correct the variable and redeploy |
| An upload fails with "could not be saved to the database" | The database can't be reached or is full | Check Supabase's status and storage, then try again |
| A column is blank in the MR11 | A header was renamed in the workbook | Put the original header name back, or add an alias (see section 8) |
| A department's rows are attached to the wrong BD row | The short name, stream or colour is different from BD's | Bring the short name, stream and block colours in line with BD |
| Prices show old rates | The rate or LME source can't be reached | Wait for the hourly refresh, and set `USD_TO_MYR_RATE` as a fallback |
| Users are signed out unexpectedly | `JWT_SECRET` has changed, or differs between deployments | Use one stable secret for each environment |
| A user can't see a page after their role changed | They are still using their old token | Ask them to sign out and sign in again |
