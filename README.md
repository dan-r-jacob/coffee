# Brew Notes

A mobile-first app for coffee recipes and brew notes. React, TypeScript, Vite and Tailwind CSS on the front end; Supabase for sign-in and storage. It's hosted on GitHub Pages and installs on an iPhone home screen.

---

## 1. Set up the database (once)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the whole of `supabase/migrations/20261118000000_brew_notes_init.sql` and press **Run**.

The script only creates new tables, functions and security policies. It doesn't change or delete anything that already exists, and it runs as one transaction. If any object already exists, the whole script stops and nothing is changed.

What it creates:

| Object | Purpose |
|---|---|
| `profiles` | Each user's username (created automatically at sign-up) |
| `coffees`, `brewers`, `recipes`, `brew_logs` | Your data. Recipe fields and brew values are stored as JSON, so any field works without code changes |
| Row Level Security on every table | Each person can only read and change their own rows |
| Composite foreign keys | A brew can't point at someone else's coffee or recipe, and a coffee, brewer or recipe that has history can't be deleted (the app offers Archive instead) |
| `username_available`, `email_for_username` | Let the app sign people in with a username |

## 2. Configure Supabase sign-in

In Supabase → **Authentication**:

1. **Sign In / Providers → Email**: make sure Email is enabled. Keep **Confirm email** on (recommended). New users then get a confirmation link before their first sign-in.
2. **URL Configuration**:
   - **Site URL**: your GitHub Pages address, for example `https://YOUR-USERNAME.github.io/YOUR-REPO/`
   - **Redirect URLs**: add the same address.

   Confirmation and password-reset emails link back here.

## 3. Publish on GitHub Pages

1. Upload every file in this folder to your repository's `main` branch. Include the hidden `.github` folder and `package-lock.json`. Don't upload `node_modules` or `dist`.
2. Go to **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to **Settings → Secrets and variables → Actions → Variables** tab and add two repository variables:
   - `VITE_SUPABASE_URL` = `https://omrpcumjkmrccdxluqse.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_zBZm50JfheE3odJZJevPsQ_sBeD8SjS`

   The publishable key is designed to be public. Your data is protected by Row Level Security. Never add the service-role (secret) key anywhere in this project.
4. Open the **Actions** tab and run **Deploy to GitHub Pages**, or push any change. When it finishes, the job shows your app's address.

The workflow assumes the app is served at `https://<user>.github.io/<repository-name>/`. If your repository is named `<user>.github.io`, change `BASE_PATH` in `.github/workflows/deploy.yml` to `/`.

## 4. Add it to your iPhone home screen

1. Open the app's address in **Safari**.
2. Tap **Share → Add to Home Screen → Add**.

It opens full screen with the pour-over brewer icon, and stays signed in between uses.

Email links (account confirmation and password reset) open in Safari rather than the home-screen app:
- **Confirming your account:** after tapping the link, go back to the home-screen app and sign in.
- **Resetting your password:** choose the new password in Safari. Then sign in with it in the home-screen app.

## 5. Signing in with a username

Supabase Auth signs in with an email address. To let people use a username:
- At sign-up, the app stores the username in `profiles` alongside the account.
- At sign-in, it looks up the email that belongs to the username, then signs in with that email and the password.

**Trade-off to be aware of:** `email_for_username` can be called before signing in. Anyone who knows or guesses a username could find out the email address behind it. Passwords and data stay protected. For a personal app this is usually fine. If it isn't for you, the alternative is signing in with email instead of username, which removes that function entirely.

The email address is also used for password resets ("Forgot password?").

## 6. Run it locally (optional)

```bash
npm install
cp .env.example .env.local   # already contains your project URL and publishable key
npm run dev
```

`npm run build` type-checks with TypeScript and builds into `dist/`.

## Project structure

```
src/
  App.tsx                 Sign-in gate, navigation stack, sheets, toasts
  auth/                   Sign in, create account, forgot / reset password, session hook
  data/db.ts              All Supabase reads and writes (database ↔ app mapping)
  data/useAppData.ts      Loads your data and saves changes instantly in the background
  lib/supabase.ts         The single Supabase client (reads the env variables)
  lib/fields.ts           Configurable field types, formatting, brew drafts, steppers
  lib/types.ts, util.ts   Types and helpers
  components/             Shared UI: icons, inputs, sheets
  screens/                Home, Log a brew, History, Brew detail, Logging steps,
                          Coffees / Brewers / Recipes lists and details, Recipe editor
  styles/index.css        Sand and ink design tokens and component styles
supabase/migrations/      Database setup SQL
public/                   Home-screen icons and web app manifest
.github/workflows/        GitHub Pages deployment
```

## How data is kept safe

- Every brew stores a snapshot of the recipe as it was: field names, units, standard values, and coffee and recipe names. Editing or renaming a recipe never changes past brews.
- Coffees, brewers and recipes with history can only be archived, not deleted. Archived items disappear from pickers but stay readable in history.
- Your last coffee, brewer and recipe choice is remembered on each device.
