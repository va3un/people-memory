# Backup and recovery (Phase 6)

Use fictional data until the real-data migration phase has been reviewed. Browser storage and downloaded exports are unencrypted. Keep downloaded files private and outside the browser. Nothing is uploaded by these tools. Optional Dropbox sync is implemented in Phase 9 but disabled until configured/authorized; actual-service verification remains a release blocker. See [sync recovery](DROPBOX_SYNC.md).

## Save a full backup

Open Settings, then Backup now. Save the JSON file, then choose that same file under Verify downloaded backup. Only an exact byte match confirms the download and resets the small 30-day reminder. Starting a download alone cannot prove the browser saved it. A backup contains its snapshot at export time; later changes require another backup. CSV and vCard do not reset this reminder.

The version 1 envelope contains `format: "people-memory"`, `schema: 1`, a UTC `exported_at` and `tables`. The tables are people, contexts, memberships, relationships, photos and captureBatches, including all deleted records. IDs, timestamps, Unicode text, local view history, source batch IDs and JSON capture history are retained. Photos contain their original bytes as base64, metadata and SHA-256. There is no database migration. Device settings, API keys, refresh tokens and sync bookkeeping are excluded. SHA-256 detects corruption, not authenticity or encryption.

## Restore safely

1. Open Settings, Import JSON, and choose a full JSON backup. On a fresh installation, open Restore a JSON backup on About you before creating a new Me profile.
2. Review all six table counts, deleted rows, conflicting IDs and possible duplicate names. No records change during preview. Merge is the default: only new IDs are added; existing versions and deletions are kept even when the file is newer. Different IDs with the same normalized name stay separate and require acknowledgement. Two different active Me profiles block merge. Cancel if uncertain; do not guess which identity to combine.
3. For replacement, choose Replace, download the newly offered safety backup, save it and reselect that exact file to verify it. Type `REPLACE`. An empty incoming dataset will remove the current portable records. Device settings remain on the device. Keep the safety file to recover the previous directory if needed.
4. Tap Import now and keep the app open until it finishes. Imports commit all six tables together. Cancellation, quota failure or an interrupted write rolls back the transaction. The preview can be retried after failure. If any portable record or photo changes after preview, refresh the preview and create a fresh safety backup before replacing.
5. Make a new full backup after import. Verify recovery in a separate test browser with fictional data before relying on the feature for personal records. Never clear a normal browser as a casual acceptance check.

The temporary replacement authorization is lost on reload. A cancelled preview writes no records. Reading back a safety download changes only this app's own backup-reminder metadata; import never applies or clears device settings. Ordinary deletion and Undo retain their existing soft-delete behavior.

## Validation and resource limits

Both export and import validate the full dataset. Version 1 accepts JPEG/PNG photos up to 600 pixels per side, matching the existing app encoder. Actual browser decoding, header dimensions, base64, byte counts and checksums must agree. Corrupt or unsupported data is refused, never silently dropped or partially restored.

Limits: 64 MiB JSON file, 4 MiB per photo, 32 MiB total decoded photos, 50,000 total rows, 1,000 phone/nickname entries per person, one million characters per text field, nesting depth 16 and 500,000 structure nodes. These limits can reject a dataset earlier than the row ceiling; exports apply the same limits as imports so an oversized partial backup is never presented as restorable. Reduce only fictional test data if exercising the limits; do not delete personal records to fit an export.

Unknown fields, device-setting payloads, unsupported future versions, unsafe object keys, duplicate IDs, missing link endpoints, invalid dates/birthdays and multiple active Me identities are refused. Capture history currently supports the existing JSON record fields; unsupported binary or unknown snapshot fields are refused rather than lost. Phase 7 capture uses JSON before/after snapshots compatible with this format. Imports preserve explicit fields rather than inferring names, repairing links or changing IDs. A name is only a warning about uncertain identity.

## Convenience exports

CSV ZIP has four UTF-8 BOM files: people.csv, contexts.csv, memberships.csv and relationships.csv, including deleted rows. Photos and capture history are absent. Arrays use JSON within quoted cells; birthday fields are flattened. Spreadsheet formula prefixes receive a leading apostrophe. Use full JSON for lossless restore.

vCard 3.0 includes active people with nonblank phone numbers, UID, full name, numbers and available email/city/notes. It makes no surname or phone-type guesses. Reserved characters and newlines are escaped; lines fold at 75 UTF-8 bytes without splitting characters. It excludes deleted people. vCard and CSV are export-only, not import/restore formats. Actual Android/Windows Contacts import remains a manual interoperability observation.

## Verification

`npm run typecheck`, `npm test`, `npm run build` and the four `scripts/check-phase*-browser.py` scripts use free tools and fictional fixtures. The Phase 6 script downloads real files from the production build, verifies photo hashes and CSV ZIP contents, tests replacement protection, invalid/future/oversized files, stale-preview rejection, cancellation, and restores the downloaded JSON offline after clearing only its disposable test directory. Every portable field and photo byte is compared; device settings are checked separately. Unit transaction tests inject failures/cancellation after earlier table writes and verify rollback and retry.

Desktop Chromium recovery is an actual file round trip, not a mocked download or mocked photo decoder. Independent PR review remains required for each phase. Under the approved coding-first workflow, all manual acceptance tests, including critical physical-phone backup/restore, Dropbox sync and Airtable migration checks, wait until coding is complete and remain mandatory release blockers. They are not claimed passed. Use fictional data only until real-data safety checks pass. Production deployment requires separate authorization.
