# Atomism Frontend

A React frontend for the Atomism parts, service, and training platform. Connects to the [Atomism Backend](../atomism-backend-restored) API.

## Tech Stack

- **Framework:** React (via Vite)
- **Styling:** Plain CSS (no framework), custom design system

## Features

- Login with role-based UI (Technician / Admin / Approver)
- Full browsing flow: Model → Variant → Aggregate → Assembly → Sub-Assembly → Parts
- Interactive exploded-diagram hotspots linked to the parts list (BOM)
- Search by part number/description, and an AI chatbot for natural-language questions
- Admin tools: add/delete parts directly from the Parts screen
- Responsive layout (stacks on narrow screens)

## Environment Configuration

The backend API URL is currently set directly in `src/App.jsx`:

```js
const API = 'https://atomism-backend-production.up.railway.app';
```

**To point this at a different backend** (e.g. your own hosted instance), change this line to your backend's URL, then rebuild/redeploy.

For local development against a locally-running backend, change it to:
```js
const API = 'http://127.0.0.1:8000';
```

## Running Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`. Make sure the backend (see its README) is also running, and that its CORS settings (`allow_origins` in `main.py`) include `http://localhost:5173`.

## Building for Production

```bash
npm run build
```

Output goes to the `dist/` folder, ready to deploy to any static host.

## Deploying

This frontend has been deployed and tested on [Vercel](https://vercel.com). Any static host works. Key steps:
1. Push this repo to GitHub
2. Import it into your hosting platform (Vercel auto-detects Vite projects)
3. Before deploying, make sure `src/App.jsx`'s `API` constant points at your backend's real URL
4. Make sure the backend's CORS settings include your frontend's deployed URL

## Test Accounts (demo data)

| Username | Password | Role |
|---|---|---|
| Raj Kumar | raj123 | Technician |
| Priya Sharma | priya123 | Admin |
| Vikram Rao | vikram123 | Approver |

## Known Limitations

- The API URL is hardcoded rather than read from a build-time environment variable — a small future improvement would be using Vite's `.env` support instead
- The Approver role has no distinct UI yet — it works at the API level but the interface doesn't show anything different for that role
- No automated tests