# Shemotion website

Static Shemotion website with Cloudflare Pages Functions and a D1-backed events manager.

## Local setup

1. Run `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and add the Cloudflare Access values for local admin testing.
3. Run `npm run db:migrate:local`.
4. Run `npm run dev` and open the local URL Wrangler prints. The development command builds the static files into `dist/` first.

The public homepage reads published future events from `GET /api/events`. The protected admin is at `/admin/`.

Public routes include static pages and Pages Functions backed by the same D1 event records:

- `/events/` lists upcoming published events.
- `/events/:slug/` renders one published event with canonical metadata and eligible Event JSON-LD.
- `/sitemap.xml` contains the public static routes and published event slugs.
- `/private-groups-retreats/` is a static service-area page.
- `/what-is-feminine-movement-meditation/` is the static educational guide.

The three featured homepage Instagram posts are configured in `shared/instagram-gallery.js` and rendered as static cards during the production build.

Public events use the List view only. The admin retains its calendar and shared `calendar.js` utilities; saved locations, coordinates, Google Maps links and Places search remain available.

The build excludes four unused source photographs (`about-me-pic.jpg`, `cardio-release.jpg`, `cardio.jpg`, `feel.jpg`) from `dist/assets/`. Keep these originals in the repository; remove an exclusion if a photograph is used again.

Event slugs are generated when blank, can be managed in the admin form, and should remain unchanged after an event is published so its URL stays stable.

## Database and deployment

- D1 database: `shemotion-events`
- Pages binding: `DB`
- Apply local migrations: `npm run db:migrate:local`
- Apply production migrations: `npm run db:migrate:remote`
- Run tests: `npm test`
- Deploy: `npm run deploy`

Cloudflare Access must protect `/admin*` and `/api/admin/*`. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in the Pages project environment. The application also validates the Access JWT and restricts admin access to the comma-separated `ADMIN_EMAILS` value.

## Google business search

The Saved Locations manager can search Google Places and copy the selected business name, formatted address, suburb, coordinates and exact Google Maps URL into a location. Manual entry remains available.

1. Enable **Places API (New)** in a billed Google Cloud project.
2. Create a dedicated API key and restrict it to **Places API (New)**.
3. Store it as a Cloudflare Pages secret: `npx wrangler pages secret put GOOGLE_MAPS_API_KEY --project-name shemotion`.

The key is used only by authenticated `/api/admin/places/*` Functions and is never sent to the browser.
