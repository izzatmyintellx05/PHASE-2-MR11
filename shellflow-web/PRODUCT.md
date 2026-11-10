# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

MFE staff who move MR11 project work from enquiry to site, each working in their own department's step:

- BD & Commercial (project entry, NCA versions, pricing)
- Finance (payment gateway, advance and bank lines)
- Shell Planning and Technical Design (design release, panel register)
- Planning and Production & Yard (production, yard staging)
- Dispatch and Logistics (lorry plans, shipping), and Site Receiving
- The CEO, who watches progress, cash and risk across every project
- The administrator (IT), who controls who can sign in and what each person can open

They use it on office desktops and laptops, on tablets on the factory floor and in the yard, and on phones at site. All three are everyday use, not occasional.

## Product Purpose

ShellFlow is MFE's MR11 Phase 2 operations system. It replaces separate department spreadsheets with one gated workflow, so every block of every project moves through the same eight steps, and every department works from the same numbers. Success is a block that never moves forward without its gate being met, and a CEO who can see where every project stands without asking.

## Positioning

The workflow mirrors MFE's own MR11 process step by step: BD & Commercial, Finance Gateway, Technical Design, Production & Yard, Readiness Gate & 4-Way reconciliation, Logistics & Shipping, Site Receiving, and the MR11 Master Schedule. Its gates, roles and reconciliations are MFE's, not a generic project tool's.

## Operating Context

- Eight workflow steps, then Alerts & Reminders, Approvals & Log, Reports, Mobile App, Rules (Admin), CEO Executive Hub, Admin Permissions and Department Workbooks.
- Departments still keep Excel workbooks; the system reads and writes them.
- Changes by non-admins can need approval; every change is logged.
- Areas are in m², contract money in US dollars; the demonstration clock is fixed at 18 November 2026.
- Two deliveries come from one source: a single HTML file that runs on its own, and a hosted site with real sign-in, role-based access and shared data (Node/Express, file or PostgreSQL storage).

## Capabilities and Constraints

- Role-based menus: each department sees its own steps plus the shared pages; the CEO sees the Executive Hub; the administrator sees everything.
- The hosted site enforces access on the server; the page cannot grant itself rights.
- Built as plain HTML, CSS and JavaScript with Tailwind (browser build), lucide icons and SheetJS; no front-end framework.
- Not yet confirmed by MFE: the ShellFlow name, the Design-lock ruling, the meaning of Freeze, when the SLA clock starts, and the tolerance and lorry rules.

## Brand Commitments

- The client asked for the interface to feel high-end and luxurious.
- The layout must stay familiar: people who learned the current page (header on top, the step menu in workflow order, the same pages in the same places) must not get lost.
- "ShellFlow" is a working name until MFE confirms it.

## Evidence on Hand

- One demonstration project with sample rows; it is labelled as demonstration data and must not be presented as real client data.
- Client documents (user guide, architecture, data model, release notes and others) in `../MFE_Client_Documents`.
- No real customer names, testimonials, logos or figures beyond the sample data; none may be invented.

## Product Principles

1. One source of truth: every department reads and writes the same project record.
2. Gate before go: a block only moves forward when its step's conditions are met, and the page shows why when it cannot.
3. Every change has a name and a time: approvals, logs and comments make the record trustworthy.
4. Familiar first: improvements must not cost people the layout they already know.
5. Works where the work is: desk, factory floor and site.
