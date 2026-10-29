# Yearly check and monthly backup reminder

Use this checklist to keep People recoverable. This is a procedure, **not a record of passed tests**.
Final manual/device and actual-service checks are still mandatory release blockers. Use only
fictional data until real-data safety checks pass. Phase 11 is intentionally skipped, not completed;
no Airtable-specific importer or migration acceptance is required. Generic JSON recovery and every
other safety gate still apply.

## Every month: save a verified backup

1. Open Settings → Backup and restore → **Backup now**. Save the full JSON file outside the browser
   in a private folder you can find again. Keep an older known-good copy too.
2. Choose **Verify downloaded backup** and select the exact file just saved. Check the displayed
   verified date. The app reminds you when a verified export is missing or over 30 days old.
3. Check Storage in Settings. **Kept by the browser** protects against automatic eviction only.
   **Not guaranteed** or **Not available in this browser** means keep especially careful backups;
   try **Keep my data** if offered. No permission protects against manual clearing, device loss or
   a damaged profile. A local snapshot and Dropbox connection are not independent downloaded backups.

The app has no background calendar/notification service: set your own monthly reminder. An export
is unencrypted. Keep it private; never upload it to this public repository or a support conversation.
CSV ZIP and vCard do not replace a complete JSON backup with photos/history/deleted records.

## Every year: a quick check, then a safe restore rehearsal

The first look takes about five minutes; allow longer for restoring and comparing the complete
fictional fixture. Do not rush a safety test to meet a time target. Use a spare device or disposable
browser profile. Never clear your normal browser's site data or delete working contacts to test.

1. **Look:** Search for a fictional person and a relative/context clue. Open the profile, check its
   photo/relationships and Browse counts. Add/edit another fictional record and try safe Undo.
   Check the version in Settings, OS light/dark and enlarged text, keyboard/focus, installed Android
   and Windows layouts, native photo/file handling, Call/WhatsApp and vCard behavior. Complete the
   full non-Airtable Section 16 checklist, including timed Quick Add and full-day UI observations.
2. **Offline:** after installation finishes, disable network on the test device. Reopen, search,
   browse, add/edit and export a JSON backup. Reconnect and confirm no pending changes disappeared.
   Test an offered app update with an unsaved fictional draft: declining refresh must retain it;
   applying an update after saving must preserve all records and settings.
3. **Restore:** save and verify a fresh full JSON backup. On the separate empty fictional profile,
   choose Restore a JSON backup before creating another Me. Review all counts/duplicates. Test both
   merge and replacement with fictional fixtures; replacement must require its own saved/verified
   safety backup and typed `REPLACE`. Try malformed/future/oversized files and interrupted/cancelled
   operations: existing records must stay intact. Compare photos byte-for-byte, Unicode, contexts,
   memberships, relationships, tombstones and capture history, not just the active-person count.
   API keys, Dropbox tokens, permissions and other device-only settings must remain device-only.
4. **Optional services:** with authorized fictional-data accounts and a permitted network, perform
   the actual free-provider Test with explicit consent, then drafting/review/save/Undo. Copy/paste
   capture must still work without a key or when the provider fails. Check free eligibility without
   enabling billing; stop if a card/payment is requested. For Dropbox follow Appendix B and the
   sync guide: correct account, pre-sync backup, actual phone/PC photo sync, simultaneous edits,
   delete-versus-edit, clock differences, photo deletion, expired/revoked tokens, offline/interrupted
   retry, repeat-sync equality and recoverable conflicts. On a spare fictional device verify full
   fresh-device recovery before any clearing. Unsynced data cannot be recovered from Dropbox.
5. **Privacy and rebuild:** inspect network requests after installation. Core navigation/search/
   local saves/exports must contact no third party. Same-origin hosting/update requests are expected
   and must not contain contacts, photos, passages or credentials. Optional enabled Dropbox and
   explicitly requested AI are the only background/API service paths. Call/WhatsApp are separate
   user-selected hand-offs to the OS/service; never activate them with real data during development.
   Rebuild a clean reviewed commit using [REBUILD.md](REBUILD.md), run all automated checks, and keep
   its commit ID/build archive/checksum privately with your recovery plan. Do not deploy or publish
   a GitHub Release or tag as part of this checklist without separate release authorization.

## Write down evidence, never assume success

Keep a private record of the date, device/OS/browser version, app commit/version, fictional fixture,
backup filenames/checksums, counts and photo comparisons, offline/update behavior, permission result,
provider/Dropbox account label (no tokens), outcomes and unresolved problems. Record permission
simulation and mocked service responses as automated evidence, not actual-service/manual acceptance.
Avoid screenshots of real people and credentials in public reports. Test the build you intend to
use; a later source change may require rechecking affected behavior.

A failure is a reason to keep the old device, original exports and independent backups untouched.
Stop any real-data use/migration or release until data-safety failures are understood and fixed.
Do not silence a conflict, overwrite a recovery copy or clear storage to make a test pass. Do not
mark a deferred/unavailable check passed. If Dropbox/provider setup is missing, leave the optional
service disabled and record the dependency. Local storage, exports and Dropbox content remain
unencrypted. Independent PR review plus all final manual/device and actual-service verification
are required before final acceptance. The v1.0.0 tag, deployment and GitHub Release remain deferred.
