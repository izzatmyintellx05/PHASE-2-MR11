---
title: Project Sign-off and Closure Report
file: 10 MFE MR11 - Project Sign-off and Closure Report.docx
readers: Client project owner, client management, vendor management
---
## 1. Introduction

This report records what the MR11 project set out to do, what it delivered, and what still needs to happen before the project can formally close. It is also where both parties sign to accept the system.

Version 1.0 of the MFE Formwork MR11 System was delivered on 15 October 2026 and has passed the developers' build and system checks. Three steps remain before the project closes: the client's user acceptance testing, the handover checklist in section 9, and the signatures in section 11.

## 2. Project summary

| Item | Detail |
| --- | --- |
| Project | MFE Formwork MR11 System |
| Client | MFE Formwork |
| Vendor | MyIntellX |
| Development period | 30 September 2026 to 15 October 2026, with 74 commits in the repository |
| Release | Version 1.0, commit `0cc8c36`, 15 October 2026 |
| Hosting | Vercel (Singapore) with Supabase PostgreSQL (ap-southeast-1), with an Azure option also provided |
| Current status | Delivered, and waiting for UAT and the client's sign-off |

## 3. Objectives and outcomes

| Objective | What was delivered | Status |
| --- | --- | --- |
| Replace the manual assembly of the MR11 | The MR11 is rebuilt automatically from the seven department workbooks every time one is uploaded | Met |
| Let departments keep working in Excel | Uploads keep their values, fill and font colours, and merged cells | Met |
| Control access by department | Nine roles, checked both on the server and on screen | Met |
| Give executives a view of the pipeline | The CEO Executive Hub, with stage totals, a monthly chart, a pipeline for each month and pricing | Met |
| Price with live market data | Bank Negara Malaysia rates and LME aluminium prices, recalculated every time the MR11 is read | Met |
| Keep data shared and safe | Supabase is the source of truth, and every server instance reloads from it | Met, to be confirmed by UAT-35 and UAT-36 |

Screenshots of the delivered system are in Appendix A.

![Figure 1: The delivered MR11 Master Schedule (version 1.0, sample data)](shots/mr11-admin.png)

![Figure 2: The delivered CEO Executive Hub (version 1.0, sample data)](shots/ceo.png)

## 4. Scope

| Delivered | Not delivered in version 1.0 |
| --- | --- |
| Signing in, password changes and accounts managed by administrators | Self-registration and single sign-on |
| Six department pages with upload and a workbook viewer (Shell Plan & Design combined, and Dispatch split into Local and Overseas) | Downloading the original uploaded files again |
| The MR11 Master Schedule with filters, export, and row delete and restore | Email or push notifications |
| Series history, approval history and monthly dispatch figures | An audit log that is saved permanently |
| The CEO Executive Hub | Giving the CEO role from Admin Permissions |
| Admin Permissions | A mobile app, and integration with an ERP system |

## 5. Deliverables

| # | Deliverable | Where to find it | Status |
| --- | --- | --- | --- |
| 1 | The web application, version 1.0 | Production address to be confirmed | Delivered |
| 2 | The source code | GitHub repository izzatmyintellx05/MFE, branch main | Delivered, to be made private |
| 3 | The database schema and seed data | supabase/schema.sql | Delivered |
| 4 | The deployment configuration | vercel.json, Dockerfile, azure-pipelines.yml, azuredeploy.json and deploy-azure.sh | Delivered |
| 5 | Software Requirements Specification | 01 MFE MR11 - Software Requirements Specification.docx | Delivered for review |
| 6 | System Architecture Document | 02 MFE MR11 - System Architecture Document.docx | Delivered for review |
| 7 | API Reference | 03 MFE MR11 - API Reference.docx | Delivered for review |
| 8 | Source Code Repository Guide | 04 MFE MR11 - Source Code Repository Guide.docx | Delivered for review |
| 9 | Deployment Guide | 05 MFE MR11 - Deployment Guide.docx | Delivered for review |
| 10 | User Guide | 06 MFE MR11 - User Guide.docx | Delivered for review |
| 11 | Test Plan and UAT Test Cases | 07 MFE MR11 - Test Plan and UAT Test Cases.docx | Delivered, with UAT still to be run |
| 12 | Operations and Support Guide | 08 MFE MR11 - Operations and Support Guide.docx | Delivered for review |
| 13 | Release Notes v1.0 | 09 MFE MR11 - Release Notes v1.0.docx | Delivered |
| 14 | Data Models | 11 MFE MR11 - Data Models.docx | Delivered for review |
| 15 | Code Guide: Backend | 12 MFE MR11 - Code Guide - Backend.docx | Delivered for review |
| 16 | Code Guide: Frontend | 13 MFE MR11 - Code Guide - Frontend.docx | Delivered for review |
| 17 | Code Guide: Configuration, Build and Scripts | 14 MFE MR11 - Code Guide - Configuration, Build and Scripts.docx | Delivered for review |
| 18 | Training for users, administrators and IT | To be scheduled | Pending |

## 6. Quality and acceptance

| Check | Result |
| --- | --- |
| Type check and production build (21 October 2026) | Passed |
| API checks in demonstration mode (21 October 2026) | 23 of 24 passed; the one failure is known issue 1, downloading uploaded files |
| User acceptance testing (36 cases) | Not yet run |
| Open Critical or High defects | None recorded yet |

## 7. Open issues and risks at closure

| # | Issue or risk | Rating | Owner | Action |
| --- | --- | --- | --- | --- |
| 1 | The GitHub repository is public, and contains sample workbooks, the Supabase project reference and Azure ids | High | Vendor | Make it private, or move it to the client's organisation, before handover |
| 2 | The default passwords (admin123) and a fallback JWT_SECRET that is published in the code | High | Vendor and client IT | Work through the security checklist in the Operations and Support Guide |
| 3 | Changes to a workbook's layout can stop its columns from mapping | Medium | Client departments | Freeze the templates, and agree any header changes through change control |
| 4 | Support contacts, hours and the warranty have not yet been agreed | Medium | Both parties | Agree them before sign-off (see section 10) |
| 5 | Known issues 1 to 10 in the Operations and Support Guide | Low to Medium | Vendor | Plan them into the next release |
| 6 | Market data depends on public services | Low | Vendor | Back-up sources and the last known values are already in place |

## 8. Lessons learned

- **Agree workbook templates early.** The BD, Production and Dispatch layouts changed during client testing, between 6 and 9 October 2026, and each change needed new column mappings. Next time, the templates and header names should be agreed before development starts, with later changes handled through change control.
- **Settle data ownership at the start.** Shell Plan and Design moved from two workbooks to one combined workbook on 7 October 2026. Agreeing early which department owns which columns avoids this kind of rework.
- **Choose one database layout from the start.** The repository ended up with two schema layouts, and the code has to support both of them.
- **Keep the documentation in step with the build.** The repository's early design notes describe features that were never built, and this documentation set now replaces them.
- **Review security at every milestone.** Repository visibility and seeded passwords should be checked before every release to the client, not only at the end.

We will add the client's own lessons at the closure meeting.

## 9. Handover checklist

### 9.1 Access and accounts

- [ ] The client owns, or has admin access to, the GitHub repository, and it is private
- [ ] The client owns, or has admin access to, the Vercel project (or the Azure subscription)
- [ ] The client owns the Supabase project and its database password
- [ ] The domain name and DNS point to the production deployment
- [ ] All credentials have been handed over through a password manager, not by email
- [ ] The administrator password has been changed, and the demo accounts removed or given new passwords
- [ ] The production `JWT_SECRET` has been set, and only client IT knows it

### 9.2 Readiness

- [ ] The security checklist has been completed, or the client has accepted the remaining risks in writing
- [ ] The checks in the Deployment Guide pass
- [ ] Backups have been confirmed, and one test restore has been done
- [ ] Every department's latest workbook has been uploaded to production
- [ ] Accounts have been created for all named users, with the right roles

### 9.3 Knowledge transfer

- [ ] Administrator training: accounts, roles, deleting and restoring rows, and troubleshooting
- [ ] Department user training: uploading, reading the MR11, filters and export
- [ ] A walkthrough of the CEO Executive Hub for the CEO
- [ ] An IT walkthrough of deployment, environment variables, logs and maintenance changes
- [ ] This documentation set has been delivered and accepted

### 9.4 Commercial

- [ ] UAT has been completed with no Critical or High defects still open
- [ ] Support contacts, hours and response times have been agreed
- [ ] The warranty period and its start date have been agreed

## 10. Support after the project and the next release

| Item | Detail |
| --- | --- |
| Warranty period | To be agreed |
| Support contact and hours | To be agreed |
| Response times by severity | To be agreed |

For the next release, we recommend:

1. Storing the original uploaded files (for example in Supabase Storage) so they can be downloaded again.
2. Adding the CEO role to Admin Permissions.
3. Saving the audit log to the database.
4. Strengthening password hashing, limiting repeated sign-in attempts, and restricting CORS and the database health check.
5. Adding the 2028 month columns before December 2027.
6. Splitting the frontend bundle so the first visit loads faster.
7. Adding automated tests for the MR11 matching and pricing rules.

## 11. Acceptance and closure sign-off

By signing below, both parties confirm that version 1.0 of the MFE Formwork MR11 System has been delivered and tested as described in this report, that it meets the agreed requirements apart from the exceptions listed, and that it is accepted for production use. With these signatures, the project moves from delivery into support.

### 11.1 Exceptions accepted at sign-off

Please list any defect or known-issue numbers accepted at sign-off, or write "None".

| # | Item | Agreed action | Target date |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |
| 3 | | | |

### 11.2 Signatures

| Party | Name | Position | Signature | Date |
| --- | --- | --- | --- | --- |
| Client project owner (MFE Formwork) | | | | |
| Client IT representative | | | | |
| Vendor project manager (MyIntellX) | | | | |
| Vendor technical lead | | | | |
