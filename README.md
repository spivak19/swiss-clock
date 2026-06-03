# SwissClock – Employee Attendance Tracker

A production-ready employee attendance tracking app built with **Vite + React + TypeScript** on the frontend and **Cloudflare Pages Functions + KV** on the backend.

## Features

- **Daily attendance tracking** — arrival/departure times, status (present/absent/remote), notes
- **Working hours & overtime** calculation per employee per day
- **History view** — browse and edit any past date
- **Statistics dashboard** — averages, extremes, trends with interactive charts
- **CSV export** — export summary or detailed attendance data
- **Dark mode** — system preference detection + manual toggle
- **Mobile-first** responsive design

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite 5, React 18, TypeScript |
| Routing | React Router v6 |
| Charts | Recharts |
| Icons | Lucide React |
| Styling | Tailwind CSS v3 |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare KV |
| Deployment | Cloudflare Pages |

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) — `npm install -g wrangler`
- A Cloudflare account (free tier works)

### 1. Install dependencies

```bash
npm install
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Create the KV namespace

```bash
# Production namespace
npm run kv:create
# Copy the returned id into wrangler.jsonc → "id"

# Preview namespace (for local dev)
npm run kv:create:preview
# Copy the returned id into wrangler.jsonc → "preview_id"
```

Your `wrangler.jsonc` should look like:
```jsonc
{
  "kv_namespaces": [
    {
      "binding": "ATTENDANCE_KV",
      "id": "abc123...",
      "preview_id": "def456..."
    }
  ]
}
```

### 4. Run the development server

**Option A – Full stack (recommended):**
```bash
npm run cf:dev
# Opens on http://localhost:8787
# Both the React frontend AND the API functions are served
```

**Option B – Frontend only:**
```bash
npm run dev
# Opens on http://localhost:5173
# API calls are proxied to :8787 — run wrangler separately if needed
```

---

## Deployment to Cloudflare Pages

### One-command deploy

```bash
npm run deploy
```

This runs `npm run build` then `wrangler pages deploy dist --project-name=swissclock`.

### First-time setup (via Dashboard)

1. Go to [Cloudflare Dashboard → Workers & Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Click **Create application → Pages → Connect to Git**
3. Select your repository
4. Configure:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Under **Settings → Functions → KV namespace bindings**, add:
   - Variable name: `ATTENDANCE_KV`
   - KV namespace: your production namespace

---

## Project Structure

```
swissclock/
├── functions/                    # Cloudflare Pages Functions (API)
│   └── api/
│       ├── _middleware.ts         # CORS middleware
│       ├── _shared.ts             # Shared types, utils, KV helpers
│       ├── employees/
│       │   ├── index.ts           # GET /api/employees, POST /api/employees
│       │   └── [id].ts            # PUT /api/employees/:id, DELETE /api/employees/:id
│       ├── attendance/
│       │   └── [date].ts          # GET /api/attendance/:date, PUT /api/attendance/:date
│       └── statistics/
│           ├── index.ts           # GET /api/statistics
│           └── [employeeId].ts    # GET /api/statistics/:employeeId
├── src/
│   ├── components/
│   │   ├── AttendanceTable.tsx    # Main attendance table (desktop + mobile)
│   │   ├── DashboardCards.tsx     # Today's summary cards
│   │   ├── EmployeeModal.tsx      # Add/Edit employee modal
│   │   ├── Navigation.tsx         # Sidebar (desktop) + bottom nav (mobile)
│   │   ├── Toast.tsx              # Save feedback notification
│   │   └── charts/
│   │       ├── ArrivalTimeChart.tsx       # Line chart: arrival/departure over time
│   │       └── MonthlyAttendanceChart.tsx  # Bar chart: attendance frequency
│   ├── contexts/
│   │   └── ThemeContext.tsx       # Dark mode state
│   ├── hooks/
│   │   ├── useAttendance.ts       # Attendance CRUD + dirty state
│   │   └── useEmployees.ts        # Employee CRUD
│   ├── lib/
│   │   ├── api.ts                 # Typed API client
│   │   └── utils.ts               # Date/time helpers, CSV export
│   ├── pages/
│   │   ├── AttendancePage.tsx     # Today's attendance
│   │   ├── HistoryPage.tsx        # Historical records
│   │   └── StatisticsPage.tsx     # Stats + charts
│   └── types/
│       └── index.ts               # Shared TypeScript interfaces
├── wrangler.jsonc
├── vite.config.ts
└── package.json
```

---

## API Reference

### Employees

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/employees` | List all employees |
| `POST` | `/api/employees` | Create employee `{ name }` |
| `PUT` | `/api/employees/:id` | Update employee `{ name }` |
| `DELETE` | `/api/employees/:id` | Delete employee |

### Attendance

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/attendance/:date` | Get attendance for `YYYY-MM-DD` |
| `PUT` | `/api/attendance/:date` | Save attendance for `YYYY-MM-DD` |

### Statistics

| Method | Path | Query Params | Description |
|---|---|---|---|
| `GET` | `/api/statistics` | `preset`, `from`, `to` | Stats for all employees |
| `GET` | `/api/statistics/:employeeId` | `preset`, `from`, `to` | Stats for one employee |

**Preset values:** `last30`, `last90`, `thisYear`, or use `from=YYYY-MM-DD&to=YYYY-MM-DD` for custom range.

---

## KV Data Structure

**Employees list:**
```
key:   employees
value: [{"id": "uuid", "name": "John"}]
```

**Daily attendance:**
```
key:   attendance:2024-01-15
value: {
  "employee-id": {
    "arrival": "08:15",
    "departure": "17:05",
    "status": "present",
    "notes": ""
  }
}
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run cf:dev` | Wrangler dev server (frontend + functions + KV) |
| `npm run build` | Production build |
| `npm run deploy` | Build and deploy to Cloudflare Pages |
| `npm run kv:create` | Create production KV namespace |
| `npm run kv:create:preview` | Create preview KV namespace |
