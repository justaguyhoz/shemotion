# Codex Cloud preview workflow

## Verified project and connection

The connected Cloudflare plugin is authenticated and can inspect the existing
`shemotion` Pages project. It is linked to `justaguyhoz/shemotion` through GitHub.
The build command is `npm run build`, output directory `dist`, repository root.
The production branch is `main`; automatic previews are enabled for development
branches. The plugin confirmed successful Git-triggered V2.1 and V2.2 previews.
Missing CLI credentials did not mean the Git deployment integration was absent.

No project settings, account connections or credentials needed changing for V2.3.
No API token needs to be copied into the workspace, repository or GitHub Actions.
No alternate project or account is used.

## Repeatable development preview

1. Verify the requested baseline, remote state and clean working tree. Create a
   dedicated development branch from that baseline, never from an unverified main.
2. Make the requested changes; run `npm test`, `npm run build`, responsive browser
   checks and screenshot review. The cloud runner can additionally expand tests
   with `node --test --test-isolation=none`.
3. Commit and publish only the development branch to GitHub. Its branch event
   triggers the existing Pages build automatically. Do not push main.
4. Through the connected Cloudflare plugin, retrieve the `shemotion` project and
   its deployment list. Use the account selected by the connection; never infer
   another account. Filter to the expected branch **and full commit SHA**.
5. Wait for `latest_stage.name == "deploy"` and `status == "success"`. Require
   `environment == "preview"`. Take the URL from the deployment result, rather
   than guessing a branch alias or treating an old URL as the new deployment.
6. Check the preview URL and assets in an actual browser. Confirm the canonical
   production deployment identifier and commit have not changed. Fetch production
   HTML read-only to check that the public deployment remains unchanged.
7. Deliver the commit, deployment URL and screenshot evidence. Stop for review.

Project/deployment responses can include sensitive environment values. Filter
responses to project name, repository, branch, build settings, deployment stage,
commit and URL. Do not dump environment values, tokens or account identifiers.

## Preview data safety

The existing project's **Preview and Production share D1 and R2 bindings**.
These settings were inspected but not changed. Preview is a deployment environment,
not an isolated copy of the production data. Keep public inspection read-only:
no admin saves, media uploads/deletes, form submissions or migrations on the preview.
Form validation can be checked without a valid submission; use local fixtures and
existing tests for success/error and notification flows. Publication tests must
not insert fictitious records or publish Scout.

If a future task requires preview writes, arrange a separately approved isolated
preview database/bucket and test data first. Do not silently repoint bindings,
copy production credentials or create another account/project.

## If the connection expires or builds stop

Open the Cloudflare plugin connection in ChatGPT and approve its sign-in/permissions
for the account containing the existing `shemotion` project. Stop and request the
user's explicit approval before any new authorisation. The user can also inspect
Cloudflare dashboard → Workers & Pages → shemotion → Settings → Builds, and verify
that GitHub repository `justaguyhoz/shemotion` and development previews remain enabled.
If GitHub App permission is missing, the user must approve repository access in
GitHub's installed Cloudflare Workers and Pages app. Do not reinstall or replace
connections automatically, change the production branch, or run `npm run deploy`.

References:
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/configuration/git-integration/
