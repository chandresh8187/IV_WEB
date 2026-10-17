# IV unified web

Unit 1 and Unit 2 run from this single Vite project. Unit 1 source is under src/unit1; existing Unit 2 source remains under src. This project is self-contained and does not import from the separate Unit 1 project.

Run npm install, then npm run dev. Open the root URL, select a unit and sign in with that unit's existing email/password. Unit 1 opens /unit1/ and Unit 2 opens /unit2/. Logout affects the current unit only. Switching units unloads the previous unit's styles, cache and realtime connection.

Accounts, roles and databases stay separate. Login calls /api/unit1/auth/login or /api/auth/login according to selection; no shared identity database or accessKey is required. Sessions retain separate storage keys. Backend permission checks still apply to all operations.

Development uses localhost:5000. Production defaults to https://app.ivsquarestructure.com/api. VITE_API_BASE_URL overrides the API for both units; optional VITE_UNIT1_API_BASE_URL overrides Unit 1. VITE_SOCKET_URL overrides realtime origin. Optional VITE_PUBLIC_APP_URL sets the Unit 1 QR web address and must include /unit1; otherwise the current origin plus /unit1 is used.

Run npm run build once and upload the contents of dist (including .htaccess) into the domain document root. Do not deploy separate unit folders: this one build serves both route prefixes. Configure the backend ALLOWED_ORIGINS to allow that web origin. Old root Unit 2 bookmarks redirect under /unit2. Existing printed Unit 1 QR labels pointing at an old standalone host may need reprinting for the new /unit1 address.

Checks: npm run test:portal; npm run build. The original standalone Unit 1 project is retained as a fallback, but future merged-web edits belong here.
