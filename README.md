# Shemotion website

Static Shemotion website with Cloudflare Pages Functions and a D1-backed events manager.

## Local setup

1. Run `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and add the Cloudflare Access values for local admin testing.
3. Run `npm run db:migrate:local`.
4. Run `npm run dev` and open the local URL Wrangler prints. The development command builds the static files into `dist/` first.

The public homepage reads published future events from `GET /api/events`. The protected admin is at `/admin/`.

## Database and deployment

- D1 database: `shemotion-events`
- Pages binding: `DB`
- Apply local migrations: `npm run db:migrate:local`
- Apply production migrations: `npm run db:migrate:remote`
- Run tests: `npm test`
- Deploy: `npm run deploy`

Cloudflare Access must protect `/admin*` and `/api/admin/*`. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in the Pages project environment. The application also validates the Access JWT and restricts admin access to the comma-separated `ADMIN_EMAILS` value.
