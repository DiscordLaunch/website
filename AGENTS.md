# Agent Instructions

## Project Context

This is the Divine Visual Editor project: a Vite-powered static site/editor built around the raw homepage HTML in `index.html`.

Primary stack:

- Vite 8 with native ES modules.
- Browser JavaScript modules in `src/`.
- Minimal React dependency footprint, with `src/main.jsx` used as the Vite entry point.
- Visual editor behavior in `src/visualEditor.js` and `src/visualEditor.css`.
- Public-page saved-state bridge in `src/rawBridge.js`.
- Editor auth helpers in `src/editorAuth.js`.
- Local CMS persistence and optional Supabase REST/SDK persistence in `src/cmsStorage.js`.
- Supabase SQL migration in `supabase/migrations/001_cms_foundation.sql`.
- Node built-in test runner for unit tests in `test/*.test.mjs`.
- Playwright for e2e coverage in `test/editor-login.spec.js`.

## Skill Check Map

Before changing code, check the skills that match the task:

- General agent workflow: `superpowers:using-superpowers`.
- New UI, editor UX, layout, styling, or visual behavior: `superpowers:brainstorming`, then `build-web-apps:frontend-app-builder`.
- React/Vite entry, frontend performance, or component-level changes: `discover-frontend`, `vercel-react-best-practices`, and `react-doctor` before finishing.
- Browser automation, editor flows, screenshots, or e2e debugging: `playwright`.
- Supabase storage, migrations, RLS, auth, buckets, or Postgres changes: `supabase:supabase` and, for SQL/schema work, `supabase:supabase-postgres-best-practices`.
- API, REST persistence, auth, or client/server contract changes: `discover-api`.
- Bug fixes or failing tests: `superpowers:systematic-debugging`; use `superpowers:test-driven-development` when adding or changing behavior.
- Security-specific review or secure-by-default changes: `security-best-practices`.
- GitHub publishing, PRs, or CI investigation: `github:github`, `github:yeet`, or `github:gh-fix-ci` as appropriate.
- Final verification before claiming work is complete: `superpowers:verification-before-completion`.

## Local Commands

Use these commands from the repo root:

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run test:e2e
```

Run targeted checks first when the change is narrow, then run broader checks before final handoff when practical.

## Working Rules

- Keep `index.html` as the source page unless the task explicitly asks for a structural migration.
- Preserve the `/editor` route behavior; `/cms` is intentionally removed by `vite.config.js`.
- Do not commit `.env.local`, logs, `node_modules`, `dist`, `output`, or `test-results`.
- Store new public assets under `public/` or `src/assets/` based on existing usage.
- Keep browser-only code guarded from non-browser test contexts when needed.
- Maintain compatibility with both localStorage persistence and optional Supabase persistence.
- Prefer structured state updates through `normalizeVisualState()` and the helpers in `src/cmsStorage.js`.
- Add or update tests in `test/` when changing persistence, auth, editor state, or URL/route behavior.
- For visual editor work, verify at least the public page and `/editor` route in a real browser when feasible.
