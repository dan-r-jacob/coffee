# Brew Notes

A mobile-first app for coffee recipes and brew notes, built with React, TypeScript, Vite, Tailwind CSS and Supabase.

This repository is laid out for **GitHub Pages → Deploy from a branch**. The finished app is already built and sits at the top level, so GitHub serves it as-is with no build step.

```
index.html, assets/, icons/,     The built app that GitHub Pages serves.
manifest.webmanifest             Don't edit these by hand.
_config.yml, .nojekyll           Tell GitHub Pages not to process the app or publish the source.
source/                          The editable project (React + TypeScript).
supabase/migrations/             Database setup SQL.
```

---

## 1. Set up the database (once)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the whole of `supabase/migrations/20261118000000_brew_notes_init.sql` and press **Run**.

The script only creates new tables, functions and security policies. It doesn't change or delete anything that already exists, and it runs as one transaction. If any object already exists, the whole script stops and nothing is changed.

## 2. Configure Supabase sign-in

In Supabase → **Authentication**:

1. **Sign In / Providers → Email**: make sure Email is enabled. Keep **Confirm email** on.
2. **URL Configuration**:
   - **Site URL**: `https://YOUR-USERNAME.github.io/YOUR-REPO/`
   - **Redirect URLs**: add `https://YOUR-USERNAME.github.io/YOUR-REPO/**`

   Confirmation and password-reset emails link back here.

## 3. Publish on GitHub Pages

1. Upload everything in this folder to the `main` branch of your repository, keeping the folder structure. The top-level `index.html` must be the one from this folder.
2. Go to **Settings → Pages → Build and deployment**:
   - **Source**: Deploy from a branch
   - **Branch**: `main`, folder `/ (root)`
   - Press **Save**.
3. Wait a minute or two. The address appears at the top of the Pages settings: `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

No repository variables or GitHub Actions are needed. The Supabase address and publishable key are built into the app. The publishable key is designed to be public; your data is protected by Row Level Security. Never put the service-role (secret) key anywhere in this project.

## 4. Add it to your iPhone home screen

1. Open the address in **Safari**.
2. Tap **Share → Add to Home Screen → Add**.

It opens full screen with the pour-over brewer icon, and stays signed in between uses.

Email links (account confirmation and password reset) open in Safari:
- **Confirming your account:** after tapping the link, return to the home-screen app and sign in.
- **Resetting your password:** choose the new password in Safari, then sign in with it in the home-screen app.

## 5. Signing in with a username

Supabase Auth signs in with an email address. To let people use a username:
- At sign-up, the app stores the username alongside the account.
- At sign-in, it looks up the email that belongs to the username, then signs in with that email and the password.

**Trade-off:** that lookup can be made before signing in. Anyone who knows or guesses a username could find out the email address behind it. Passwords and data stay protected.

## Making changes later

The built files at the top level are generated from `source/`. To change the app:

```bash
cd source
npm install
npm run dev      # try it locally
npm run build    # type-checks, then rebuilds index.html and assets/ at the top level
```

Then upload the new top-level `index.html` and `assets/` folder. The Supabase settings used by the build are in `source/.env`, the same values as in `source/.env.example`.

## How data is kept safe

- Every brew stores a snapshot of the recipe as it was. Editing a recipe never changes past brews.
- Coffees, brewers and recipes with history can only be archived, not deleted.
- Row Level Security means each account can only see and change its own data.
