# Medical Record AI — Frontend

React + Vite frontend for the AI Medical Record Intelligence System. This talks
to your existing FastAPI backend at `http://127.0.0.1:8000` — no backend logic,
mock APIs, or fake data are included.

## Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` and expects the backend to be running
at `http://127.0.0.1:8000` (see `src/services/api.js` to change this).

## Structure

```
src/
├── components/
│   ├── Sidebar.jsx          shared portal sidebar + logout
│   └── ProtectedRoute.jsx   role-based route guard
├── pages/
│   ├── Login.jsx
│   ├── PatientDashboard.jsx
│   ├── DoctorDashboard.jsx
│   └── AdminDashboard.jsx
├── services/
│   └── api.js               single fetch/XHR wrapper for every backend call
├── utils/
│   └── auth.js               JWT decode + expiry check (client-side UI only)
├── App.jsx                   router + role redirects
├── main.jsx
└── index.css                 shared design system (cards, buttons, tables, etc.)
```

## Security notes (matches backend contract)

- Auth token is stored in `localStorage` as `access_token`, role as `role`,
  and sent as `Authorization: Bearer <token>` on every request.
- The **Doctor → Ask AI** flow sends only `{ appointment_id, query }` to
  `POST /doctor/query`. It never sends or lets the browser choose a
  `patient_id` — that is derived server-side from the verified appointment.
- No medical record content is ever written to `localStorage`, the URL, or
  query strings.
- The token itself is never logged to the console.
- A 401 response from any endpoint clears the local session so the app
  naturally falls back to `/login`.

## Notes on backend response shapes

Some admin/patient list endpoints weren't in front of me to test, so a few
table columns use `a || b || "—"` fallbacks (e.g. `patient_name || patient_id`,
`file_name || filename || name`) to gracefully render whichever field name
your backend actually returns. If a field is named differently than expected,
update the `render` functions in `AdminDashboard.jsx` / `PatientDashboard.jsx`
— no other logic needs to change.

## What I could not verify from this environment

I built and validated this against the API contracts you gave me (`npm run
build` succeeds cleanly), but I don't have network access to your local
backend at `127.0.0.1:8000` from this sandbox, so I could not run it live
against real responses. Run `npm run dev` locally with your FastAPI backend
running to do that final integration pass — Claude Code (desktop or CLI) is a
good fit for that since it can run your dev server and iterate on real
responses directly on your machine.
