# Rebuild People from source

This guide recreates the app, not your saved people. Coding is finished for review, but this is
**not a released or finally accepted version**. Phase 11 was intentionally skipped because the
dataset is small; no Airtable importer is required. Final device/manual testing, real backup/restore
and actual-service verification still block release. Use fictional data until real-data safety
checks pass. Do not deploy, create a GitHub Release, tag v1.0.0 or import real data during this pass.

## Keep these things separately

- **Source:** this public Git repository, its lock file and the reviewed commit ID. No personal
  exports, photos, tokens or keys belong in it. Do not copy a normal browser profile into Git.
- **App build:** the static files in `dist/`. They contain the program, not the IndexedDB records.
- **Your records:** a full JSON backup saved outside the browser and verified by selecting the
  downloaded file in Settings. JSON includes photos, links, tombstones and capture history.
  CSV ZIP and vCard exports are useful copies, but are not full-restoration backups.
- **Private setup:** optional provider credentials and Dropbox authorization are device-only.
  Backups deliberately exclude them. Keep any necessary private recovery information separately;
  never paste credentials into issues, chat, build commands or source files.

Keep the old app/device and untouched backup files until a restore has been verified. Rebuilding,
reinstalling or requesting persistent storage is not a backup. Losing/clearing a device can lose
unsynced records. Moving to a different hostname, port or browser profile opens a different database.
Keep the existing production origin stable; any move requires a planned, verified export/import.

## Get a clean copy without touching the working app

Use free Git and Node.js **24**, matching GitHub Actions. npm is included with Node. In a terminal:

```sh
git clone https://github.com/va3un/people-memory.git people-memory-rebuild
cd people-memory-rebuild
```

Choose an independently reviewed commit from the PR/history. Record its full ID; do not assume the
newest commit is accepted. Replace `COMMIT_ID` below with that ID (no personal data is needed):

```sh
git switch --detach COMMIT_ID
npm ci
npm run typecheck
npm test
npm run build
```

Stop if a command fails. Keep `package-lock.json`; use `npm ci`, not a blind dependency upgrade.
The build should create `dist/index.html`, hashed assets, the manifest and service-worker files.
The source version stays in `package.json`; rebuilding does not authorize a version-1.0 tag.

For dependency maintenance, run `npm audit` and `npm audit --omit=dev`; report their actual outcomes
rather than calling a nonzero audit a pass. On 29 October 2026 the runtime audit reports no known
advisories. The build serializer was patched to 7.1.4. The full audit still reports four low-severity
entries in the build-only chain for [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4);
no fixed deepmerge version is published at this check. Keep this limitation visible to reviewers.
Do not use a forced audit fix, an unreviewed override or a major dependency upgrade to hide it.

For a local fictional-data preview of this relative-path build:

```sh
npm run preview -- --host 127.0.0.1
```

Open the local URL printed by Vite. Do not double-click `index.html`; service workers need HTTPS or
localhost. A localhost preview has its own empty database. Empty local data does not mean the
normal app lost its records. Stop the server with Ctrl+C when finished.

## Verify the production Pages path and browser regressions

For the existing `/people-memory/` hosting path, build with the same environment as CI. In bash:

```sh
GITHUB_ACTIONS=true GITHUB_REPOSITORY=va3un/people-memory npm run build
```

In Windows PowerShell, in a separate terminal used only for this build:

```powershell
$env:GITHUB_ACTIONS = 'true'
$env:GITHUB_REPOSITORY = 'va3un/people-memory'
npm run build
```

These commands build locally; they do not publish anything. The browser scripts serve this path
using temporary local servers. If previewing with Vite instead, keep the same build environment
and open `/people-memory/`; do not mix an absolute-path build with a differently configured preview.

Browser checks need free Python, Playwright and Chromium. The verified tool version is Playwright
1.62.0; an existing system `chromium` is used when available. Otherwise install Playwright's Chromium
with `python -m playwright install chromium`. Use an isolated Python environment so app dependencies
stay unchanged (Windows activation is `..\people-memory-browser-tools\Scripts\Activate.ps1`):

```sh
python -m venv ../people-memory-browser-tools
# bash: source ../people-memory-browser-tools/bin/activate
python -m pip install playwright==1.62.0
```

After activating that environment, run each command and stop on failure:

```sh
python scripts/check-phase3-browser.py
python scripts/check-phase4-browser.py
python scripts/check-phase5-browser.py
python scripts/check-phase6-browser.py
python scripts/check-phase7-browser.py
python scripts/check-phase8-browser.py
python scripts/check-phase9-browser.py
python scripts/check-phase10-browser.py
python scripts/check-phase12-browser.py
```

All use disposable fictional browser profiles, not your normal records. Provider/Dropbox responses
are mocked where relevant; no paid account or real key is needed. Phase 12 checks real local
service-worker install/update/offline behavior and storage permission outcomes using controlled
browser API responses. These checks do not establish actual Android/Windows or live-service success.
Review GitHub Actions checks and obtain independent PR review as well.

## Save the build without publishing it

An optional local ZIP can preserve a reviewed build. In PowerShell, choose a new filename so an
older archive is not overwritten:

```powershell
Compress-Archive -Path .\dist\* -DestinationPath ..\people-memory-build-COMMIT_ID.zip
```

On other systems, compress the **contents** of `dist/` using the free system ZIP tool. `index.html`
should be at the ZIP root. Keep the reviewed commit ID and SHA-256 checksum with the archive.
An extracted ZIP still needs a static server; it does not contain records or replace a JSON backup.
A review-build ZIP is not a final release. Release attachment, deployment and tagging require later
explicit authorization after the mandatory blockers are resolved.

## Recover records safely, when manual testing is authorized

Use a separate disposable profile and fictional backup first. From first launch choose **Restore a
JSON backup** before creating another Me. Or use Settings → Backup and restore → JSON import.
Check the preview, identities, duplicates and counts. Merge preserves existing entries conservatively;
Replace requires downloading and verifying a safety backup of the current data and typing `REPLACE`.
Do not bypass either safeguard. Keep original files. Current restore bounds include a 64 MiB JSON
file limit and 32 MiB total photo-byte limit; oversize files must be refused, not partly restored.

Compare every person, Unicode name, photo byte, context, membership, relationship, deleted record
and capture-history entry. Confirm device-only settings have not been imported. A downloaded file
hash check alone proves possession, not a successful restoration. See [backup format](BACKUP_FORMAT.md).

Dropbox is optional and disabled until configured, authorized and explicitly enabled. Follow
[Dropbox recovery](DROPBOX_SYNC.md) with fictional data, the correct App key/account and fresh-device
recovery; do not create a second Me or clear the working device to test it. A missing App setup,
blocked network, quota error or missing unsynced record is a blocker, not a successful restore.
Automatic capture is optional; copy/paste and local features work without any API key. See
[automatic capture](AUTOMATIC_CAPTURE.md) for free-only setup/consent and its outstanding live checks.
