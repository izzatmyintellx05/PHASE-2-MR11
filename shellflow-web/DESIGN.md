---
name: ShellFlow
description: MFE's MR11 Phase 2 operations system, cast in fair-face concrete with one verdigris accent.
colors:
  concrete-ground: "#E4E2DD"
  smooth-panel: "#F4F3EF"
  form-face: "#FCFCFA"
  carbon-ink: "#1C1C1A"
  ink-secondary: "#55534E"
  ink-muted: "#6B6863"
  panel-joint: "#CFCCC5"
  soft-joint: "#DDDAD3"
  formwork-steel: "#3A3D40"
  steel-deep: "#2C2E30"
  steel-raised: "#46494C"
  steel-ink: "#EDEBE6"
  verdigris: "#2F6B5E"
  verdigris-deep: "#275A4F"
  verdigris-tint: "#DCE8E4"
  verdigris-on-steel: "#9FC9BD"
  ochre: "#A86A12"
  ochre-tint: "#F5E8CF"
  iron-oxide: "#A8322A"
  iron-oxide-tint: "#F5DEDA"
typography:
  display:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "clamp(28px, 2.8vw, 40px)"
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 300
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  body:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
  ledger-head:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 800
    letterSpacing: "0.05em"
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
spacing:
  gutter: "clamp(16px, 3vw, 40px)"
  tight: "6px"
  group: "12px"
  slab: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.verdigris}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.verdigris-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  header-button:
    backgroundColor: "transparent"
    textColor: "{colors.steel-ink}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "34px"
  input:
    backgroundColor: "{colors.form-face}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.md}"
    height: "34px"
  step-tab:
    backgroundColor: "{colors.form-face}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.md}"
    padding: "6px 10px 6px 12px"
    height: "50px"
  step-tab-active:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "#FFFFFF"
  slab:
    backgroundColor: "{colors.smooth-panel}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  status-pill:
    backgroundColor: "{colors.verdigris-tint}"
    textColor: "{colors.verdigris-deep}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
---

# Design System: ShellFlow

## Overview

**Creative North Star: "Fair-Face Concrete"**

ShellFlow is cast like the precast panels MFE makes: a quiet concrete ground, smooth panels separated by crisp joint lines, formwork steel for the frame, and a single verdigris accent. The luxury is in restraint and finish, not ornament. People who already know the system find every header, ribbon, step and page exactly where it was; only the material changed.

The screen is dense because the work is: forms, ledgers and schedules read all day on desks, tablets in the yard and phones on site. Hierarchy comes from scale and weight inside one face, Albert Sans, with light 300 for titles and large figures and 600 to 700 for labels. Every number is tabular.

One signature carries the world: the tie holes. Each step in the menu carries a set of holes that fill as that step's gate conditions are met, and the page heading lists the same conditions in words.

**Key Characteristics:**
- Concrete ground, smooth panels, 1px joints, 3px corners
- Formwork steel header and ribbon; carbon ink for the open page
- Verdigris is the only accent: actions, selection and conditions met
- Ochre means waiting, iron oxide means critical, and both always come with words
- Light, large figures; small, firm labels; tabular numerals everywhere

## Colors

A restrained material palette: four ramps of concrete, verdigris, ochre and iron oxide, with formwork steel at the dark end of concrete.

### Primary
- **Verdigris** (#2F6B5E): every solid button, the selected state, met conditions and the My Work count. Deepens to Verdigris Deep (#275A4F) on hover. On steel it lightens to Verdigris on Steel (#9FC9BD) for figures and active markers.

### Neutral
- **Concrete Ground** (#E4E2DD): the page field behind every slab.
- **Smooth Panel** (#F4F3EF): slabs, the page menu and table headers.
- **Form Face** (#FCFCFA): inputs, step tabs and the command search.
- **Carbon Ink** (#1C1C1A): body text and the active step.
- **Ink Secondary** (#55534E) and **Ink Muted** (#6B6863): supporting text and labels; muted is the lightest text allowed on panels.
- **Panel Joint** (#CFCCC5) and **Soft Joint** (#DDDAD3): borders, rules and the lines that divide sections inside a slab.
- **Formwork Steel** (#3A3D40), **Steel Deep** (#2C2E30) and **Steel Raised** (#46494C): the header bar, the project ribbon and the valuation panel.

### State
- **Ochre** (#A86A12, tint #F5E8CF): waiting, due soon, medium alerts.
- **Iron Oxide** (#A8322A, tint #F5DEDA): overdue, high alerts, holds and breaches.

### Named Rules
**The One Accent Rule.** Verdigris is the only accent. Every colour the older markup named (sky, indigo, blue, violet) maps to concrete through `src/scripts/tailwind.config.js`; nothing on a working screen is blue.

**The State Needs Words Rule.** Ochre and iron oxide only ever mark state, and always sit next to a label, count or date, never colour alone.

**The Workbook Colour Exception.** In the MR11 ledger, each row keeps the MR11 workbook's own font colour (product type) and fill colour (formwork type). They are client data, not decoration, and they are the only colours outside the ramps. The client chose on 10 November 2026 to keep them exactly as in Excel even where a pair is low in contrast (for example green text on an orange fill), to match the workbook and Phase 1.

## Typography

**Display Font:** Albert Sans (with system-ui)
**Body Font:** Albert Sans (with system-ui)

**Character:** One humanist sans used at two temperatures: light and large for what you read at a glance, firm and small for what you act on.

### Hierarchy
- **Display** (300, clamp(28px, 2.8vw, 40px), 1.05): the page title in every page heading.
- **Figure** (300, 30 to 34px, tabular): contract values, final prices and large counts.
- **Title** (700, 15px): slab and section headings.
- **Body** (400 to 500, 12.5 to 13px, 1.45, tabular): form text, tables and lists.
- **Label** (600, 11 to 12px): field labels, menu labels and meta lines.
- **Ledger head** (800, 10px, 0.05em, uppercase): the MR11 ledger's header rows only, as in Phase 1.

### Named Rules
**The Light Figures Rule.** Any number above 20px is set light (300). Weight is for labels; size is for figures.

## Layout

The page keeps the familiar frame: a steel header bar, a darker project ribbon, then the page menu (eight workflow steps in one row, ten tools below), then the open page. On desktop only the page menu stays pinned while scrolling; the bars above it scroll away.

Content sits in a centred container up to 1440px wide with a fluid gutter (clamp(16px, 3vw, 40px)). Every page starts with the same heading: the light title, a line with the step number and purpose, the gate conditions for workflow steps, and a Print button on the right. Slabs stack with 24px between them; inside a slab, sections are separated by a soft joint line, never by a second box.

The step and tool rows use auto-fitting grids, so a role that sees fewer pages gets a full-width menu. Below 640px the header becomes two rows (brand and a search button, then the actions), the ribbon shrinks to one line with a Details button, and each menu row becomes one horizontally scrolling row that keeps the open page in view.

The MR11 ledger fills the screen: its table area is the viewport height minus the pinned menu, with both header rows and the first column staying visible while scrolling.

## Elevation & Depth

The system is flat at rest. Slabs lift by a hairline (`0 1px 2px rgba(28, 28, 26, 0.06)`) so they read as panels set on the ground; the active step tab and the command search lift further (`0 12px 28px -16px rgba(28, 28, 26, 0.4)`). Depth never comes from glass, blur or gradients.

### Named Rules
**The No Card In Card Rule.** A box inside a slab is a section of that slab: no shadow, no fill, no box border, just a soft joint line above it.

## Shapes

Corners are 3px everywhere, including status pills, buttons, inputs, slabs and step tabs. Only true circles stay round: tie holes, alert dots, timeline dispatch dots and the My Work count. Lines are 1px joints; the readiness-gate checks use a 2px top joint.

## Components

### Buttons
- **Shape:** 3px corners, 36px high (30px in lists).
- **Primary:** verdigris with white text. Every solid button in the app becomes primary, whatever colour its markup named.
- **Hover / Focus:** hover deepens to verdigris deep; keyboard focus shows a 2px verdigris outline offset by 2px.
- **Outline:** transparent with a carbon-ink border, for Print and secondary actions.
- **Header buttons:** transparent on steel with a 1px steel line; the alerts button turns iron oxide when a high alert is open, and the password key turns ochre when the default password is still in use.

### Status pills
- **Style:** tinted ground with deeper text from the same ramp, 3px corners, 10 to 11px bold.
- **State:** verdigris for met and approved, ochre for waiting, iron oxide for held or overdue, concrete for neutral.

### Slabs
- **Corner Style:** 3px.
- **Background:** smooth panel on the concrete ground.
- **Shadow Strategy:** the hairline lift only.
- **Border:** 1px panel joint.
- **Internal Padding:** 16 to 24px.

### Inputs / Fields
- **Style:** form face, 1px joint, 3px corners, at least 34px high, verdigris caret.
- **Focus:** a soft verdigris ring.

### Navigation
- **Step tabs:** form face with a light step number, the name, and the tie holes on the right. The open step turns carbon ink with verdigris-on-steel numbers and holes.
- **Tools:** text with a 14px icon on one line, no box until hover. The open tool turns carbon ink. My Work carries its verdigris count.

### Tie holes (signature)
Each workflow step shows one 6px hole per gate condition, in a two-row grid. A met condition is filled with carbon ink (verdigris on the open step); an unmet one is a 1px ring (#7A7872), dark enough to read on the ground as well as on the tab face. When a condition becomes met, its hole is cast in with a short scale-in (0.42s, ease-out). Hovering or focusing a step shows the conditions in words; the page heading lists them too.

### Collapsible sections
Every boxed section with a heading folds: a 24px chevron button sits at the start of the heading, turns a quarter when folded, and leaves only the heading row visible. Pages with two or more sections add Collapse all / Expand all beside Print. Choices are remembered per section in the browser. The MR11 ledger also folds its filters and column choices behind one button.

### Readiness gate checks
The five gate checks are columns of one slab, each under a 2px joint, with the GREEN or RED badge carrying the state.

### Command search
A centred dialog on a dimmed ground: a 54px search field, grouped results (Recent, Pages, Actions, Projects, NCA versions, Lorries, Approvals, Alerts), the active result on a verdigris tint, and a key guide at the foot. Opened with Ctrl K or /.

### MR11 ledger
The Phase 1 ledger layout: an uppercase ledger title with a contract count, a tool row (search, zoom, full screen, sync, export, deleted rows), filters, and the table with two light uppercase header rows and a first column that stay on screen.

## Do's and Don'ts

### Do:
- **Do** map any new Tailwind colour through `src/scripts/tailwind.config.js` so it lands on the four ramps.
- **Do** use verdigris (#2F6B5E) for the one primary action in a group, for selection and for met conditions.
- **Do** set figures above 20px in light 300 with tabular numerals.
- **Do** start every new page with the shared page heading and give it a page link in `PAGE_SLUGS`.
- **Do** separate sections inside a slab with a soft joint line (#DDDAD3).

### Don't:
- **Don't** introduce a second accent; blue, indigo and violet are retired.
- **Don't** put a card inside a slab, or a coloured stripe on the side of a card.
- **Don't** use rounded-full on anything that is not a true circle.
- **Don't** use emoji or text glyphs as icons; use lucide icons or drawn SVG.
- **Don't** move the header, ribbon, step order or pages people already know.
- **Don't** recolour MR11 ledger rows; their font and fill colours are workbook data.
