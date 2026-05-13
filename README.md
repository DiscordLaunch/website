# Divine Visual Editor

Local Vite project built around the raw Divine homepage HTML.

- `/` - public Divine page, using the copied raw HTML/CSS
- `/editor` - editable clone of the same page

There is no database right now. The editor saves page edits to browser `localStorage` under:

```txt
divine.visual.page.v1
```

The editor route currently uses a client-side password gate. Set the password locally in `.env.local`:

```txt
VITE_EDITOR_PASSWORD=your-editor-password
```

Set the same environment variable in your cloud host before deploying.

When Supabase env vars are configured, `/editor` uses Supabase email/password auth instead of the local password gate. The signed-in user must have `app_metadata.role = cms_editor` or the editor will reject the login and RLS will reject writes.

For cloud CMS migration, use Vercel for hosting and Supabase for auth, database, and image storage. See `docs/supabase-migration.md`.

Run locally:

```bash
npm install
npm run dev
```

Open:

```txt
http://127.0.0.1:5173/editor
```

How the editor works:

- Click text directly on the page and edit it inline.
- Select a button, image, or video block, then use `Edit selected` for URL/icon settings.
- Select an existing element and duplicate it into its parent/container from the bottom toolbar.
- Select an existing card, step, testimonial, stat, FAQ row, social link, or hero trust item and remove it from the bottom toolbar.
- Select the animated hero word to edit the full rotating word list.
- Use `Save` to persist edits, `Reset edits` to clear visual editor changes, and `View page` to open the public route.

Current implementation:

- `index.html` stays the source page so the UI remains faithful to the original HTML.
- `src/visualEditor.js` adds the editable canvas tools only on `/editor`.
- `src/rawBridge.js` applies saved visual edits to the public page.
- Optional Supabase persistence is guarded by RLS; only users with `app_metadata.role = cms_editor` can write remote CMS state.
