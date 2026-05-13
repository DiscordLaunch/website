# Supabase Migration Setup

This project is now prepared for a Supabase-backed CMS while still working with local storage.

## Environment Variables

Set these locally in `.env.local` and in Vercel project settings:

```txt
VITE_EDITOR_PASSWORD=your-editor-password
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Do not expose the Supabase service role key in this Vite app.

## Database

Run `supabase/migrations/001_cms_foundation.sql` in Supabase SQL Editor.

It creates:

- `public.site_content`
- one row with `id = 'visual-page'`
- public read policy for the published page
- CMS-editor write policy for the future real editor login
- public `cms-images` storage bucket
- CMS-editor image upload/update/delete policies

CMS writes require a Supabase Auth user whose JWT has this app metadata:

```json
{
  "role": "cms_editor"
}
```

Use `app_metadata`, not user-editable metadata, for this role.

## Current Behavior

Without Supabase env vars:

- editor saves to `localStorage`
- public page reads from `localStorage`

With Supabase env vars:

- public page loads local state first, then tries Supabase
- editor loads local state first, then tries Supabase
- editor saves local state and attempts to sync Supabase

Remote writes require Supabase Auth because the SQL policy only allows `cms_editor` users to write. The editor now switches to Supabase email/password login when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.

## Editor Auth Behavior

- Without Supabase env vars, `/editor` uses the local `VITE_EDITOR_PASSWORD` fallback.
- With Supabase env vars, `/editor` calls Supabase Auth password sign-in.
- Supabase logins are rejected unless the user has `app_metadata.role = cms_editor`.
- The editor stores the Supabase session in browser storage and refreshes expired access tokens before remote CMS requests.
- The editor's password-change dialog updates the Supabase Auth password when Supabase is configured; otherwise it updates only the local browser fallback password.

## Migration Steps

1. Create one admin/editor user in Supabase Auth.
2. Set that user's `app_metadata.role` to `cms_editor`.
3. Keep `site_content` public readable.
4. Use the editor normally; remote saves will include the Supabase access token for RLS.
