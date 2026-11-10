# ShellFlow Web

The hosted version of the ShellFlow page for MFE MR11 Phase 2. It adds what a single HTML file cannot do safely: real sign-in, an admin who controls access, and data that everyone shares.

**Please read this first.** This version runs on demonstration data: one live project and sample rows. It shows how the system works, and its access control is real, but it is not the system of record. The real MR11 data lives in the MFE Phase 2 application. Please do not enter real client data here.

## What it does

| Page | Who can open it | What it is for |
|---|---|---|
| Admin Permissions | Administrators | Create users, set roles and departments, suspend access, reset passwords, delete users |
| CEO Executive Hub | CEO and administrators | Pipeline, actual against forecast, cash at risk, monthly m² by region, and data latency |
| Steps 1 to 7 and Department Workbooks | Each person's own department, and administrators | Online entry and the workbook viewer |
| MR11, Readiness Gate, Alerts, Approvals & Log, Reports, Mobile App | Everyone signed in | The shared view of the work |
| My Work | Everyone signed in | Everything waiting on that person: decisions, alerts for their department, and dates due or overdue |
| Project Timeline | Everyone signed in | Every MR11 project month by month, with milestones, forecast m² and what needs attention |
| Rules | Administrators | Capacities, tolerances, clocks and gate checks |

The server enforces all of this, so it holds even if someone edits the page in their browser. A change to someone's access applies straight away, with no need for them to sign in again.

### Finding your way around

- **Search (Ctrl K, or /).** Type to jump to any page, project, NCA version, lorry, alert or approval, or to run an action such as printing or exporting. Arrow keys move, Enter opens, Esc closes. Search only shows what that person may open.
- **Tie holes on each step.** The dots on each step in the menu fill in as that step's gate conditions are met. Hover or focus a step to see which conditions are met; the page heading lists them too.
- **Page links.** Every page has its own address, for example `#timeline` or `#my-work`, so links can be shared and the browser's Back and Forward buttons work.
- **Collapsible sections.** Every section with a heading folds with the arrow at the start of its heading, and pages with several sections have Collapse all / Expand all. The browser remembers what each person folded. On the MR11 Master Schedule, the filters and column choices fold away too.
- **MR11 ledger.** The MR11 Master Schedule opens with the full MR11 table, laid out as in Phase 1: its two header rows and first column stay on screen while scrolling, with search, zoom, full screen, sync and export above it.
- **Printing.** Every page has a Print button laid out for A4. On Reports it prints the weekly report, and on the CEO Executive Hub it prints the CEO summary.

## Work on it in Visual Studio Code

Open the `shellflow-web` folder in VS Code. The page is edited in `src/`, never in `public/index.html` or `dist/`, which are built from it.

| Do this | How |
|---|---|
| Build both versions | Terminal > Run Build Task (Ctrl+Shift+B), or `npm run build` |
| Run the site and rebuild on every save | Run and Debug > "ShellFlow: Run site (rebuild on save)", or `npm run dev`, then refresh the browser |
| Run the tests | Terminal > Run Task > "ShellFlow: Run tests", or `npm test` |

One source makes two versions. Where they differ, the source marks it: `<!--@if hosted-->...<!--@else-->...<!--@endif-->` in HTML, and `/*@if hosted*/.../*@else*/.../*@endif*/` in CSS and JavaScript. `<!--@include path-->` pulls in a file from `src/`.

The look is set in two places: `src/scripts/tailwind.config.js` maps every colour the page uses onto the five ShellFlow ramps, and `src/styles/base.css` holds the design tokens and components. `DESIGN.md` describes the design system.

## Run it on your computer

You need Node.js 20 or newer.

```bash
npm install
```

```bash
copy .env.example .env
```

Fill in `ADMIN_EMAIL` in `.env`, and leave the other values blank.

```bash
npm start
```

Open http://localhost:3000. The first time it starts, the server prints a temporary administrator password in its log. You'll be asked to choose your own when you first sign in. Data is kept in the `data/` folder.

To run the tests:

```bash
npm test
```

## Host it on Vercel with Supabase

This uses the same services as Phase 1.

1. **Create the database.** In Supabase, create a project and copy its connection string. On Vercel, use the transaction pooler address (port 6543).
2. **Put the code in a private GitHub repository.** Keep it private, and check that `.env` is not included.
3. **Create the Vercel project.** Import the repository and keep the settings from `vercel.json`.
4. **Add the settings.** In the Vercel project's Environment Variables, add:
   - `JWT_SECRET`: a long random value (`.env.example` shows how to make one)
   - `ADMIN_EMAIL`: the first administrator's email
   - `ADMIN_PASSWORD`: a temporary password, at least 8 characters
   - `DATABASE_URL`: the Supabase connection string
   - `DEMO_DATE`: `2026-11-18`, so the sample data's timers tell the same story, or leave it out to use the real date
5. **Deploy, then sign in.** Choose your own password when asked.
6. **Remove `ADMIN_PASSWORD`** from the Vercel settings. It is only used the very first time.

The tables are created automatically on the first request.

## Host it anywhere else with Docker

```bash
docker build -t shellflow-web .
```

```bash
docker run -p 3000:3000 --env-file .env -v shellflow-data:/app/data shellflow-web
```

Set `NODE_ENV=production` in `.env`, along with `JWT_SECRET` and `ADMIN_PASSWORD`. Use HTTPS in front of it, because sign-in cookies are only sent over HTTPS in production.

## Before anyone relies on it

- [ ] The site is served over HTTPS
- [ ] `JWT_SECRET` is long and random, and is not shared
- [ ] `ADMIN_PASSWORD` has been removed from the settings after the first sign-in
- [ ] The repository is private
- [ ] Each person has their own account, and nobody shares one
- [ ] Database backups are switched on

## How it is protected

- Passwords are stored as bcrypt hashes, and new accounts must change their temporary password at first sign-in.
- Sign-in has no pre-filled details or quick-login buttons, and its error does not reveal whether an email exists.
- Ten wrong passwords lock an account for 15 minutes, and sign-in attempts are also limited by address.
- The session cookie cannot be read by page scripts, and requests from other sites are refused.
- Each department can only save its own data. Non-admins cannot approve their own NCA revisions, edits or payments, and log entries always record the real author.
- The server checks every saved value's shape before storing it.
- The server will not start in production without a proper `JWT_SECRET`.

## Known limits

- **Demonstration data model.** It tracks one live project plus sample rows. Supporting many live projects would be the MFE Phase 2 application's job.
- **Page styling comes from CDNs.** Tailwind, Lucide and SheetJS load from public CDNs at pinned versions, so the page needs internet access. For a long-term production site, build these into the project, which also allows a stricter content security policy.
- **Evidence files.** File names are recorded, but the files themselves are not uploaded to the server.
- **Email.** The site does not send email, so alerts and reports show inside the site only.
- **Rate limits on Vercel.** The limit by address applies per server instance, so the account lockout is the stronger protection there.

## Files

| Path | What it is |
|---|---|
| `server.js` | Starts the server for local running and Docker |
| `api/index.js` | The entry point on Vercel |
| `server/app.js` | Sign-in, Admin Permissions and shared-data routes |
| `server/sections.js` | Who may change which data, and the checks on it |
| `server/store.js` | PostgreSQL and file storage |
| `src/index.html` | The page's markup, the source for both versions |
| `src/styles/base.css` | Design tokens and components |
| `src/scripts/tailwind.config.js` | The colour ramps, type and corners every Tailwind class follows |
| `src/scripts/app.js` | The page's workflow logic |
| `src/scripts/features.js` | Page headings, tie holes, My Work, Timeline, search and A4 printing |
| `scripts/build.js` | Builds `public/index.html` and `dist/` from `src/` |
| `scripts/dev.js` | Builds, watches `src/` and runs the site |
| `public/index.html` | The built hosted page (do not edit; it is rebuilt from `src/`) |
| `public/hosted.js` | Connects the page to the server |
| `dist/shellflow_interactive_prototype-2.html` | The built single file that runs on its own |
| `.vscode/` | Build, run and test tasks for VS Code |
| `PRODUCT.md`, `DESIGN.md` | Who the product is for, and the design system |
| `test/api.test.js` | Checks the access rules from the outside |
