# Southwest Site Builders

A responsive marketing site and portfolio for Devante Allen. The full-stack version runs on **Cloudflare Workers + D1**: the Worker validates quote requests and the managed SQL database stores them. A private owner dashboard at `/admin/` lets Devante review, update, and delete leads. The existing GitHub Pages workflow remains as a static fallback while Cloudflare is being set up; only the Cloudflare deployment has the real API and database.

## Why this free-tier setup

Cloudflare Workers Free includes up to 100,000 requests per day. D1 is a managed SQLite-compatible SQL database; its free plan includes 5 million rows read/day, 100,000 rows written/day, and 5 GB of total account storage. The D1 free tier has daily quotas, so requests can fail until the limits reset if the business grows beyond them. See the current [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [D1 pricing and limits](https://developers.cloudflare.com/d1/platform/pricing/).

D1 is SQL, but it is **not PostgreSQL**. If a PostgreSQL-specific requirement comes up later, compare providers before migrating the database.

## Local development

Requires Node.js 22 or newer.

```sh
npm ci
```

Create a local-only Worker secret (the file is git-ignored):

```sh
printf 'ADMIN_TOKEN=%s\n' "$(openssl rand -hex 32)" > .dev.vars
```

Apply the schema to Wrangler's local D1 database and run the app:

```sh
npm run db:migrate:local
npm run dev -- --port 8787
```

Open `http://localhost:8787`. The private dashboard is at `http://localhost:8787/admin/`. Local development uses a local D1 database; it does not touch production data. Test the Worker with `npm test`.

## One-time Cloudflare setup

1. Create a free Cloudflare account and enable a `workers.dev` subdomain in **Workers & Pages**.
2. Authenticate Wrangler locally with `npx wrangler login`, then create the production D1 database:
   ```sh
   npm run db:create
   ```
   Copy the database ID printed by Wrangler into the `database_id` field in `wrangler.jsonc`, replacing the all-zero placeholder. The ID is not a secret; commit it with the code. If you create D1 in the dashboard instead, copy its database ID into the same field.
3. Apply the schema to the remote database:
   ```sh
   npm run db:migrate:remote
   ```
4. Generate an administrator token and keep it private:
   ```sh
   openssl rand -hex 32
   ```
   Use it as `ADMIN_TOKEN`; do not commit it or send it in chat.
5. Create a narrowly scoped Cloudflare account API token for Worker deployment and D1 migrations. Grant **Workers Scripts: Edit** and **D1: Edit**, scoped to the one Cloudflare account.
6. In GitHub, open **Repository Settings → Secrets and variables → Actions**. Add these repository secrets:
   - `CLOUDFLARE_API_TOKEN` — the API token above
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
   - `ADMIN_TOKEN` — the generated administrator token
7. Add the Actions **variable** `CLOUDFLARE_DEPLOY_ENABLED` with value `true`. The GitHub Actions workflow will then apply pending D1 migrations and deploy the Worker on pushes to `main`; you can also run it manually from the Actions tab.

Do not paste Cloudflare tokens into chat or commit them. The deployment URL will be shown by Wrangler and will use your account's `workers.dev` subdomain. The private dashboard URL is that Worker URL followed by `/admin/`.

## Lead form and privacy

The main quote form stores validated inquiries in D1. It requires consent, rejects cross-origin submissions, uses a honeypot and Cloudflare rate limiting, and never logs the submitted contact details. The `/privacy.html` page explains what is collected. The admin API requires a private bearer token; the dashboard keeps that token in memory only and clears it when you sign out or close the tab.

There are **no email notifications** configured. Check `/admin/` for new requests. The portfolio-business contact pages are marked concept demos and do not create leads for Devante's business.

## Fallback site

GitHub Pages still deploys the `public/` site as a static fallback. It cannot run the API or save inquiries; its form displays the email fallback if the Worker API is unavailable. Cloudflare Workers is the full-stack host once its account, D1 database, and GitHub secrets are configured.
