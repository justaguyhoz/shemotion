# Search indexing fix — 22 October 2026

## Cause and changes

Search Console reported `/events/shemotion-at-innerbloom-yoga-surfers-paradise-3/` as a 404. A read-only production query confirmed that the September event still exists, with `is_published = 0`. The public handler intentionally hides unpublished events.

The retired URL now returns a permanent 301 to `https://shemotion.com.au/events/`, including the variant without a trailing slash. This exact exception lives in the event Function: Cloudflare Pages `_redirects` rules do not apply to Function routes. The lookup remains publication-filtered; other drafts and invalid event URLs still return noindex 404s. A published event takes precedence if the administrator deliberately republishes this record. No production records were modified.

An independent investigation found that unknown general URLs returned the homepage with HTTP 200 because Pages enabled its default SPA fallback. The build now generates a top-level `404.html` using the existing public-page shell, noindex metadata and links to Home and Events. This enables genuine 404 responses without changing existing public pages, contact handling, booking, admin authorization or integrations.

The sitemap remains database-backed and excludes unpublished events. All 11 current sitemap URLs returned 200 with matching canonical tags and no indexing blocks during the investigation.

## Validation

- `npm test`: passes (default runner reports 13 file entries).
- `npm test -- --test-isolation=none`: 122 individual tests pass, including retired-event redirect, published-event precedence and existing unpublished-event protection.
- `npm run build` and `git diff --check`: pass.
- Local Pages HTTP checks: both retired URL variants return 301; unknown general, nested, asset and event URLs return 404; public pages, sitemap, robots, assets and public events API return 200; the existing information-page redirect remains 301.
- All 11 local sitemap URLs return 200; the retired URL is absent.
- New 404 page checked at 320, 375, 390, 430, 768 and 1440px, without horizontal overflow and with working recovery links.

[Mobile 404 screenshot](404-mobile.jpg) · [Desktop 404 screenshot](404-desktop.jpg)

## Rollout and Google follow-up

Deploy the review branch first, verify the same checks against Preview, then fast-forward production `main` and verify live responses. The pre-fix production deployment is `903fc4e0-b1cc-4075-9852-8f51f20259db` at commit `cf08e86726b7a8f17097e45eed9fd506ea12d455`, available for rollback. No migration is required.

After deployment, use Search Console's **Validate Fix** on the 404 report. Google must recrawl the retired URL; it may then appear under **Page with redirect**, which is expected. This change does not guarantee indexing of the separately reported discovered/crawled pages. The four core pages shown in the user's screenshot are already indexed.

Cloudflare references: [404 and SPA serving behaviour](https://developers.cloudflare.com/pages/configuration/serving-pages/) · [Function redirect handling](https://developers.cloudflare.com/pages/configuration/redirects/).
