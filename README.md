# people-memory

Offline-first people memory app (PWA) for one person. Private, works offline, installs on the phone.

## Live app

https://va3un.github.io/people-memory/

## Develop

```bash
npm ci
npm run dev       # local development server
npm run typecheck # TypeScript check
npm test          # unit tests
npm run build     # production build into dist/
```

`npm run icons` regenerates the app icons in `public/`.

The plan for this app is in `docs/ROADMAP.md`. Progress is tracked in `PROGRESS.md`.

## Privacy

The source code is public. The people's data you save is not: it stays in your own browser's
database and is never sent anywhere unless you later turn on sync or smart capture yourself.

Licensed under the MIT License.

## Current status and browser checks

Phase 9 Dropbox sync is implemented for independent review using fictional/mock verification. Live sync is disabled: Appendix B App-key setup and real authorization/service checks remain outstanding. See [Dropbox sync and recovery](docs/DROPBOX_SYNC.md). Code preserves local records, tombstones, photos, capture history, device settings and recoverable conflict variants. Earlier [Smart Capture](docs/SMART_CAPTURE.md), [optional automatic capture](docs/AUTOMATIC_CAPTURE.md), Quick Add, search and [backup/recovery](docs/BACKUP_FORMAT.md) remain available.

Use fictional data only until real-data safety checks pass. Browser storage and downloaded exports are unencrypted. Dropbox sync requires explicit setup/authorization, a pre-sync recovery snapshot and typed enablement; actual-service behavior remains unverified. Automatic AI requests remain off until configured with consent and a successful provider Test; live connectivity is not yet verified. Automated checks and independent PR review remain mandatory per phase. All manual acceptance tests, including backup/restore, Dropbox sync and Airtable migration, are deferred until coding is complete and remain mandatory release blockers, not passed tests.

After `npm run build`, run `python scripts/check-phase3-browser.py`, `python scripts/check-phase4-browser.py`, `python scripts/check-phase5-browser.py`, `python scripts/check-phase6-browser.py`, `python scripts/check-phase7-browser.py` `python scripts/check-phase8-browser.py` and `python scripts/check-phase9-browser.py` using free Python Playwright and Chromium, if installed. The scripts use ephemeral local servers and disposable browser profiles with fictional records/generated images. They do not access your normal browser or deploy the app.
