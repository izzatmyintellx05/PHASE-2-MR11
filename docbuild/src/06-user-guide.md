---
title: User Guide
file: 06 MFE MR11 - User Guide.docx
readers: All users, including department staff, the CEO and administrators
---
## 1. Introduction

This guide shows you how to use the MFE MR11 System, screen by screen. For most people the routine is simple: sign in, upload your department's latest workbook, and then check your columns on the MR11 Master Schedule.

You don't need to read the whole guide. Section 2 tells you which parts matter for your role. Screenshots of every screen are collected in Appendix A, and the text tells you which figure to look at.

## 2. Where to start

| If you are | You will mostly | Read sections |
| --- | --- | --- |
| A department user (BD, Finance, Shell Plan, Design, Planning, Production or Dispatch) | Upload your workbook and check your columns in the MR11 | 3, 4, 5 and 6 |
| The CEO or an executive | Read the CEO Executive Hub and the MR11 | 3, 6 and 7 |
| A system administrator | Create users, set their roles, and delete or restore MR11 rows | 3, 6 and 8 |

## 3. Signing in, passwords and the sidebar

### 3.1 Signing in

![Figure 1: The sign-in page](shots/login.png)

1. Open the system's web address in Chrome, Edge, Firefox or Safari on a desktop or laptop.
2. Under **Sign in to workspace**, type your corporate email address and password, then click **Sign In**.
3. If the system doesn't recognise your email, you'll see "No account found for this email". If the password is wrong, you'll see "Wrong password". If you're locked out, ask your administrator for help.
4. When you've finished, click the **Sign out** icon at the bottom of the sidebar. If you forget, your session ends by itself after 7 days.

### 3.2 Changing your password

New accounts start with a default password. Until you change it, the sidebar reminds you with the message "You are using the default password", and the key icon turns amber.

1. Click the **Change password** icon (the key) at the bottom of the sidebar.
2. Type your current password, then your new password twice. Your new password needs at least 8 characters, and it can't be the same as your current password or the default one.
3. Click **Change password**. You'll see "Password changed. Use your new password the next time you sign in."

![Figure 2: The Change password box, opened from the key icon in the sidebar](shots/change-password.png)

### 3.3 The sidebar

The sidebar only shows the pages your role allows you to open.

| Item | Who can see it |
| --- | --- |
| MR11 Master Schedule | Everyone |
| CEO Executive Hub | The CEO and administrators |
| Admin Permissions | Administrators |
| Business Development, Finance, Shell Plan & Design, Planning, Production and Dispatch | Users of that department, and administrators |

![Figure 3: What a BD user sees, with only the MR11 and their own department, and the BD columns outlined](shots/mr11-bd.png)

If the sidebar says "No department tabs assigned", ask an administrator to give you your department's role. After your role changes, sign out and sign in again so the change takes effect.

## 4. Uploading your department's workbook

Each department page shows your current workbook as a spreadsheet, with its original colours and merged cells, along with the file name and who uploaded it. You can use **Zoom**, **Full screen** and the sheet tabs at the bottom to move around it.

![Figure 4: The Business Development page showing the current BD workbook](shots/dept-bd.png)

### 4.1 Before you upload: prepare your Excel file

Work through these steps each time, before you upload. Most upload problems come from one of them.

1. **Start from your department's agreed template.** Keep every column header exactly as it is, in the first row of the sheet. The system finds each column by its header name, so a renamed header leaves that column empty in the MR11. If a header really has to change, tell your administrator before you upload.
2. **Keep your data on the first sheet.** The system builds the MR11 from the first sheet only. Any other sheets still show on your department page, but they aren't used.
3. **Give every row its project and stream.** Use the same project short name (or project number) and stream as the matching row in BD's workbook. Capital letters, spaces and punctuation are ignored, so "AP 24" and "ap-24" match, but a different spelling does not. A row with no stream counts as Stream 1.
4. **Colour your rows the way BD does.** When a project has more than one block in a stream, the system tells the blocks apart by their font and fill colours. Use the same colours as the matching BD rows. Slightly different shades are fine, but white, black and No Fill all count as no fill colour.
5. **Enter dates as dates and quantities as numbers.** Type only the number in a quantity cell. Words such as TBC count as 0, and a unit typed into the cell is misread ("500 m2" is read as 5002). Fix any cell that shows an error such as #N/A or #REF!, because the system reads the error text instead of a value.
6. **Save the file in Excel as an .xlsx workbook of no more than 25 MB.** If the file came from another program or system, open it in Excel and save it once, so the results of its formulas are stored. A formula cell with no stored result arrives empty.
7. **Keep a copy in your department's shared drive.** In this release you can't download the original file back from the system.

### 4.2 Uploading the file

1. Open your department's page from the sidebar.
2. **Dispatch only:** choose **Local** or **Overseas** first, to match the file you are uploading. Each upload replaces only that one file, and the other stays as it was.
3. Click the upload button. It reads **Upload & Deploy** on most pages, **Upload & Sync** on Planning and Production, and **Upload Local** or **Upload Overseas** on Dispatch.
4. Choose your file. The button shows "Deploying..." while the system reads the file, saves it and rebuilds the MR11. Keep the page open until it finishes.
5. When it has finished, your new file shows on the page with its name and who uploaded it. The MR11 has already been rebuilt with your data, so there is no need to press **Sync**.

### 4.3 Checking your rows in the MR11

Take a minute after every upload to check that your figures landed on the right rows.

1. Open **MR11 Master Schedule** from the sidebar.
2. Type one of your project names, numbers or short names into **Search**.
3. Find your columns. They are outlined in your department's colour when you open the page.
4. Check that each figure sits on the right project, stream and block. If a column is empty or a figure is on the wrong row, use the table in the next section.

### 4.4 If something goes wrong

| What you see | What it usually means | What to do |
| --- | --- | --- |
| The upload fails with "could not be saved to the database" | The database couldn't be reached. Your previous file is still the active one | Try again in a few minutes, and contact support if it keeps happening |
| The upload fails straight away | The file is larger than 25 MB, or it isn't an .xlsx workbook | Save it again in Excel as .xlsx, and remove unused sheets or pictures to make it smaller |
| One of your columns is empty in the MR11 | Its header was renamed, or the data isn't on the first sheet | Put the header back exactly as in the template, then upload again |
| Your figures are on the wrong row, or missing for one project | The short name, stream or block colour doesn't match BD | Make them match the BD workbook, then upload again |
| A quantity shows as 0 or looks far too large | The cell holds words, a unit such as m2, or an error value | Leave only the number in the cell, then upload again |
| A value from a formula is blank | The file was saved by another program without the formula results | Open the file in Excel, save it, then upload again |

## 5. Notes for each department

Each department's file feeds different MR11 columns. The middle column lists the headers the system looks for, so keep them exactly as written in your template.

| Department | Columns the system reads | What to do |
| --- | --- | --- |
| Business Development | Customer & Project Name, Project No., Project Shortname, Stream, Countries, Location, PIC, Status, Product Type, Formwork Type, the PO and NCA columns, the payment terms, Selling Price (USD), LME, LME Rate (USD), Incoterms, and the monthly ACTUAL and F'CAST columns | Your file is the master list: a project appears in the MR11 only if it is in your file. Give each block its own fill colour, because the other departments are matched to your blocks. Use blue font for Re-Design Only rows, which stop at Planning. In LME, choose Fixed, Freeze or Variable, and fill in LME Rate (USD) on every Variable row, or its LME adjustment is 0. Write each price's currency as a code (SGD), a name (Singapore Dollar) or a symbol (S$). A price in a currency the system can't recognise is left out, with a note beside it in the MR11 |
| Finance | The project and stream, the product type, Advance Received / Payment Status, Actual Received and Payment Date | Your rows are matched to BD by project and stream first, then by the closest colour, then by product type. When a project has several BD rows, copy BD's colours and product types so each payment lands on the right row |
| Shell Plan & Design | Project No., project name and stream, Shell Plan Status - Pending Consultant Drawings, Shell Plan Approved Date, Formwork Design Status, Actual Formwork Order Completion Date, Total Quantity Ordered m2, the latest revision and submission date, and the holing and accessories status and dates | Shell Plan and Design share one combined file and one page. Each design block is matched to BD by project, stream and fill colour, so give each block the same fill colour as its BD rows. Pick statuses from the template's drop-down lists, so the MR11 colours the completion dates correctly. When a Shell Plan status becomes Approved or Reapprove, it is added to the approval history automatically. The **Approval history** button shows or hides that list |
| Planning | Project Shortname, project name, Stream, Series and Cumulative Processed (Project) | Fill in the series number on every row, because rows without one don't appear in the **Series Ledger**. The project number is taken from BD using your short name, so it must match BD's. The MR11's Processed Date is the day of the upload that changed your total, so upload on the day the processing is recorded |
| Production | The project and stream, Series, Cumulative Produced (Project), and one column for each day | Enter each day's output in that day's column. The MR11 shows the latest day with output as the Produced Date. Your file is monthly, so start a new one each month; earlier months stay in the system. **Production Series** lists every series with the m² produced |
| Dispatch | The project and stream, Cumulative Dispatched (Project), one column for each day, Formwork Quantity Sailed (m2), and ETD and ATD for Overseas | You have two files, Local and Overseas, and projects in Sabah and Sarawak go in Overseas. Choose the right file before you upload. Enter each day's dispatch in that day's column. In the Overseas file, keep ETD and ATD up to date, because the MR11 shows the latest dates from them. **Monthly dispatched** shows the m² dispatched in each month |

Screenshots of the department pages:

![Figure 5: The Shell Plan & Design page, with the approval history above the combined workbook](shots/dept-design.png)

![Figure 6: The Planning page showing the current workbook (Active Sheet)](shots/dept-planning.png)

![Figure 7: The Planning Series Ledger, with processed and target m² for each series](shots/dept-planning-series.png)

![Figure 8: The Production Series list, with the m² produced in each series](shots/dept-production-series.png)

![Figure 9: The Dispatch page with the Overseas file selected and the Monthly dispatched panel above it (empty in the sample data)](shots/dept-dispatch.png)

## 6. The MR11 Master Schedule

The MR11 page, called **MR11 Master Operations Ledger**, shows one row for each BD row, with every department's columns side by side.

![Figure 10: The MR11 Master Schedule, with the exchange-rate and LME cards and the Options panel](shots/mr11-admin.png)

### 6.1 The buttons along the top

| Button | What it does |
| --- | --- |
| Search | Finds rows by project name, project number or short name |
| Zoom | Makes the table smaller or larger, between 20% and 135% |
| Full screen | Shows the table across the whole screen |
| Deleted rows (administrators only) | Lists the rows removed from the MR11, each with a **Restore** button |
| Sync | Rebuilds the MR11 from every department's latest workbook |
| Export | Downloads the MR11 as an Excel file, with its colours, merged cells and two-row header |

The **market cards** above the table show today's exchange rates (what 1 USD is worth in MYR and other currencies) and the LME aluminium cash and 3-month prices. Each card shows where its figures come from, with a LIVE badge. If a card says "Unavailable right now", the source couldn't be reached and the last known value is being used.

### 6.2 The Options panel

The two icons at the far right of the page show or hide the Options panel and the market cards. The panel has three parts:

- **View** lets you show or hide groups of columns: BD project details, payment terms, pricing and LME, Finance, Shell Plan, Design, Planning, Production, Dispatch, and the monthly actuals and forecasts. The project name, number, short name and stream always stay visible.
- **Highlight columns** outlines each department's columns in that department's colour. If you're a department user, your own columns are outlined when you open the page.
- **Filters** let you narrow down the rows by ticking values: Project, Country, Location, PIC, Status, Product type, Formwork type, Stream, Shell Plan status, Design status, Payment status, LME type and Dispatch stage. Each value shows how many rows have it, and **Clear all filters** starts you afresh.

The page remembers your zoom level, filters, column groups and whether the panel is open, on the computer you're using.

### 6.3 Reading the MR11

| What you see | What it means |
| --- | --- |
| The font and fill colour of a row | These come from the BD row |
| Merged Shell Plan and Design cells | Rows of the same project and stream with the same fill colour share one design status |
| Coloured completion dates | Dark green means completed and the date has passed, yellow means completed but the date is still ahead, and red means not completed |
| A "-" in the Production and Dispatch columns | A Re-Design Only row (in blue font), which stops at Planning |
| ETD/ATD | For Overseas projects, the latest estimated and actual departure dates with their m². For Local projects, the "Delivered:" dates |
| The month columns | Months that have ended show the m² actually dispatched (ACTUAL); the current and later months show the forecast (F'CAST) |
| Processed, Produced and Dispatch Date | The date the total last changed, or the latest day with output |
| Selling Price, LME Adjusted and Final Selling Price | Worked out again with today's exchange rates and LME price every time you open the page |

### 6.4 Deleting and restoring a row (administrators only)

1. Choose delete on the row. A box asks "Delete this row from MR11?" and names the row, so you can check it's the right one.
2. Click **Delete row**. The MR11 is rebuilt without that row.
3. To bring it back, click **Deleted rows**, then **Restore** next to that row.

## 7. The CEO Executive Hub

The **CEO Executive Intelligence Overview** gives management a summary of the latest MR11.

![Figure 11: The CEO Executive Hub, with monthly actuals against the forecast, pricing and market, and the production pipeline](shots/ceo.png)

- **Region filter:** choose All regions, Malaysia, India or Rest of World.
- **Month filter:** choose All months, or a single month to see its pipeline. You can also click a point on the chart to pick that month.
- **Monthly m², Actual vs Forecast:** the actual figures (solid line) against the forecast (dashed line), with a "Today" line between them. Months that have no forecast use a default of 100,000 m².
- **Pricing & Market:** the average selling price per m² (Final Selling Price weighted by m², with MYR at today's rate), the USD to MYR rate and the LME aluminium price.
- **Production Pipeline:** the total m² for Design, Processed, Produced, Dispatched and Sailed. For a single month, it shows the BD Forecast, Design, Processed, Produced and Dispatched, with Re-Design Only rows shown separately.
- **Raw Data:** the MR11 rows behind the figures.

If you see "MR11 data could not be loaded", click **Refresh**. If it keeps happening, use **Sync** on the MR11 page.

## 8. Admin Permissions (administrators only)

![Figure 12: Admin Permissions, showing each user's primary role and the departments they can open](shots/admin.png)

### 8.1 Creating a user

1. Open **Admin Permissions** and click **Provision New User**.
2. Enter the person's full name, corporate email address and a starting password.
3. Choose a **Primary Role Preset** (System Administrator, one of the departments, or Custom Permissions) and save.
4. Give the person their email address and starting password, and ask them to change the password the first time they sign in.

### 8.2 Changing or removing access

To change what someone can see, choose a new primary role for them in the table, or switch individual departments between Hidden and Enabled. Changes are saved straight away and take full effect the next time the person signs in.

To delete a user, click **Delete User Account** and confirm. This can't be undone. The main administrator account is marked "Protected System Account" and can't be deleted.

In this release, the CEO role can't be given from Admin Permissions. Please ask IT support to add it.

## 9. Troubleshooting and help

| If this happens | Try this |
| --- | --- |
| A column in the MR11 is empty after you upload | Check that the header in your workbook has its usual name, and that the project's short name and stream match BD's |
| Your rows don't line up with the right BD rows | Check that your font and fill colours match BD's block colours |
| The prices look wrong | Look at the market cards; if a source is unavailable, the last known rate is being used |
| You can't see a page you need | Ask your administrator for the role, then sign out and sign in again |
| Anything else | Contact support with a screenshot, the time it happened (Malaysia time) and the file you uploaded |

## 10. Glossary

| Term | Meaning |
| --- | --- |
| MR11 | The master schedule that follows every project from contract to dispatch |
| Stream | A sub-package of a project, such as Stream 1 or Stream 2 |
| Series | A batch of formwork processed by Planning or fabricated by Production |
| Block | A group of rows sharing a fill colour, which departments use to mark the parts of a project |
| LME | The London Metal Exchange aluminium price, used in pricing |
| ETD and ATD | The estimated and actual time of departure of a shipment |
| m² | Square metres of formwork |
