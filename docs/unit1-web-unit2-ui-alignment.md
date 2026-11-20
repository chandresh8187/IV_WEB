# Unit 1 web visual alignment with Unit 2

The active deployment is the merged `IV-WEB` project, with `/unit1` and `/unit2` workspaces. The older standalone `IV_UNIT_1_WEB` checkout was not changed.

Reference shell, module menu, Profile and user-directory CSS comes from the current Unit 2 source. New styles are scoped to `.unit1-workspace`, including responsive rules, so they cannot change Unit 2. Unit 1's sidebar, header, page spacing, typography, operation cards, action buttons, input fields, table presentation, dialogs and module menus now follow that design. Existing table widths, scroll bounds, component order and workflow controls remain specific to Unit 1.

The shared production/settings ModuleMenu is reused directly. Its Unit 1 callers still supply the original module routes, access filtering and actions. Dashboard remains the Unit 1 monthly-production dashboard. Job templates, planning, coil QR generation/scanning/assignment, production/inspection, material stock/dispatch/rejection, maintenance, reports, 3D viewer and master settings retain their existing behavior and use the aligned shell/workflow styling.

Unit 1 previously had no separate Profile route. `/unit1/profile` now displays its current Unit 1 identity, role, account details and logout control in the Unit 2 profile layout. Refresh uses the existing Unit 1 profile GET and session updater. Unsupported Unit 2 profile-edit/password APIs are not introduced. Account/password changes remain with the existing administrator controls.

Users & Access retains all original mutations, permission checks, protected-superadmin rules, machine assignment, shift selection, search, status filters and reset-password forms. The directory now uses the Unit 2 summary cards and account-row presentation. Unit 2 live-shift data is not invented for Unit 1.

Both workspaces use the installed `@fontsource-variable/inter` font loaded in `src/main.jsx`. The obsolete Unit 1 `/fonts/...` face definition was removed so it cannot shadow the actual bundled font with a missing URL.

Validation:
- 43 Node tests pass, including navigation/session isolation, QR, reports, material geometry and new CSS scope/font/profile-navigation checks.
- ESLint passes for changed JSX and navigation helpers.
- Desktop browser review: dashboard, production module menu, user directory, centered user form and Profile.
- At 390px width: Profile and user rows remain inside the viewport, with no document horizontal overflow.
- Browser preview uses an isolated read-only fixture API and dummy accounts; no live database writes.
- Checksums checked 111 files: Unit 2 source and Unit 1 API/data/store files unchanged. Only the expected Unit 1 static display-navigation helper changed in that set.
- Production build and SHA256-verified Hostinger ZIP succeed. No deployment performed.
