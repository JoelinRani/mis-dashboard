# Park Intelli Solutions — MIS Dashboards

A small internal web app with one page per department (Marketing Lead Generation,
MIS Client Utilization / CRE, Outbound Desk, Software Engineering). Pick a
department from the sidebar to see its KPI cards, charts, and a drill-down table
that goes from a grouped summary down to the individual source rows.

The app has two parts:

- **`server/`** — a small Node/Express API that reads the 4 department Excel
  files straight from a shared folder every time a dashboard is requested (no
  database, no copying files in) and turns each one into clean JSON.
- **`client/`** — the Angular app that shows the dashboards, and is served by
  the same Express process once it's built, so IT only has to run one service.

## 1. Point it at the shared folder

Set the `DATA_FOLDER` environment variable to wherever the 4 workbooks live
(a mapped network drive or a mounted path on the server), for example:

```
DATA_FOLDER=/mnt/shared/mis-dashboards
```

If `DATA_FOLDER` isn't set, it defaults to `server/data` (used for local
testing — the 4 files you shared are already copied in there).

The app finds each department's file by matching keywords in the filename
(case-insensitive), not an exact name, so it keeps working if the shared copy
is renamed slightly:

| Department | Matches a filename containing |
|---|---|
| Marketing Lead Generation | "marketing" or "lead generation" |
| MIS Client Utilization (CRE) | "client_utilization", "client utilization" or "utilization dashboard" |
| Outbound Desk | "outbound" |
| Software Engineering | "swengg", "sw engg" or "software" |

Every dashboard request re-reads the workbook from disk — there's no caching
and nothing to restart — so as soon as someone saves an updated copy to the
shared folder and the user clicks **Refresh** in the app, the numbers update.

## 2. Install and build

Requires Node.js 18.19+ / 20.11+ / 22+ and npm (this was built and tested on
Node 22).

```bash
# Backend
cd server
npm install

# Frontend (builds into client/dist/client/browser)
cd ../client
npm install
npm run build
```

## 3. Run it

```bash
cd server
DATA_FOLDER=/mnt/shared/mis-dashboards PORT=4000 npm start
```

Open `http://<server-host>:4000` — the Express server serves the built
Angular app and the `/api/*` endpoints from that same port. There's nothing
else to run.

To run it as a persistent service, use your normal process manager, e.g. with
`pm2`:

```bash
pm2 start server/src/server.js --name park-mis-dashboard --env DATA_FOLDER=/mnt/shared/mis-dashboards,PORT=4000
```

or a `systemd` unit that sets the same two environment variables and runs
`node server/src/server.js` from the project's `server` folder.

## 4. Local development

To work on the Angular app with live-reload against a running backend:

```bash
cd server && npm run dev      # starts the API on :4000
cd client && npm start        # ng serve on :4200, proxies /api to :4000
```

`client/proxy.conf.json` is what wires that proxy up.

## How the data is cleaned up

Each workbook has real-world quirks (a manual "Total" row, a stale pivot
cache, one column per client instead of one row, two agents' logs with
slightly different columns, a couple of confirmed broken chart formulas in
the Software Engineering sheet). Rather than trust the workbook's own
formulas, the backend recomputes every KPI and chart directly from the
detail rows — see the comments at the top of each file in
`server/src/parsers/` for exactly what was found and how it's handled. The
same notes are also shown to the user in the app itself, under the
collapsible **"Data notes"** section at the bottom of each dashboard.

## Adding a 5th department later

1. Add an entry to `DEPARTMENTS` in `server/src/config.js` (id, label, and
   the filename keywords to match).
2. Write a parser in `server/src/parsers/` that returns the same shape as
   the existing ones (`kpis`, `charts`, `tables`, `dataNotes` — see any
   existing parser for the exact contract) and register it in
   `server/src/routes/api.js`.
3. No frontend changes are needed — the dashboard page, KPI cards, charts
   and drill-down tables are all generic and driven entirely by that JSON.

## Project layout

```
server/
  src/
    config.js          # department list + shared folder path
    server.js           # Express app, also serves the built Angular app
    routes/api.js        # /api/departments, /api/departments/:id/dashboard
    parsers/             # one file per department - Excel -> normalized JSON
    utils/excel.js        # shared Excel-reading helpers
  data/                  # local copies of the 4 files, for testing only
client/
  src/app/
    core/                # models, API service, chart color helpers
    shared/              # kpi-card, chart-panel, drill-down-table, status-pill
    features/
      shell/               # sidebar + department nav
      department-dashboard/ # the generic dashboard page used by all 4 departments
```
