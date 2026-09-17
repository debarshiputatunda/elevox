# S-Box Safety Monitoring System — Frontend

Production-ready React frontend for the ESP8266-based S-Box industrial safety monitoring platform.

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Material UI v6
- Redux Toolkit
- TanStack Query (React Query)
- React Router v7
- Axios
- Formik + Yup
- Recharts
- Vitest + React Testing Library

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Demo Credentials (Mock Mode)

| Role     | Email              | Password    |
|----------|--------------------|-------------|
| Admin    | admin@sbox.com     | password123 |
| Manager  | manager@sbox.com   | password123 |
| Employee | employee@sbox.com  | password123 |

## Environment Variables

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_USE_MOCK_API=true
```

Set `VITE_USE_MOCK_API=false` when connecting to the real backend.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm test`     | Run unit tests           |
| `npm run lint` | ESLint                   |

## Project Structure

```
src/
├── api/           # Axios client + interceptors
├── components/    # Reusable UI + guards
├── constants/     # Routes, roles, menu
├── context/       # Theme provider
├── hooks/         # Redux + CRUD hooks
├── layouts/       # Main + auth layouts
├── mocks/         # Sample data
├── pages/         # Feature pages
├── routes/        # Router config
├── services/      # API services
├── store/         # Redux slices
├── theme/         # MUI themes
├── types/         # TypeScript interfaces
└── utils/         # Helpers + storage
```

## Features

- JWT authentication with role-based routing
- Admin / Manager / Employee RBAC
- Dashboard with metrics and charts
- CRUD: Users, Locations, Work Areas, Tickets, S-Boxes
- S-Box device management and registration
- Real-time monitoring with HTTP polling
- Violations feed with CSV export
- Alarm control panel (Admin only)
- Reports with placeholder analytics
- Light / dark theme
- Mock API layer for offline development
