# Production deployment

Configured on 12 September 2026 in the user's Coolify instance.

## Source and build

- Public repository: https://github.com/adamrabi1234/counting-cards
- Branch: `main`
- Initial application commit: `12b2676aa3071f4c80ea606bf1fea4916cfc1a7a`
- CI: https://github.com/adamrabi1234/counting-cards/actions/runs/34652959243
- CI passed all 80 tests, TypeScript/production build, Docker build, container health and SPA deep-route checks.
- Multi-stage Dockerfile: Node.js 24 build, nginx runtime. Container listens on port `8080`.

## Coolify configuration

- Project/application: `counting-cards`
- Environment: `production`
- Server: the existing `localhost` server
- Build pack: Dockerfile, base directory `/`, Dockerfile `/Dockerfile`
- Exposed port: `8080`; no public host-port mapping required
- Automatic domain: https://k8ltlryzwghy6sjfi0ggbda7.92.63.56.110.sslip.io
- HTTP redirects to HTTPS; certificate resolver: Let's Encrypt
- Enabled health check: `GET http://127.0.0.1:8080/healthz`, expected HTTP `200`
- No database, server volume, environment variables or application secrets required.

The public repository is connected directly. Subsequent updates can be deployed with **Deploy** in Coolify after CI passes. A GitHub push webhook has not been configured.

## Observed production verification

- First deployment finished successfully at 00:21:42 Europe/Prague on 12 September 2026.
- Coolify reported **Running (healthy)**. Its container health check passed on the first attempt with exit code `0`.
- The generated HTTPS address opened normally in Brave without a certificate warning.
- Home rendered with self-hosted fonts, classic card illustrations and empty initial progress.
- Direct navigation to `/practice/table` and `/practice/sequence` loaded the correct application screens through nginx's SPA fallback.
- The table dealt real cards, concealed the dealer hole card, reduced the shoe from 312 to 308 cards, showed the correct player total (9 + 10 = 19) and available actions.
- No warning/error console entries were captured during this production smoke check.
- The unfinished table hand was abandoned; the production origin was left on Home without a completed test result or PAO association.

A separate browser navigation to the public `/healthz` URL was blocked by the browser client (`ERR_BLOCKED_BY_CLIENT`), so public browser access to that endpoint was not certified. Container health is independently confirmed by Coolify and the GitHub CI container test. No browser block was bypassed.

## Data and QA scope

Training data is stored in the visitor's browser for this exact origin. It is not stored in the Docker container. Backups are exported/imported through Settings; moving domains does not migrate data automatically.

The [independent test report](thorough-test-report.md) records the tested journeys and remaining real-browser timing/file-transfer verification limits.
