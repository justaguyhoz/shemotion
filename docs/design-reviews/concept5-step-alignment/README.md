# Experience step alignment

Centre the titles and descriptions of all three Shemotion Experience steps on desktop and mobile. The section heading, icons, content and responsive layouts are retained. No backend, admin, API or database changes.

- Production build passed; all 120 existing tests passed. [Test output](test-results.txt).
- Chromium at 320, 375, 390, 430, 768, 1024 and 1440px: all three titles and paragraphs compute to centred alignment, with no horizontal overflow or JavaScript errors. [Results](qa-results.json).
- Visual inspection: [desktop](experience-1440.jpg), [mobile](experience-375.jpg).

Previous production commit: `99f7b5cc2bf662f5478eb9ac49f1dc6b0e5b5592`, deployment `df180cfe-0054-44fd-982d-7e0585128f36`. It remains available for a code-only Cloudflare rollback; no data publication or data rollback is required for this CSS change.
