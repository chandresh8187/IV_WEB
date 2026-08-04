# Fix summary

- Corrected the dashboard response mapping so current, day, night, month, and material totals use the backend's real response fields.
- Added the missing supervisor Shift screen with automatic/manual state, assignment restrictions, plant-status warnings, and responsive controls.
- Restored active-supervisor loading and connected user edit/status actions to implemented API endpoints.
- Added role-aware route guards and reactive handling for login expiry, logout, and profile changes.
- Added live/offline Socket.IO status instead of always displaying a false connected state.
- Added route-level lazy loading, a render error boundary, reduced-motion behavior, global box sizing, focus styles, and mobile layout improvements.
- Fixed multipart request headers, profile/header synchronization, production entry limits, and redundant deferred form updates.
- Removed unused Redux/React Query packages and Vite starter metadata.
- Verified with ESLint, a production Vite build, and a production dependency audit.

Copy `.env.example` to `.env` before running or deploying.
