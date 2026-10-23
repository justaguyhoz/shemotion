# Instagram gallery administration

Open `/admin/instagram/` using the existing Shemotion admin login. This page is protected by the same Cloudflare Access checks as the other admin pages.

## Available immediately

The default gallery contains nine real covers and exact post/reel links taken from the public @shemotion.au profile on 23 October 2026, including the Charlotte Pointeaux podcast collaboration displayed on that profile. The individual WebP covers total approximately 272 KB and are stored in `assets/instagram/`; post provenance is in `shared/instagram-posts.js`. No stock images or invented posts are used.

Administrators can replace/upload covers, change real Instagram post links, reorder or remove posts and save the gallery without a deployment. Uploads are resized in the browser to at most 480 × 640 and converted to WebP. The existing authenticated image-upload endpoint validates image type and size. The gallery configuration is stored in the existing R2 binding, separate from event and media records. Manual gallery updates do not need Instagram API credentials.

## Optional automatic refresh

Automatic API access is **not yet configured**. There is no Instagram credential in the current Cloudflare environment, so the refresh button and automatic checkbox are disabled. Public-profile browsing was used once to obtain the current owned-account covers, not as a background scraping integration.

To enable the official connection:

1. Use Meta's Instagram API with Instagram Login for the **@shemotion.au professional account** (Business or Creator). Authorise the account with the required basic media-reading permission, currently `instagram_business_basic`, and obtain a long-lived account access token through the official Meta flow.
2. Store the credential as an encrypted Cloudflare Pages **production secret** named `INSTAGRAM_ACCESS_TOKEN`. Never put it in repository files, browser code, chat messages or an admin input. Redeploy so the Functions receive the secret. The integration uses `graph.instagram.com/v24.0`; an optional `INSTAGRAM_API_VERSION` value can select another supported version. Preview credentials are optional and separate.
3. In Admin → Instagram, use **Refresh from Instagram**. The server verifies that the connected username is `shemotion.au`, fetches up to nine latest posts, downloads real image/video covers into R2 and then publishes the completed gallery.
4. Enable **Automatically check for new posts once a day** and save. The first homepage visit after the 24-hour interval queues a background refresh. This is a visitor-triggered daily check, not a scheduled midnight job. The visitor receives the saved gallery immediately; subsequent requests get the refreshed gallery.

The real Meta connection cannot be end-to-end verified until the account owner authorises it. API behaviour is covered by mocked account, media and CDN responses. Meta access tokens expire or may be revoked; renew them through Meta and replace the Cloudflare secret when required. The implementation does not silently renew account credentials. No Meta app or account permissions have been created on the owner's behalf.

Refresh failures keep the last successful gallery. Errors are shown to administrators, with a 24-hour automatic retry interval. Tokens and signed upstream image URLs are not included in gallery JSON or error messages. A conditional R2 lease prevents concurrent refreshes. Old cover objects are retained so cached pages keep working; retention cleanup can be added if storage becomes material. Automatic refresh replaces manual post selections with the latest account posts.

## Postponed events and Google

Use **Postponed** for an event with no replacement date. Keep **Published** enabled, preserve its slug and original schedule, and keep the original date in the admin form. The public page remains HTTP 200 with its existing canonical URL and sitemap entry. It displays a new-date-to-be-confirmed notice, hides the previous time and booking CTA, and is excluded from upcoming listings. Original event artwork is explicitly labelled as no longer showing a current date.

Event structured data uses `EventPostponed` and retains the original `startDate` as Google recommends when a replacement date is unknown. It contains no booking offer. Once a new date is confirmed, edit this same event and slug, update the schedule and reopen booking as appropriate. **Cancelled** remains available for an actual cancellation and also preserves published detail pages. Unpublishing or deleting a record still deliberately removes public access.

For this release, Afterglow (event 11) is to change from Cancelled to Postponed, without changing publication, slug or schedule. Before rolling back to code older than Postponed support, first set this event back to **Cancelled** so the older booking-state code cannot treat it as bookable. The previous production deployment is `db2617d4-9d9c-4921-8cf6-25fdd74381df`, commit `017ea95ef503763f549fb91abf0dd11d626002c7`. No database migration is required.
