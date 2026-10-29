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
database. Storage and exports are unencrypted. Optional sync and automatic capture need explicit setup/consent; copy/paste capture explains what you share. Call and WhatsApp hand the selected number to your OS/service only when you choose those actions. No contacts are sent by core navigation or local operations.

Licensed under the MIT License.

## Current status and browser checks

Phase 12 coding/hardening is prepared for independent review; this is not final acceptance or a version-1.0 release. Phase 11's Airtable-specific importer is **intentionally skipped, not completed**, under the approved small-dataset decision. Generic JSON backup/import/export and all other safety requirements are retained.

Use fictional data only until real-data safety checks pass. All deferred manual/device testing, full backup/restore safety checks and actual provider/Dropbox service verification remain mandatory release blockers. Mocked responses and browser emulation are automated evidence only. Local/Dropbox storage and exports remain unencrypted. Dropbox is disabled until configured/authorized/enabled; automatic AI capture remains optional and off until consent and a successful Test. Core local features and copy/paste capture work without any API key. This coding pass does not deploy, publish a GitHub Release, create a v1.0.0 tag or import real data.

[PROGRESS.md](PROGRESS.md) records verified outcomes and outstanding release blockers. [REBUILD.md](docs/REBUILD.md) explains clean rebuilds, free browser tools and safe recovery. [YEARLY_CHECK.md](docs/YEARLY_CHECK.md) covers monthly backups and the annual fictional-data restore/device/service checklist. Format and optional-service safeguards are described in [backup/recovery](docs/BACKUP_FORMAT.md), [Dropbox sync](docs/DROPBOX_SYNC.md), [Smart Capture](docs/SMART_CAPTURE.md) and [automatic capture](docs/AUTOMATIC_CAPTURE.md).

After the production build, run every browser script for Phases **3–10 and 12** under `scripts/`; the exact commands and setup are in REBUILD.md. They use ephemeral local servers, disposable browser profiles, generated fictional images and mocked providers/Dropbox. Phase 12 also checks a local ZIP/extracted build, controlled browser-permission outcomes, actual local service-worker install/update/offline behavior and core network privacy. They do not access normal browser records or deploy the app. Automated checks and independent PR review remain mandatory before merge; final manual acceptance remains separate.
