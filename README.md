# Sure Seal Production System — Setup Guide

A web app for the Sure Seal plant: confidential formulas, batch scheduling and batch records, receiving, material requests, stocktakes, label artwork, reports, traceability and costing.

It runs on **Supabase** (database, logins, file storage) and **Render** (hosting). There are no per-user licence fees. Shared logins (for example one login on the production tablet) are fine.

Setup takes about 30–45 minutes.

---

## What's in this package

| File | What it is |
|---|---|
| `app/index.html` | The whole app (one page) |
| `app/config.js` | Connection settings. You fill in two values. |
| `database/schema.sql` | Creates the tables, logins and security rules in Supabase |
| `supabase/functions/admin-users/index.ts` | Small server function that lets owners and managers add, reset and remove logins from the app |
| `render.yaml` | Hosting settings for Render |
| `test/` | Test harness used to check the security rules (not needed on the server) |

---

## Step 1 — Set up Supabase (database and logins)

1. Sign in at **supabase.com** and open your project, or create a new one. Choose the **Sydney** region.
2. Go to **SQL Editor → New query**. Paste the whole of `database/schema.sql` and press **Run**. It should finish with "Success". The script is safe to run again later.
3. Go to **Authentication → Sign In / Providers**:
   - Keep **Email** turned on.
   - Turn **off** "Allow new users to sign up". Only you should create logins.
4. Go to **Project Settings → API** and copy:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`);
   - the **anon public** key.
   - **Do not copy or share the `service_role` key.** It bypasses all security.
5. Open `app/config.js` and paste those two values in place of the placeholders.

### Create the first login (the owner)

6. Go to **Authentication → Users → Add user → Create new user**. Enter Kevin's email and a strong password, and tick **Auto Confirm User**.
7. **The first login created automatically becomes the Owner.** Owners can do everything, and are the only people who can see the formulas. After this, you add everyone else from inside the app (Step 3).

### Install the login manager (once)

8. Go to **Edge Functions → Deploy a new function → Via Editor**.
9. Name it exactly `admin-users`. Delete the sample code, paste the whole of `supabase/functions/admin-users/index.ts`, and press **Deploy**.
   - Leave **Verify JWT** turned on. Supabase supplies the keys it needs automatically; you don't paste any keys into it.

---

## Step 2 — Put it online with Render

Render publishes from a Git repository.

1. Create a **private** GitHub repository, for example `sure-seal-production`. Upload the contents of this package: the `app` folder, `render.yaml` and `README.md`. The `test` folder is optional.
2. In **Render**, choose **New → Blueprint**, connect the GitHub repository, and approve. Render reads `render.yaml` and creates a static site that serves the `app` folder.
   - Alternatively: **New → Static Site**, connect the repo, leave the build command empty, and set the publish directory to `app`.
3. Render gives you an address like `https://sure-seal-production.onrender.com`. You can add your own address (for example `production.sureseal.com.au`) under **Settings → Custom Domains**.
4. In **Supabase → Authentication → URL Configuration**, set **Site URL** to that same address.

Open the address, sign in with Kevin's login, and you're in as Owner.

---

## Step 3 — Add the other logins

In the app, open **Setup → Users → Add a login**. Enter a name, their email (or a made-up address for a shared tablet, such as `production@sureseal.com.au`), a role and a temporary password (**Suggest one** makes one up). Give them the login and password; they can change the password under **Account**.

| Role | Can | Cannot |
|---|---|---|
| **Owner** | Everything, including the formula file: view, create, edit and version formulas | — |
| **Manager** | Everything else: planning batches, costs and prices, ingredient names and suppliers, purchasing, forecast, settings, logins (except owners), all reports | Open, edit or export formulas; change owner logins or make anyone an owner |
| **Production** | Batch sheets, QC and release, receiving, requests, stocktake counts, label downloads | See formulas, ingredient names or costs; plan batches; change settings |
| **Warehouse** | Receiving, requests, stocktake counts, dispatch, label downloads | Batch sheets, formulas, costs, settings |
| **Office** | Requests and ordering, expected deliveries, dispatch, reports | Receiving stock, batch sheets, formulas, costs |

These limits are enforced by the **database itself**, not just hidden on screen, so they hold even for someone technical.

- **Formulas and managers.** Managers never see the formula screen, notes, method or version history, and can't change a formula. To plan batches, cost products and run the forecast, the app gives them each formula's ingredient split. A batch sheet always shows how many kg of each material go in, so anyone who can plan or read batches with ingredient names can work out that batch's recipe.
- **Reset a password:** Setup → Users → **Reset password** sets a new temporary one.
- **To stop someone signing in:** untick **Active** (keeps their name on records), or **Remove** to delete the login.
- **Anyone can change their own password** under **Account** (top right).
- **There must always be at least one active Owner.** The system won't let you remove or demote the last one.
- If the login manager isn't installed yet, you can still add a login in Supabase (Authentication → Users → Add user, tick Auto Confirm). It appears in Setup → Users with no access until you give it a role.

---

## Step 4 — Load your data

In this order:
1. **Setup → Branding:** logo and colours.
2. **Setup → Sites:** rename the site if needed.
3. **Setup → Materials:** raw materials, packaging, labels, boxes. Codes are what staff see; names and costs are confidential.
4. **Formulas.**
5. **Setup → Products:** formula, fill weight, packaging, box, stock policy.
6. **Stock → Labels:** label artwork.
7. **Opening stock:** receive current stock lots, or run a first stocktake.

A spreadsheet can be loaded in bulk on request.

---

## Good to know

- **Backups.** Supabase's free plan doesn't include automatic backups. For a business system, use Supabase **Pro** (daily backups), or export regularly under Database → Backups.
- **Free Render plan.** A static site on Render is free and doesn't go to sleep.
- **Updates.** See *Rolling out changes* below. Keep your `config.js`; updates never replace it.
- **Printing.** Batch records, count sheets and reports download as PDFs to print.
- **Live updates.** Changes made on one device appear on others within a few seconds.

## Rolling out changes

Each update comes as a new `app/index.html`, and sometimes a new `database/schema.sql`.

1. **Database first (only when the update includes `schema.sql`, or a new `admin-users` function — redeploy that the same way you installed it).** Supabase → SQL Editor → paste the new `schema.sql` → Run. It only adds what's missing and never deletes data.
2. **Then the app.** Replace `app/index.html` in the GitHub repository (GitHub → the file → Edit or Upload files → Commit). Render redeploys automatically in about a minute.
3. **Check.** Open the site and press Ctrl+F5 (or pull down to refresh on a tablet) so the new version loads.

If Claude is connected to the GitHub repository, it can commit the update to a separate branch and open a pull request. You review and press **Merge**, and Render deploys it. To undo an update, use **Revert** on that pull request in GitHub, or in Render → the site → **Rollback** to the previous deploy.

## Technical notes (for the developer)

- **Static single-page app.** Uses supabase-js v2 (jsDelivr, pinned 2.45.4) and jsPDF 2.5.1 (cdnjs).
- **Storage model.** Each table holds one JSON document per row (`id text`, `data jsonb`). Writes go through two `SECURITY INVOKER` functions, so RLS always applies:
  - `set_doc(table, id, data)`: update, else insert;
  - `merge_doc(table, id, patch)`: deep merge; nested objects merge, arrays replace.
- **Roles** live in `public.profiles.role`. `public.my_role()` is used by every policy.
- **Confidential tables** (`formulas`, `secret_materials`, `secret_products`, `secret_sales`) are readable and writable by `manager` only. `secret_sales` holds the MYOB sales history used by the Forecast tab. If you set the database up before it existed, run `database/schema.sql` again; it only adds what is missing.
- **Artwork and logos** are in the private Storage bucket `artwork`. All roles can read it via signed URLs; only managers can write.
- **Realtime.** Tables are added to the `supabase_realtime` publication. The app also polls every 60 seconds as a fallback.
- **Testing.** `test/` contains the role test: a Flask stand-in for the REST API that runs every query as role `authenticated` with a JWT sub, plus a Playwright script.
