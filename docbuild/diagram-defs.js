// Mermaid definitions of every diagram in the documentation set, rendered by diagrams.js.
// Kept narrow (about 1,000 px or less) so the text stays readable on an A4 page.
module.exports = {
  overview: `
flowchart TB
  B["Web browser: React app<br/>MR11, CEO Executive Hub, department pages, Admin"]
  subgraph SI["Server instance (Vercel or Azure)"]
    API["Express API (/api)<br/>auth, departments, mr11,<br/>admin, visualization<br/>token and role checks"]
    ENG["MR11 engine<br/>joins the department files<br/>prices at live rates<br/>reads and writes Excel"]
    MEM["In-memory copy<br/>users, workbooks, MR11<br/>a cache, not storage"]
  end
  DB[("Supabase PostgreSQL, ap-southeast-1<br/>the only durable store")]
  MD["Market data<br/>BNM, open.er-api, Frankfurter,<br/>Westmetall, cached 1 hour"]
  B -- "HTTPS with session token" --> API
  API --> ENG
  ENG <--> MEM
  ENG -- "saves uploads and MR11 runs" --> DB
  MEM -. "reloads from it on start" .-> DB
  ENG -- "live rates and LME price" --> MD
`,
  // ---------------- Architecture views ----------------
  context: `
flowchart TB
  subgraph Users["People who use the system"]
    DEP["Department users<br/>BD, Finance, Shell Plan & Design,<br/>Planning, Production, Dispatch"]
    CEO["CEO and executives"]
    ADM["System administrator"]
  end
  SYS["MFE MR11 System<br/>web application"]
  subgraph EXT["Outside services"]
    DB[("Supabase PostgreSQL<br/>ap-southeast-1")]
    BNM["Bank Negara Malaysia<br/>exchange rates"]
    FB["open.er-api, Frankfurter<br/>fallback rates"]
    LME["Westmetall<br/>LME aluminium price"]
  end
  DEP -- "upload workbooks, read MR11" --> SYS
  CEO -- "read CEO Executive Hub" --> SYS
  ADM -- "manage users and rows" --> SYS
  SYS -- "users, uploads, MR11 runs" --> DB
  SYS -- "daily rates" --> BNM
  SYS -. "missing currencies" .-> FB
  SYS -- "cash price" --> LME
`,
  deployment: `
flowchart TB
  B["User's browser<br/>React single-page app"]
  GH["GitHub repository<br/>branch main"]
  subgraph V["Vercel, region sin1 (Singapore)"]
    ST["Static files<br/>dist/"]
    FN["Serverless function<br/>api/index.js (Express)"]
  end
  subgraph AZ["Alternative: Azure App Service or Docker"]
    NS["Node server<br/>server.ts: API + dist/"]
  end
  DB[("Supabase PostgreSQL<br/>pooler, port 6543")]
  EXT["Market data<br/>BNM, open.er-api,<br/>Frankfurter, Westmetall"]
  GH -- "push: npm run build" --> V
  B -- "HTTPS pages" --> ST
  B -- "HTTPS /api" --> FN
  B -. "if on Azure" .-> NS
  FN -- "SQL over TLS" --> DB
  NS -- "SQL over TLS" --> DB
  FN -- "HTTPS, 1-hour cache" --> EXT
  NS --> EXT
`,
  'seq-login': `
sequenceDiagram
  autonumber
  actor U as User
  participant L as Login page<br/>+ auth store
  participant API as POST<br/>/api/auth/login
  participant D as Supabase +<br/>memory store
  U->>L: email, password
  L->>API: { email, password }
  API->>D: reload users and roles
  API->>D: find user by email
  alt no such user
    API-->>L: 401 USER_NOT_FOUND
  else wrong password
    API-->>L: 401 WRONG_PASSWORD
  else correct
    API->>API: sign JWT (7 days)
    API-->>L: token, user
    L->>L: save mfe_token, mfe_user
    L->>U: open /mr11
  end
  Note over L,API: Later calls send the token.<br/>requireAuth checks it, requireRoles checks roles.
`,
  'seq-upload': `
sequenceDiagram
  autonumber
  actor U as Department user
  participant P as Department<br/>page
  participant S as Upload API
  participant D as Supabase
  participant E as MR11<br/>engine
  U->>P: choose .xlsx
  P->>S: POST upload
  S->>S: check token, role, size
  S->>S: parse the workbook
  S->>D: save FileVersion
  alt save fails
    S-->>P: 500 UPLOAD_FAILED
    Note over P,S: The previous version stays active
  else saved
    S->>D: load the others
    S->>E: executeMr11Pipeline()
    E->>D: save Mr11Run
    S-->>P: 200 uploaded
    P->>P: reload page data
  end
`,
  'seq-read': `
sequenceDiagram
  autonumber
  actor U as User
  participant P as MR11 page
  participant API as GET /api/mr11
  participant D as Supabase
  participant M as Market<br/>data
  U->>P: open MR11
  P->>API: request with token
  API->>D: newest Mr11Run
  D-->>API: rows + snapshot
  API->>M: USD rates, LME price
  M-->>API: cached or fetched
  API->>API: applyLivePricing()
  API-->>P: rows, rates,<br/>headers
  P->>P: filter and<br/>draw table
`,
  pipeline: `
flowchart LR
  subgraph S1["1. Prepare"]
    direction TB
    A["Load history from the<br/>latest Mr11Run"] --> B["Fetch today's LME price<br/>and exchange rates"]
    B --> C["Read every active workbook<br/>rows with font and fill colours"]
    C --> D["Shell Plan uses the combined file,<br/>empty BD rows dropped"]
    D --> E["Planning and Production<br/>series history"]
  end
  subgraph S2["2. For each BD row"]
    direction TB
    G["BD columns and<br/>price inputs"] --> H["Finance columns"]
    H --> I["Dispatch: totals, dates,<br/>ETD/ATD, m² per month"]
    I --> J["Design and Shell Plan<br/>by fill-colour block"]
    J --> K["Planning and Production<br/>totals and dates"]
    K --> L["Monthly inputs"]
  end
  subgraph S3["3. Finish"]
    direction TB
    M["Monthly actual / forecast<br/>and CEO month stages"] --> N["Leave out deleted rows"]
    N --> O["Design status per project,<br/>sort, merge spans"]
    O --> P[("Save Mr11Run<br/>unless outdated")]
  end
  S1 --> S2
  S2 --> S3
`,
  bootstrap: `
flowchart TD
  R["First request to a new server instance"] --> B["ensureBootstrapped()<br/>requests wait for it"]
  B --> U["Load users and roles"]
  U --> W["Load each department's<br/>active workbook"]
  W --> Q{"DATABASE_URL set?"}
  Q -- "no: demo" --> S["Load sample workbooks<br/>from uploads/"]
  Q -- "yes" --> M{"Mr11Run in<br/>Supabase?"}
  S --> M
  M -- "yes" --> L["Use it and restore<br/>engine history"]
  M -- "no" --> P["Run the MR11 pipeline<br/>in memory"]
  L --> OK["Serve requests"]
  P --> OK
  W -. "database unreachable:<br/>next request retries" .-> B
`,
  'frontend-map': `
flowchart LR
  LG["/login<br/>Login"]
  subgraph PROT["ProtectedLayout: token required, Sidebar shown"]
    direction TB
    MR["/mr11<br/>Mr11Dashboard"]
    CE["/ceo<br/>CeoDashboard (CEO, ADMIN)"]
    AD["/admin<br/>AdminPage (ADMIN)"]
    DP["/departments/:code<br/>DepartmentPage"]
    PL["/departments/PLANNING<br/>PlanningPage"]
    PD["/departments/PRODUCTION<br/>ProductionPage"]
  end
  API[("Express API<br/>/api")]
  LG -- "after sign-in" --> MR
  MR -- "/mr11 ..." --> API
  CE -- "/mr11" --> API
  AD -- "/admin/users" --> API
  DP -- "/departments/:code" --> API
  PL -- "/mr11/planning-series" --> API
  PD -- "/mr11/production-series" --> API
`,
  // ---------------- Data models ----------------
  'data-flow': `
flowchart TB
  subgraph IN["Input"]
    direction LR
    X["Excel workbooks<br/>one per department"] -- "excel-normalizer" --> W["Workbook model<br/>cells, colours, merges"]
    W -- "JSONB" --> FV[("FileVersion<br/>parsedWorkbook")]
  end
  subgraph PR["Processing"]
    direction LR
    R["Extracted rows<br/>header to value + colours"] -- "MR11 engine" --> M["MR11 rows<br/>78 columns + internal fields"]
    M -- "JSONB" --> RUN[("Mr11Run<br/>records + snapshot")]
  end
  subgraph OUT["Output"]
    direction LR
    API["API response<br/>models"] --> UI["Browser state<br/>React, Zustand, localStorage"]
    XO["MR11 Excel export"]
  end
  IN -- "sheetToRecordsWithStyles" --> PR
  PR -- "GET /api/mr11 + live pricing, GET /api/mr11/export" --> OUT
`,
  'er-accounts': `
erDiagram
  User ||--o{ UserRole : "has"
  Role ||--o{ UserRole : "grants"
  User |o--o{ AuditLog : "acted"
  User {
    TEXT id PK
    TEXT email UK
    TEXT fullName
    TEXT passwordHash
    TEXT status
    BOOLEAN isActive
    TIMESTAMP createdAt
    TIMESTAMP updatedAt
  }
  Role {
    TEXT id PK "role-admin ... role-dispatch"
    RoleCode code UK
    TEXT name
    TEXT description
    TIMESTAMP createdAt
  }
  UserRole {
    TEXT id PK
    TEXT userId FK
    TEXT roleId FK
    TIMESTAMP createdAt
  }
  AuditLog {
    TEXT id PK
    TEXT userId FK
    TEXT action
    TEXT entityType
    TEXT entityId
    JSONB details
    TIMESTAMP createdAt
  }
`,
  'er-workbooks': `
erDiagram
  Department ||--o{ FileVersion : "keeps all versions"
  Department |o--o| FileVersion : "active version"
  User |o--o{ FileVersion : "uploaded"
  Mr11Run }o..o{ FileVersion : "built from (ids in JSON)"
  Department {
    TEXT id PK
    RoleCode code UK
    TEXT name
    TEXT activeVersionId FK
    TIMESTAMP updatedAt
  }
  FileVersion {
    TEXT id PK
    TEXT departmentId FK
    TEXT uploadedById FK
    TEXT originalFilename
    INTEGER fileSize
    FileVersionStatus status
    BOOLEAN isLatest
    JSONB parsedWorkbook
    TEXT storageKey
    TIMESTAMP uploadedAt
  }
  Mr11Run {
    TEXT id PK
    Mr11Status status
    JSONB sourceSnapshot
    JSONB calculatedFields "MR11 rows"
    INTEGER recordCount
    TIMESTAMP generatedAt
  }
  User {
    TEXT id PK
    TEXT email UK
  }
`,
  'er-history-a': `
erDiagram
  PlanningSeriesHistory {
    TEXT id PK
    TEXT projectNo "unique with stream, fontColor, seriesNumber"
    TEXT projectShortname
    TEXT stream
    TEXT fontColor
    INTEGER seriesNumber
    DOUBLE totalProcessed
  }
  PlanningProjectQuantityTracker {
    TEXT id PK
    TEXT projectNo "unique with stream, fontColor"
    TEXT stream
    TEXT fontColor
    DOUBLE totalTargetQuantity
    DOUBLE totalProcessed
    DOUBLE balanceQuantity
  }
`,
  'er-history-b': `
erDiagram
  ProductionSeriesHistory {
    TEXT id PK
    TEXT projectShortname "unique with stream, fontColor, seriesNumber"
    TEXT stream
    TEXT fontColor
    INTEGER seriesNumber
    DOUBLE totalFabricated
  }
  Mr11Config {
    TEXT id PK "singleton"
    TEXT_ARRAY visibleColumns
    TIMESTAMP updatedAt
  }
`,
  'model-workbook': `
classDiagram
  direction TB
  class Workbook {
    <<array of sheets>>
    List~FortuneSheet~ sheets
  }
  class DispatchWorkbook {
    List~FortuneSheet~ sheets
    DispatchFiles dispatchFiles
  }
  class DispatchFiles {
    DispatchFile LOCAL
    DispatchFile OVERSEAS
  }
  class DispatchFile {
    string originalFilename
    string uploadedAt
    List~FortuneSheet~ sheets
  }
  class FortuneSheet {
    string name
    number index
    number status
    number order
    List~FortuneCell~ celldata
    SheetConfig config
  }
  class SheetConfig {
    Map merge
    Map columnlen
    Map rowlen
  }
  class FortuneCell {
    number r
    number c
    CellValue v
  }
  class CellValue {
    any v
    string m
    string f
    string bg
    string fc
    number bl, it
    number ht, vt, tb
    number rowspan, colspan
  }
  Workbook *-- FortuneSheet
  DispatchWorkbook *-- DispatchFiles
  DispatchFiles *-- DispatchFile
  DispatchFile *-- FortuneSheet
  FortuneSheet *-- SheetConfig
  FortuneSheet *-- FortuneCell
  FortuneCell *-- CellValue
`,
  'model-mr11-row': `
classDiagram
  direction TB
  class Mr11Run {
    string id
    Mr11Status status
    string generatedAt
    number recordCount
    List~Mr11Row~ records
    SourceSnapshot sourceSnapshot
  }
  class Mr11Row {
    object 78 display columns
    string _rowKey
    string _fontColor, _fillColor
    number _streamSpan
    List~DesignDatePart~ _designDateParts
    BdPriceInputs _pricing
    Map _dispatchedByMonth
    Map _monthStages
  }
  class DesignDatePart {
    string level
    string date
    boolean completed
  }
  class BdPriceInputs {
    any usd, myr
    any otherCurrency, otherPrice
    any lmeType, lmeRate
    any lmeAdjustedInFile
    any props, aluminium, freight
  }
  class MonthStage {
    number bd
    number design
    number processed
    number produced
    number dispatched
  }
  Mr11Run *-- Mr11Row
  Mr11Row *-- DesignDatePart
  Mr11Row *-- BdPriceInputs
  Mr11Row *-- MonthStage
`,
  'model-snapshot': `
classDiagram
  direction TB
  class SourceSnapshot {
    Map department code to FileVersion id
    Map dispatchTracker
    Map dispatchByMonth, localDispatchByMonth
    Map productionByMonth
    Map monthStageHistory
    List~DeletedMr11Row~ deletedRows
    Map shellplanApprovalHistory
    EngineHistory engineHistory
  }
  class DeletedMr11Row {
    string key
    string shortName, projectNo
    string projectName
    string stream, productType
    string deletedAt, deletedBy
  }
  class ApprovalHistoryGroup {
    string projectNo, shortName
    string projectName
    string stream, fillColor
    List~ApprovalEntry~ entries
  }
  class ApprovalEntry {
    string key, status
    string revision
    string approvedDate, submittedDate
    string recordedOn
  }
  class EngineHistory {
    List planningSeriesHistory
    List planningProjectQuantityTrackers
    List productionSeriesHistory
  }
  SourceSnapshot *-- DeletedMr11Row
  SourceSnapshot *-- ApprovalHistoryGroup
  ApprovalHistoryGroup *-- ApprovalEntry
  SourceSnapshot *-- EngineHistory
`,
  'code-map-backend': `
flowchart TB
  S1["server.ts<br/>local, Azure"] --> APP
  S2["server/vercel.ts<br/>Vercel function"] --> APP
  APP["app.ts<br/>Express app"] --> BOOT["bootstrap.ts<br/>first load"]
  APP --> MW["middleware<br/>auth, roles"]
  MW --> AU["auth"]
  MW --> DE["departments<br/>+ service"]
  MW --> MR["mr11<br/>+ engine"]
  MW --> AD["admin"]
  MW --> VI["visualization"]
  DE --> XN["excel-<br/>normalizer"]
  DE --> MR
  MR --> FX["fx, lme"]
  MR --> CFG["mr11.config"]
  AU --> SUP["supabase.ts"]
  DE --> SUP
  MR --> SUP
  AD --> SUP
  VI --> SUP
  BOOT --> SUP
  SUP --> MEM["prisma.ts<br/>memory store"]
`,
  'code-map-frontend': `
flowchart LR
  MAIN["main.tsx, App.tsx<br/>routes and access guards"]
  MAIN --> LAY["layout/Sidebar"]
  MAIN --> LGN["pages/Login"]
  MAIN --> M11["pages/Mr11Dashboard"]
  MAIN --> CEOD["pages/CeoDashboard"]
  MAIN --> DEPT["pages/DepartmentPage"]
  MAIN --> PP["pages/PlanningPage,<br/>ProductionPage"]
  MAIN --> ADMP["pages/AdminPage"]
  LAY --> PWD["common/ChangePasswordDialog"]
  M11 --> TBL["workbook/Mr11Table"]
  M11 --> SIDE["workbook/Mr11SidePanel,<br/>ColumnGroupsMenu, DepartmentHighlight"]
  M11 --> MKT["common/MarketRates"]
  CEOD --> TBL
  DEPT --> HFV["workbook/HighFidelityViewer"]
  DEPT --> HIST["workbook/ApprovalHistoryTable,<br/>DispatchMonthlyTable"]
  PP --> HFV
  LGN --> ST["store/auth.store"]
  M11 --> CL["api/client"]
  CEOD --> CL
  ADMP --> CL
  DEPT --> CL
  PP --> CL
  CL --> ST
  TBL --> UTL["utils/: formatNumber, designDates,<br/>mr11Filters, ceoMetrics, access"]
  CEOD --> UTL
`,
};
