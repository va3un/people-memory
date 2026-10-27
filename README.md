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

Phase 3 is implemented and awaiting independent review and physical-device acceptance. Search currently lists people; clue search, contexts, backup and sync remain later phases. Use fictional data only. Browser storage is unencrypted and can be lost if site data is cleared or the device is lost.

After `npm run build`, `python scripts/check-phase3-browser.py` runs production browser checks using free Python Playwright and Chromium, if installed. The script uses an ephemeral local server and a disposable browser profile with fictional records and generated images. It does not access your normal browser or deploy the app.
