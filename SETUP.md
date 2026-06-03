# Setup — backend + hosting

This app is a static frontend (Vite build) talking directly to **Supabase**
(Postgres + Auth + Storage). There is no server to run. Hosting is free on
**GitHub Pages**. This guide is the manual, console-side setup; the code is
already wired for it.

You only do this once. Budget ~30 minutes (most of it is the two OAuth apps).

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> → sign in → **New project**.
2. Pick a name, a strong database password (save it), and a region near you.
3. Wait for it to finish provisioning (~2 min).

## 2. Create the schema, security, and functions

1. In the project: **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migration.sql`](./supabase/migration.sql) and **Run**.
3. It creates the `profiles`, `campaigns`, `campaign_members`, `characters`
   tables, all Row-Level-Security policies, the `create_campaign` / `join_campaign`
   / `regen_invite_code` functions, the signup trigger, and the public
   `portraits` storage bucket. You should see "Success. No rows returned."

To sanity-check RLS later: **Authentication → Policies** should list policies on
all four tables, and **Storage** should show a `portraits` bucket.

## 3. Configure Auth providers

In **Authentication → Sign In / Providers** (a.k.a. Providers):

### Email + password
- Enable the **Email** provider.
- For a private friend-group app you can turn **Confirm email** OFF (under
  Authentication → Providers → Email, or Auth settings) so sign-ups work
  without a mail round-trip. Leave it ON if you prefer verified emails.

### Discord
1. Go to <https://discord.com/developers/applications> → **New Application**.
2. **OAuth2** → copy the **Client ID** and **Client Secret** (reset to reveal).
3. **OAuth2 → Redirects** → add:
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   (find `YOUR-PROJECT-REF` in Supabase → Project Settings → Data API → URL).
4. Back in Supabase: enable the **Discord** provider, paste Client ID + Secret, Save.

### Google
1. Go to <https://console.cloud.google.com> → create/select a project.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   (configure the consent screen first if prompted — "External", add yourself
   as a test user is fine).
3. Application type **Web application**. Under **Authorized redirect URIs** add:
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**.
5. Back in Supabase: enable the **Google** provider, paste them, Save.

## 4. Point Auth at your site URL

In **Authentication → URL Configuration**:
- **Site URL:** your GitHub Pages URL, e.g. `https://YOUR-USERNAME.github.io/draw-steel/`
  (trailing slash matters for the project-subpath form).
- **Redirect URLs:** add the same URL (and `http://localhost:5173/` so local
  `npm run dev` OAuth works too).

> The OAuth round-trip goes: app → Supabase → Discord/Google → back to Supabase
> `/auth/v1/callback` → back to your Site URL. If a login "succeeds" but dumps
> you on a blank Supabase page, the Site URL / Redirect URLs here are wrong.

## 5. Wire the frontend to the project

1. In Supabase: **Project Settings → Data API** copy the **Project URL**, and
   **Project Settings → API Keys** copy the **anon / public** key.
2. In `draw-steel-app/`, copy `.env.example` to `.env` and fill both in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...your anon key...
   ```
3. `npm install` then `npm run dev` → open the printed localhost URL. Sign up
   with email, create a campaign, etc. (see the verification list in the plan).

The anon key is meant to be public; RLS is what protects the data. Never put the
`service_role` key in the frontend or in Git.

---

## 6. Deploy to GitHub Pages

1. Create a GitHub repo and push this project (the app lives in `draw-steel-app/`).
2. In the repo: **Settings → Secrets and variables → Actions → New repository
   secret** — add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same
   values as your `.env`.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the app
   and publishes it. The live URL appears under **Settings → Pages**.
5. Make sure that live URL exactly matches the **Site URL** you set in step 4
   (update Supabase if your repo name differs from the example).

> If the repo is not at the user/site root (i.e. it's a project page at
> `/<repo>/`), no extra config is needed — the Vite build uses relative asset
> paths (`base: './'`), so it works at any subpath.
