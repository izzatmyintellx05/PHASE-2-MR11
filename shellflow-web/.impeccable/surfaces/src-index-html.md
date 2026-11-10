---
version: 1
slug: "src-index-html"
primary_target: "src/index.html"
related_targets: ["public/index.html","dist/shellflow_interactive_prototype-2.html"]
---

## Scope

- Surface: the whole ShellFlow operations app (19 pages), built from `src/` into the hosted site and the single file. Mode: Operate.
- Audience and job: MFE department staff, the CEO and the administrator move MR11 blocks through eight gated steps, at desks, on the factory floor and on site.
- Constraints: the layout stays familiar (header, project ribbon, step menu in workflow order, every page where it was); the client asked for a high-end, luxurious feel; Tailwind browser build, lucide icons, SheetJS.
- New in this round: Command search (Ctrl K), My Work inbox, Project timeline, print-ready A4 reports.

## Direction contract

THESIS: ShellFlow is cast like the fair-face precast MFE makes: quiet concrete greys, crisp panel joints and one verdigris accent, and every step's tie holes fill in as its gate conditions are met. It refuses the category default of white cards, slate text and a blue accent.

OWN-WORLD: Concrete ground #E4E2DD, smooth panel #F1F0EC, form-face white #FAFAF8, steel header #3A3D40 over a darker ribbon #2C2E30, near-black ink #1C1C1A, joint lines #CFCCC5. Verdigris #2F6B5E carries actions, selection and met conditions (#9FC9BD on steel); ochre #A86A12 is waiting; oxide red #A8322A is critical. Albert Sans throughout: light 300 for page titles and large figures, 600 to 700 for labels, tabular numerals. 3px corners, 1px joints, no gradients, glass or glow.

STORY: People open their page exactly where it was. They read which steps have their tie holes filled, see what waits on them in My Work, see when blocks land on the Timeline, find anything with Ctrl K, and print a clean A4 report for meetings.

FIRST VIEWPORT: Steel header with the brand, a search field (Ctrl K), role, alerts, plant load and Export. Below it a dark ribbon with the live project scope, then the step menu on smooth panel: eight steps in one row, each with a 2x2 set of tie holes, and a second row of ten tools with My Work first. Under the menu the active page's title in light 40px with its step reference, actions on the right, content in slabs on the concrete ground.

FORM: Fair-Face Concrete, chosen from the safer-register lineup; my grounded candidate 3. seed: none (unavailable). Signature interaction: a tie hole fills with ink when its condition becomes met, and hovering or focusing a step lists its conditions.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
