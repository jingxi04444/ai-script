# AGENTS.md

## Repo Shape
- `ui/` contains existing Figma/Make UI prototypes only: `ui/ui-front-web/` and `ui/ui-admin-web/` are design references, not the production frontends.
- Production frontends now live under `apps/front-web/` and `apps/admin-web/`; add new business UI there instead of continuing under `ui/`.
- Production app entrypoints are `apps/*/src/main.tsx`; app shells live in `apps/*/src/app/App.tsx`.
- Production frontend structure should stay split by responsibility: `app/` for shell/router/session/theme/layout, `pages/` for route pages, `features/` for domain workflows, `components/` for shared UI, `services/` for API clients and mock data, and `types/` for shared TypeScript types.
- Mock backend data now lives in `apps/*/src/services/mock.js`; do not add new mock API data back under `apps/*/src/app/mock.js`.
- Product requirements live in `doc/request/`; treat them as behavior source of truth when implementing UI.
- Architecture details live in `doc/architecture/方案1-模块化单体架构.md`.

## Product Sources
- User-facing workflow changes must follow `doc/request/前台需求.md`, especially the 9-step flow: global settings, selling points, viral/original source, storyboard, scene-role-props, video generation, dubbing, preview, analytics.
- Admin, permissions, review/audit, knowledge base, materials, parsing, and operations changes must follow `doc/request/后台需求.md`.
- Do not add admin-only capability into the user-facing app unless the frontend requirement document explicitly calls for it.
- Compliance checks, originality checks, audit semantics, brand isolation, and permission boundaries are core product concepts; do not remove or weaken their UI without explicit direction.

## Commands
- Production front app: run commands from `apps/front-web/`.
- Production admin app: run commands from `apps/admin-web/`.
- Install per app with `npm install`; each app has its own `package-lock.json`.
- Start dev server: `npm run dev`.
- Production build / primary verification: `npm run build`.
- No lint, test, typecheck, CI, or root package scripts are currently configured; do not invent those checks.

## API / Mock Rules
- All frontend API calls should go through `apps/*/src/services/*Api.ts`; pages and components should not import `mock.js` directly.
- `apps/*/src/services/apiClient.ts` controls mock/real API switching. Default is mock; set `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL` for real backend integration.
- When adding a new API method, define the request/response TypeScript types under `apps/*/src/types/`, implement the service method, and add matching mock behavior in `services/mock.js`.

## Admin App Structure
- `apps/admin-web` must keep admin modules split into route pages under `src/pages/` rather than growing a single large `App.tsx`.
- Admin sidebar menus must be loaded from `menuApi.getMenus()` / backend menu config; do not hardcode business menus in `AdminLayout`.
- Admin menu rendering must respect `enabled`, `permission`, and `order` from the menu API.
- User management, role permissions, and operation logs are separate admin menu pages; do not fold them back into the system settings page.
- Dynamic menu configuration belongs in `pages/SystemManagementPage.tsx` and persists through `services/menuApi.ts`.

## UI Implementation Notes
- Use `ui/*` components as visual references, but implement production components inside `apps/*`.
- Keep existing user-facing copy in Chinese unless the task asks otherwise.
- Preserve the current visual direction: front app uses a dark step-workbench style; admin app uses a management-console layout with sidebar modules.
- Prefer small local edits in the relevant app over cross-app refactors.

## Vite / Asset Quirks
- Both Vite configs include `figmaAssetResolver()` for `figma:asset/...` imports and alias `@` to `src`; keep these when editing config.
- Both Vite configs require both `react()` and `tailwindcss()` plugins for the Make/Figma export; do not remove either just because Tailwind usage looks indirect.
- `assetsInclude` intentionally includes SVG/CSV only; do not add `.css`, `.tsx`, or `.ts` there.
- Existing imported screenshots/assets under `src/imports/` are design references; do not delete or rename them unless asked.

## Documentation Edits
- Update `doc/request/前台需求.md` when adding user-facing product behavior.
- Update `doc/request/后台需求.md` when adding admin-side product behavior.
- Do not move or rename files in `doc/request/` unless the user asks for documentation restructuring.
