# IV APP Web

Responsive React/Vite web client for IV Square Structure production management.

## Setup

1. Copy `.env.example` to `.env` and set the API and Socket.IO URLs.
2. Run `npm ci`.
3. Run `npm run dev` for development or `npm run build` for production.

The production build is written to `dist/`. Configure the web server to route unknown paths back to `index.html` so React Router URLs work on refresh.

## Checks

- `npm run lint`
- `npm run build`
