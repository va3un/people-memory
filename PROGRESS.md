# Latest report
Phase 8 implementation, 29 October 2026, on `feature/phase-8`. Coding and mocked verification pass; independent review and actual-provider verification remain outstanding. All manual acceptance is deferred until coding is complete and remains a mandatory release blocker. No manual test is newly marked passed. Phase 9 has not started.

What was done
- Added optional OpenRouter/Gemini settings with a masked device-only API key, editable model ID, free-account confirmation, enable/disable, explicit Save, Test, reload and key/permission removal. Automatic mode defaults off. Saving settings sends nothing and changing configuration clears prior consent/verification. No model is hard-coded as a permanent free choice.
- Added the exact roadmap notice and explicit consent sheet before the first Test/request for each saved configuration. Cancel sends nothing. Test uses only a fixed fictional passage and creates no directory records. Draft it requires a successful Test and sends only the entered passage plus Phase 7 instructions; it never sends saved people, Me, photos, contexts or device settings. The answer goes through the existing parser, local resolver, editable review, atomic save and conflict-aware Undo.
- Added clear no-key/off, quota/credit-required, rejected-key, unavailable-model, blocked-request, truncated/bad-JSON and oversized-response handling. Every failure offers copy/paste. No automatic retries or paid fallback. Cancel, timeout and changed/removed settings abort or discard pending answers without changing directory records. Provider error bodies/browser exceptions and reflected key content are not exposed.
- Preserved records, Quick Add, copy/paste without keys, photos, contexts/relatives/Me, search, backups and batch Undo. Keys/permissions/verification stay in deviceSettings, excluded from JSON/CSV/vCard and future sync payloads. No data-model/database-version change, new package or existing dependency update. No roadmap modification, deployment, Phase 9, real key or personal data.
- Validation passed: typecheck, all 342 automated tests across 28 files, Pages-base production build and whitespace checks. New regressions cover provider formats/header-only keys, consent/Test gating, fixed Test payload, no directory in prompts, free-only restrictions, reset/stale settings, safe error mapping, reflected-key rejection, response bounds, timeout/cancellation, late replies, duplicate requests, revocation, failed verification persistence and key exclusion from backups.
- All six production browser suites for Phases 3–8 passed. The Phase 8 suite uses intercepted providers and fictional keys, testing off/no-key/free-only behavior, consent cancellation with zero requests, one-time consent, both request formats, shared review/save, data preservation, quota/bad-JSON/blocked fallbacks, cancellation, cross-tab removal and offline copy/paste. Earlier actual browser regressions, including photo backup/restore and capture save/Undo, passed. No uncaught page errors, CSP violations or unplanned external requests occurred. Mocked-provider calls do not establish live connectivity.
- The production CSP permits only the two provider API origins in addition to self for connections. Requests omit cookies/referrers, refuse redirects and disable caching; no external scripts/fonts/analytics were added. Implementation/recovery details and current official references are in [Automatic capture](docs/AUTOMATIC_CAPTURE.md). Review-branch GitHub Actions result will be recorded after push.

Please test (after coding is complete; mandatory release blockers, not passed tests)
1. In a disposable test profile, Settings → Optional automatic capture → choose a provider, enter a free key and a currently free model, confirm no payment method/credits/billing, enable and Save. Tap Test → Cancel consent: confirm zero provider requests. Tap Test again → explicitly agree to the displayed fictional test. Confirm Test genuinely succeeds in that browser. If free access/network/model is unavailable, keep Mode A; never upgrade or add billing.
2. Add → enter the fictional Sanket passage → Draft it → review/edit/skip → Save → Undo. Confirm local Me-school/college resolution, surname safeguards, relationship directions and Tarika search. Remove the provider key and verify copy/paste works without it. Test quota/model/network failures, cancellation and consent after configuration changes.
3. Final physical-phone/desktop acceptance remains blocked on all earlier unverified checks: installed/offline reopening, storage, photos/edit/delete/Undo, contexts/relatives/Browse/search, accessibility/system text/light/dark, under-20-second Quick Add, Windows Call/WhatsApp and actual vCard interoperability. Previously verified Phase 3 core acceptance is preserved; automation does not pass these deferred observations.
4. Critical Android backup/download/file-picker → full restore/equality and replacement/malformed/oversized/cancellation safeguards remain mandatory release checks. Use separate disposable fictional-data profiles only; never casually clear normal data.
5. All later manual Dropbox multi-device sync/conflict/recovery and Airtable mapping/migration/no-loss safeguards, plus remaining roadmap manual checklists, remain mandatory release blockers once coding is complete. Use fictional data only until real-data safety checks pass. None is implemented or passed by this phase.

Decisions I made
- Required a successful Test before Draft it so an unverified/blocked provider leaves copy/paste as the available route. Consent is tied to the current saved provider/key/model configuration and reset on change. Saving or opening settings, typing, reconnecting and focus never send a request.
- OpenRouter accepts only exact :free IDs or openrouter/free, with no paid model/plugin/fallback route. Gemini requires an eligible free model and explicit confirmation that billing is disabled; the app cannot independently inspect the account’s billing status. Official free-tier/model availability was checked in documentation, not assumed permanent. No paid plan, purchase or upgrade is offered.
- Used fixed HTTPS REST endpoints without an SDK/backend. Bounded responses to 512 KiB, capture JSON to 256 KiB and output to 8,192 tokens, with a 45-second abort and one in-flight request per app page. Raw provider/storage errors are replaced with fixed messages. Test and drafting cannot directly save directory records.
- Followed the existing coding-first workflow without modifying the roadmap. Manual tests remain release blockers. A real call cannot be replaced by an intercepted browser response or fabricated key; the incomplete live check is recorded explicitly.

Need from you
- Genuine verification dependency: no API key is available in this environment, whose enforced network policy also excludes openrouter.ai and generativelanguage.googleapis.com. A free key entered privately in the app and a browser/network allowed to reach the selected provider are needed for the required live Test. Do not send a key in chat or put it in GitHub. This live check/manual acceptance remains a release blocker; coding and independent review can be evaluated now. Phase 9 requires a separate instruction.

# Previous report: Phase 7 implementation
Phase 7 implementation, 29 October 2026, on `feature/phase-7`. Automated checks pass; independent PR review is pending. All manual acceptance is deferred until coding is complete and remains a mandatory release blocker. No manual check is newly recorded as passed. Phase 8 has not started.

What was done
- Updated only roadmap workflow sections 1.2 and 14 to the newly approved coding-first process. Automated tests, typecheck, production build and independent review remain mandatory per phase; every manual acceptance test, including critical backup/restore, Dropbox sync and Airtable migration, is deferred until coding is complete and blocks release. Fictional data only until real-data safety checks pass. All other roadmap requirements are unchanged.
- Implemented Smart Capture as the default Add screen, with the existing Quick Add form still available and context-prefilled Add person here preserved. Copy prompt shows the exact sharing notice first and includes only instructions and the passage, never the saved directory/Me/device settings. Clipboard failure offers manual copy; no provider or automatic external request exists.
- Added bounded schema-1 parsing of fenced/prose-wrapped JSON, local normalized/alias/close-name matching, explicit person-identity choices, Me-context resolution and ambiguity/missing-context controls. No directory data is written during parsing/review. Unknown fields are ignored; malformed, oversized, incompatible and invalid-reference answers are refused.
- Added editable person cards, skip controls, visible guesses/uncertainty, context/membership review, relationship sentences with endpoint/type edit and exclusion, and accurate selected people/link counts. Existing-person cards preview conservative fills and optional appended notes. No filled field or array is replaced. Surname suggestions default off, require a separate review opt-in and offer one-tap revert; maiden names require confirmation and names absent from the passage cannot be silently saved.
- Added atomic batch saving with raw passage and compatible before/after audit snapshots. Late write failure rolls back every record and audit row, retains the review and permits retry. Stale reviews and repeated saves are refused. The toast and persistent capture history offer Undo after navigation/reload. Undo soft-deletes created records and restores only safe fills while preserving unrelated later fields/view history. Any later edit/link conflict keeps the entire current directory intact and offers Keep current data or manual review.
- Validation passed: typecheck, all 314 tests across 27 files, production build with the Pages base path, and whitespace checks. Regressions cover all five roadmap golden examples, Me school/college resolution, Unicode/aliases/typos, surname safeguards, malformed input, safe fills/notes opt-out, skipped links, duplicate/reverse links, atomic save and Undo failure/retry, stale reviews, later edits/photos/links, and capture-history JSON backup/restore followed by Undo.
- Production Chromium suites for Phases 3–7 pass using disposable browser profiles and fictional fixtures. Phase 7 checks actual clipboard content/privacy, malformed-answer refusal, local resolution, edit/skip/discard, a late native IndexedDB failure and retry, immediate search updates, persistent safe/conflicting Undo, surname opt-in/revert, offline resolution, Quick Add access, and desktop large-font/dark/reduced-motion layout. Earlier suites preserve people/photo/edit/delete/Undo, contexts/relatives/Me, 2,000-person search and actual offline JSON/photo restore. Tested flows had no uncaught page errors, CSP violations or third-party requests. Desktop font emulation is not a passed system-text phone test.
- No deployment, Phase 8, new package, data-model/database-version change, personal data, paid service or external chatbot call. Storage/exports remain unencrypted; Dropbox sync remains unavailable. GitHub Actions Pull request checks passed clean npm ci, typecheck, all 314 tests and production build ([run 40823246837](https://github.com/va3un/people-memory/actions/runs/40823246837)). Review: [PR #6](https://github.com/va3un/people-memory/pull/6). See [Smart Capture](docs/SMART_CAPTURE.md) and [backup/recovery](docs/BACKUP_FORMAT.md).

Please test (after coding is complete; all are mandatory release blockers, not passed tests)
1. Actual-chatbot capture: Add → enter the fictional Sanket passage → Copy prompt after reading the notice → paste into a chosen chatbot → paste its JSON answer → Read it. Review/edit/skip, save, Undo, save again, then Search → Tarika. Confirm correct people/links, default unchanged surnames and Me school/college resolution. Also verify ambiguous/missing contexts and explicit surname opt-in/revert.
2. Android recovery in separate disposable test profiles only: Settings → Backup now → save → Verify downloaded backup. Restore that fictional file from About you → Restore a JSON backup in another disposable profile. Verify all people/photos/contexts/links, malformed-file refusal, replacement backup verification and typed REPLACE. Do not clear normal or real data. Include OS file picker/download behavior and realistic import-size limits.
3. Final phone/UI checks from the earlier phase reports: installed/offline reopening, persistent storage, add/edit/photos, relatives/contexts/Browse/search, light/dark mode, enlarged system text, keyboard/accessibility, under-20-second Quick Add and Windows Call/WhatsApp handling. Include actual Android/Windows vCard interoperability. Previously confirmed Phase 3 core tests remain passed; unverified observations remain blockers.
4. Once Dropbox coding is complete, perform the roadmap's actual-service multi-device sign-in, sync, concurrent edit/delete/photo conflict recovery, interrupted operations, token expiry and repeat-sync checks. These future manual checks are release blockers, not implemented or passed in Phase 7.
5. Once migration coding is complete, perform the roadmap's Airtable mapping/count/photo/link/direction, duplicate, recovery and no-loss safeguards before any real-data use. Keep all coding fixtures fictional until real-data safety checks pass. Full migration/release remains blocked by these checks and every other uncompleted manual acceptance item in the roadmap, including later-phase checklists.

Decisions I made
- Kept the existing database/schema and backup format. Every capture uses the existing captureBatches/source_batch_id/snapshot fields. No runtime dependencies were added; temporary free Prettier 3.6.2 formatted source only.
- Exact names still require explicit existing/new selection when a candidate exists. Existing filled values are preserved even when the AI disagrees. Context matches may reuse one exact Me membership, with a guessed badge; multiple candidates require a choice. New/reverse duplicate links reuse one row.
- Saved all directory changes and batch history in one transaction. Unsafe Undo is all-or-nothing for directory data; it marks the batch undo_conflict for review without deleting safe records opportunistically. History retains a recoverable record of saved, undone and conflicted batches.
- The approved workflow defers manual timing, not release requirements or data-safety rules. Historical report wording below is retained as history; this report and the current roadmap govern progression. Use fictional data only. A genuine missing credential/account/action dependency will still be reported rather than silently skipped.

Need from you
- No user action blocks Phase 7 coding. Independent PR review remains required before another coding phase; all manual checks above wait until coding is complete and block release. Phase 8 requires a separate instruction.

# Previous report: Phase 6 implementation
Phase 6 implementation, 28 October 2026, on `feature/phase-6`. Implementation and local automated/browser checks are complete. Independent review and critical Android backup/restore acceptance remain pending. Phase 7 has not started.

What was done
- Added full versioned JSON backups with every portable record, photo bytes, contexts, memberships, relationships, capture history and tombstones. API keys, tokens and all device settings are excluded. Existing Phase 3–5 records, schema, IDs and functionality are preserved.
- Added separate people/context/membership/relationship CSVs in one ZIP and vCard 3.0 for active people with phone numbers. CSV cells protect against formula injection; Unicode, quotes and line breaks are preserved. These convenience exports are not full restore formats.
- Added read-only JSON validation and count/duplicate previews, default merge, guarded replacement, cancellation and retry. Merge retains existing ID versions and deletions; same-name different IDs require acknowledgement. Replacement requires a newly downloaded safety backup, exact-file read-back verification and typed REPLACE. Stale previews, invalid data and two-Me merges are refused. All six portable tables commit in one transaction; device settings are never imported or cleared.
- Added first-launch restore before creating Me, a visible Backup now action and a quiet 30-day notice based only on a verified saved JSON snapshot. Fixed the draft guard so saving the mandatory safety backup preserves the preview.
- Validation passed: typecheck, all 281 tests across 25 files, production build for the Pages base path, and whitespace checks. New tests cover full export → test-only wipe → restore → equality, all photo bytes, Unicode, capture history, tombstones, linked merge, settings protection, duplicate handling, malformed/future/oversized content, corrupt photos, stale previews, download failures, cancellation, quota rollback and retry.
- All four production Chromium scripts passed. Phase 6 exercised actual JSON/CSV ZIP/vCard downloads and file selection, checksum and image decoding, exact data equality after replacement, and a downloaded-file restore from first launch while offline. A real IndexedDB write failure was injected after earlier replacement writes: the entire old dataset survived, then retry succeeded. Corrupt image data with a valid checksum was refused by the actual decoder. Earlier Phase 3–5 browser regressions also passed, including the 2,000-person search. No uncaught page errors, CSP violations or third-party requests occurred in the tested flows.
- All fixtures and images are fictional/generated. Local data and exports remain unencrypted. Dropbox sync remains unavailable. No deployment, roadmap modification, database migration or Phase 7 work occurred. The GitHub Actions Pull request checks workflow passed: clean npm ci, typecheck, all 281 tests and production build ([run 40638985664](https://github.com/va3un/people-memory/actions/runs/40638985664)). Review: [PR #5](https://github.com/va3un/people-memory/pull/5).

Please test (critical recovery check remains an acceptance gate, not a routine deferral)
1. In a separate Android test browser/profile with fictional records only, open Settings → Backup now. Save the JSON, then Verify downloaded backup → choose that file. Keep it outside browser storage. Do not clear your normal app or any personal records.
2. In another disposable Android browser/profile, open About you → Restore a JSON backup → choose the saved JSON → review counts → Import now. Confirm every fictional person, visible photo, context and relationship returned. This critical physical-phone restore is not claimed passed by desktop automation.
3. In that disposable test directory, open Settings → Import JSON, choose malformed JSON and confirm refusal. Choose a valid backup → Replace: Import now must remain disabled until Download safety backup → save it → Verify safety backup → choose that exact file → type REPLACE. Cancel the preview if you do not intend replacement.
4. For routine final testing, inspect backup controls with enlarged system text, light/dark mode and keyboard navigation. Android/Windows Contacts import of the fictional vCard is also unverified. Earlier under-20-second quick add and Windows Call/WhatsApp observations remain outstanding.

Decisions I made
- Added fflate@0.8.3 solely for the required offline CSV ZIP. No paid service, backend or existing dependency update was introduced.
- Never guess whether different IDs represent one person, overwrite a conflicting local record on merge, remove tombstones or copy device secrets. Replacement restores the file dataset exactly and preserves device settings. Preview/backup capabilities expire on reload and cannot be reused after a successful import.
- A clicked download does not prove saving. Re-selecting the exact fresh file verifies possession before replacement and resets the reminder. Only full JSON qualifies. Snapshots exclude later changes; a changed dataset requires a new preview and safety backup.
- Bounded imports to 64 MiB JSON, 32 MiB decoded photos, 4 MiB per photo, 600 pixels per side, 50,000 rows plus structural limits. JPEG/PNG match the current app encoder. Unsupported/unknown content is refused rather than silently lost. Export applies matching validation so no oversized partial backup is presented as restorable. Details: [Backup and recovery](docs/BACKUP_FORMAT.md).

Need from you
- Independent PR review and the critical Android fictional backup/restore rehearsal above are required before accepting Phase 6. Routine UI observations may wait for final testing. No routine technical decision blocks review; Phase 7 requires a separate instruction.

# Previous report: Phase 5 implementation
Phase 5 implementation, 28 October 2026, on `feature/phase-5`. Automated and browser checks pass; independent PR review is pending. Routine phone/UI acceptance remains deferred until final testing, not recorded as passed. Phase 6 has not started.

What was done
- Updated only the testing-workflow paragraphs in roadmap sections 1.2 and 14, as approved: automated tests, typecheck, build and independent PR review are required per phase; routine phone/UI checks may be deferred and tracked; critical backup/restore, Dropbox sync and real-data migration checks must pass before those features are accepted. All other roadmap requirements remain unchanged.
- Added MiniSearch with prefix and small-typo tolerance, case/Latin-accent/spacing normalization, Devanagari support, and AND matching across multiple clues. Search covers names, nicknames, maiden names, digit-normalized phones, city, category, how-I-know, notes, active context names/roles and directly related names with directional labels. No relatives-of-relatives are indexed, and Me stays hidden from results.
- Added explicit result ranking and a saved-fact explanation on each photo/initials card, including Husband of Meera Joshi, Colleague at Lionbridge and the society/group examples. Maiden-name explanations require an existing maiden_name; no names or relationships are inferred.
- The index is created in memory at app startup and refreshed from committed changes, including other tabs. It is never stored in IndexedDB or exported. Visible cards load their own local thumbnails instead of loading every photo into the text index. Search results and the newest-first people list offer Show more pagination.
- Empty search shows recently viewed people, recently added people and popular-context shortcuts. Profile views update only the existing local-only last_viewed_at field. Contact IDs, content and edit timestamps are preserved. Editing, deletion, Undo and fixture protection distinguish view history from contact edits, retaining stale-write/conflict protection for actual edits.
- Added minisearch@7.2.0 for the roadmap-required in-memory search engine, with an exact version and lockfile. All previously pinned package versions and platform metadata are unchanged. No database schema/version change or migration was introduced. Phase 3/4 people, photos, contexts, memberships, relative links, Me setup and Undo remain intact.
- Validation: typecheck, all 231 tests across 22 files, the production build with the GitHub Pages base path, and whitespace checks passed. Tests cover all nine roadmap Search scenarios, ranking, Unicode, prefixes/typos, phone formatting, one-hop boundaries, deleted endpoints, reactive updates, safe local history, pagination, escaped text and a 2,000-person fictional dataset.
- All three production browser scripts passed: Phase 3 regression, Phase 4 regression and Phase 5 search. Phase 5 checks include roadmap clues, live cross-tab name/alias/membership/relative updates, delete/Undo refresh, recents, local photo thumbnails, offline reopen/add/search, and a 2,000-person lookup and pagination. The successful search rehearsal measured a 138 ms lookup on the synthetic 2,000-person dataset. This is an automated Chromium measurement, not physical-phone acceptance. No uncaught page errors, CSP violations or third-party requests occurred in the tested flows.
- No deployment was performed. All fixtures are fictional. Backup/export, sync and real-data migration remain unimplemented later-phase work with the newly documented critical acceptance gates.

Please test (routine phone/UI checks deferred until final testing; not claimed passed)

1. With fictional sample records, try Meera, meera husband, Lionbridge, Sagar Heights, 7B and मीरा. Confirm the right people and clear explanation lines on the phone.
2. Open a result, return to Search, clear the query and check Recently viewed and the context shortcuts. Edit a fictional person or add a relative/context and confirm search reflects the changes.
3. After an online load, reopen the installed app in airplane mode. Search, add and edit fictional people, then search again. Check readability and layout with enlarged system text and light/dark mode.

The earlier under-20-second quick-add target and Windows Call/WhatsApp observations remain outstanding below. Their deferral does not mean those checks passed. Critical backup/restore, Dropbox sync and real-data migration checks are not covered by this routine deferral.

Decisions I made
- Kept search read-only apart from the explicitly local view-history field. Local viewing cannot refresh updated_at, overwrite a newer view during an edit, invalidate an otherwise safe edit/delete, or bypass protection against a later contact change.
- Ranking prioritizes own-name matches, then nickname/maiden/phone matches, directly related people, contexts and other details/notes. Matching is keyword-based with all meaningful query words required; no natural-language parser or later-phase capture feature was added.
- Recently added retains access to every ordinary person through Show more; the initial display is bounded for responsiveness. Context shortcuts count distinct active ordinary members and open the existing context detail page. Index refreshes do not require connectivity or an AI/provider account.
- Used the existing normalization and relationship wording modules. All other roadmap requirements, storage/privacy limitations, existing records and deferred acceptance observations remain in force.

Need from you
- Independent PR review is required before Phase 5 acceptance. Routine phone/UI observations remain queued for final testing under the approved hybrid workflow. Phase 6 requires a separate instruction and has not started.

# Previous report: Phase 4 implementation
Phase 4 implementation, 28 October 2026. All Phase 4 tasks are implemented on `feature/phase-4` and locally verified. Independent review and physical-phone acceptance remain pending. Phase 5 has not started.

What was done
- Added a context picker and creator in bottom sheets inside Quick add and profiles. Choices include kind, optional city, role and period. Quick-add contexts remain drafts until the person save succeeds; cancelling a sheet writes nothing. Profile linking commits the context and membership together.
- Replaced the Browse placeholder with live Contexts and Categories tabs and member counts. Context detail lists each active member once with their roles and periods, and Add person here preselects the context in Quick add. Category detail lists matching ordinary people.
- Added the Add relative sheet: choose an existing person or create a fictional new one, choose a relationship type and inspect a direction sentence before saving. New person plus relationship save atomically. Repeating the same link from either direction reuses one row; the reverse display uses the existing domain labels. Profiles now show Family and relatives and Known through.
- Added first-run About you setup for a fictional Me name with optional school, college, workplace, society, group or place contexts. Existing people, photos, links, IDs and timestamps are preserved. Me appears in Settings and linked context details while remaining hidden from the normal people list. Existing active Me profiles skip setup; concurrent setup cannot create two Me profiles. Fixture loading cannot introduce a second Me.
- Preserved the Phase 3 quick-add, photo, edit, stale-write protection and delete/10-second Undo flows. Me is edited rather than deleted from its profile, maintaining the single active Me identity. Photo controls were extracted into a reusable component without changing encoding or limits.
- Used the existing schema and database version; no migration, wipe, new runtime package or dependency update. Existing privacy notices, local-storage limits and unavailable backups remain. Temporary Prettier 3.6.2 was used only to format changed source files.
- Validation passed: typecheck, all 197 tests across 18 files, production build with the GitHub Pages base path, and git diff whitespace checks. New regressions cover Phase 3 record/photo/link preservation, atomic rollback and retry, concurrent Me setup, duplicate/reverse links, membership counts, tombstones, context selection, rapid relative-save taps, first-run UI and context preselection.
- Both production Chromium scripts passed: `scripts/check-phase3-browser.py` and `scripts/check-phase4-browser.py`. Checks include existing data preservation, optional Me contexts, reciprocal Husband/Wife labels with one spouse row, new relatives, profile context roles, cancellation without writes, Browse counts, Add person here, categories, offline reopen/context creation and no repeated onboarding. The tested flows had no uncaught page errors, CSP violations or third-party requests.
- An installed-app update from the merged Phase 3 build to Phase 4 was also rehearsed on a disposable origin. First-run Me setup preserved the existing fictional person record exactly, retained its profile URL, and supported repeated offline reloads without repeated setup or an update loop.
- No deployment was performed. The review branch runs the existing free GitHub Actions checks; production publishing remains gated on a separately approved merge.

Please test (fictional data only, after review and an authorized deployment)
1. In a separate test browser/profile, open the app, enter a fictional name on About you, optionally Add a context, then Continue. Confirm existing Phase 3 people remain. If an existing Me skips setup, open Settings, then Open your Me profile; do not clear existing data to force setup.
2. Open a fictional person, tap Add relative, choose or create another fictional person, choose Spouse, inspect the sentence and Save relationship. Open both profiles and verify Husband/Wife where the corresponding genders are set; unknown gender should show Spouse.
3. On a profile tap Add to a context, then Create context. Enter a fictional school or society, its kind and a role, then Use this context. Confirm it appears under Known through. Reopen the picker and Cancel a new draft; confirm no extra context appears.
4. Tap Browse, open the context, check member roles/counts, then Add person here and save a fictional person. Confirm the new member appears in that context. Tap Categories to inspect the category counts and member list.
5. After an online load, reopen the app in airplane mode. Confirm Me setup does not repeat and profiles, Browse, context creation and relative creation work. Do not delete or reset existing data during this check.

Decisions I made
- Setup creates a new Me record without silently converting or merging an existing ordinary person. All new multi-record operations use transactions on existing tables, and failed operations retain the draft for retry.
- Existing Me profiles are respected. Me deletion from its profile is prevented; name and other details remain editable. Sample loading omits a conflicting sample Me and its fixture links instead of modifying the existing Me or other people.
- Exact normalized context name/kind/city matches are reused without overwriting stored context notes. Identical person/context/role/period memberships are idempotent; distinct roles or periods remain separate. Context counts include Me and count people once, regardless of multiple roles.
- Category browsing groups assigned free-text categories, excluding Me and deleted people. No MiniSearch index, clue matching, recents, Smart capture or other Phase 5/later work was added.

Need from you
- Independent PR review and the Phase 4 phone checks above are still needed before accepting this phase. No technical decision blocks the implementation. Phase 5 must wait for a separate instruction.

# Previous report: Phase 3 acceptance
Phase 3 accepted, 27 October 2026. Varun confirmed that code review and manual tests of Phase 3 core functionality on desktop and Android passed. Acceptance covers the verified core functionality, not every item in the original manual checklist. The implementation was merged in [PR #1](https://github.com/va3un/people-memory/pull/1). Phase 4 has not started.

What was done
- Added a reactive newest-first people list, profiles, editing, photo display/replacement/removal, contact actions, and optional details including birthday with an optional year.
- Quick add supports all existing relationship types with an explicit direction sentence. One stored link displays reciprocal labels on the two profiles. This does not add the Phase 4 Add relative sheet, context management, Browse implementation or Me onboarding.
- Person, photo and quick-add relationship writes now commit in one IndexedDB transaction. Image processing and validation finish before the transaction. Failed saves retain the draft and show an accessible error; retry does not leave a partial person. Blank names and invalid birthdays are rejected. Successful quick adds reset the form to prevent accidental duplicate saves.
- Edits preserve record IDs, creation times, unedited fields and the existing database schema. Stale edits/deletes from another tab are rejected. Deletion soft-deletes the person, retains photos and links, and offers Undo for 10 seconds. Undo checks its deadline and refuses to overwrite subsequent changes.
- Photos are locally encoded as JPEG at quality 0.8 and at most 600 pixels on the long side. Added input/dimension limits, a processing timeout, white transparency background, decode/encode failure recovery, and object-URL cleanup.
- Increased small-button/tab targets to 48 pixels, improved form labels and text scaling, and added modal focus trapping/restoration. App links, reloads and update prompts warn before discarding a draft.
- Storage notices explain unencrypted local data and the absence of backup. Added a production-only Content Security Policy. Edited sample fixtures, unknown prefixed IDs, and samples used by new photos/links are protected from sample deletion. Loading samples no longer resurrects edited deleted fixtures.
- Fixed composed/decomposed Latin accent matching while keeping Devanagari intact.
- Added a branch/PR CI workflow for typecheck, tests and build with read-only repository permissions and no deployment. The existing main-branch Pages deployment workflow is unchanged.
- Validation: typecheck passed; 172 tests across 15 files passed; the GitHub Pages-path production build passed. Regression coverage includes transaction rollback, retry, stale edits, photo failures/cleanup, sample safety, reciprocal labels, profile/list/editor integration, Undo expiry and draft protection during updates.
- Production Chromium checks cover corrupt-photo recovery, real PNG-to-JPEG conversion, photo replacement/removal, quick add, birthday, profiles/editing, one-row reciprocal links, keyboard focus, delete/Undo and its real deadline, concurrent editing, newest-first listing, offline reopening/add/edit, dark mode, reduced motion and CSP. No uncaught page errors or third-party requests occurred in the tested core flow. The repeatable check is `python scripts/check-phase3-browser.py` after building, with free Python Playwright and Chromium available.
- A prompted upgrade from the previously audited build preserved its saved fictional record. Repeated offline reloads after the upgrade passed without a blank screen or update loop.
- No npm dependencies were added or upgraded. The available Python Playwright/Chromium tools supplied browser checks; temporary Prettier 3.6.2 formatted changed source files without changing the lockfile.

Manual acceptance (user-confirmed results, 27 October 2026)

- Passed: code review and manual tests of Phase 3 core functionality on desktop and Android, as confirmed by Varun. Phase 3 remains accepted for that verified core functionality.
- No new manual test run was performed for this documentation update. A passing core test report does not establish that every item in the original checklist was verified.

Outstanding acceptance observations (not explicitly verified)

1. Enlarged system text: confirm that the app remains readable and usable with an increased system font size.
2. Under-20-second quick add: measure adding a fictional person with a photo against the roadmap target; no verified timing result is recorded.
3. Windows Call/WhatsApp handling: verify how Windows handles those actions without contacting anyone. Desktop browser testing alone does not verify operating-system integration.

These observations remain open; they are not recorded as passed or as confirmed defects.

Decisions I made
- Kept all schema versions, tables, fields, existing photo IDs and fixtures compatible. Replacements reuse an existing photo row; removals use tombstones. No data-model migration was introduced.
- Kept photos and relationships when soft-deleting a person so Undo cannot lose them. Views exclude deleted endpoints. The Undo deadline is enforced even if a browser pauses the toast timer.
- Chose 20 MB input and 40-million-pixel limits plus a 15-second image timeout to bound photo processing. The UI explains failures and lets the user remove or replace the photo before retrying.
- Kept Phase 4 context/Me/relationship-management features and Phase 5 clue search out of this change. Existing quick-add links can be viewed in both directions, as requested for Phase 3 stabilization.

Need from you
- Phase 3 remains accepted for its verified core functionality. The three outstanding acceptance observations above still need explicit verification. Phase 4 has not started; this documentation update does not authorize starting it.

# Superseded report: partial Phase 3
This earlier completion claim was incorrect. The people list, profile, editing and delete/Undo were still missing at that point.

Phase 3 is built. The Add screen now lets you add a photo and quickly link a new person to someone you already know.

What was done
- Added `src/lib/image.ts` with `shrinkImage()`, a canvas-based helper that shrinks a picked JPEG to at most 600px on its long side at 80% quality before saving. Photos live in the existing `photos` table and link to a person.
- Reworked the Add screen quick-add form: photo picker with preview and remove, name, how-i-know, a related-to dropdown built from existing people, fold-out More details (phone, city, nicknames, notes), Save / Save-and-add-another buttons, toast confirmation, and Save disabled until a name is entered. Picking a related person creates a relationship row.
- `getPeople()` now sorts people newest-first in JavaScript instead of Dexie `sortBy('-updated_at')` for more reliable ordering.
- Added `src/lib/image.test.ts` (3 unit tests for the image shrinker) and `src/pages/AddPage.test.tsx` (5 integration tests for the quick-add form). All tests use only fictional sample data.
- No new npm packages were added; the image shrinker uses the HTML canvas already in the browser.

Please test
1. Open the Add screen. Tap the photo picker, choose a JPEG photo, and see a preview appear with a "Remove" option.
2. Enter a name and tap Save. The person is saved with a shrunk photo, and a toast confirms it.
3. Choose someone from the "Related to" dropdown, then Save. Open that person and confirm the relationship link appears both ways.
4. Tap "Save and add another". The form clears (name and photo) so you can add another person right away.
5. Leave the name empty and confirm Save stays disabled until you type a name.

Decisions I made
- Photos are stored as shrunk JPEGs (≤600px long side) in IndexedDB via the existing photos table, never as original files, to keep storage small and offline-first.
- No new npm packages were added; the image shrinker uses the HTML canvas already available in the browser.
- The related-to dropdown lists non-deleted people newest-first, so the people you know most recently are easiest to reach.
- Save-and-add-another clears the form after saving instead of navigating away, so you can enter several people in a row.

Need from you
- None.

# Previous report (Phase 2)

What was done
- Added Dexie as the database. All main data now lives in IndexedDB on the phone, never in localStorage. Seven tables exist: people, contexts, memberships, relationships, photos, capture batches and device settings.
- Every record has the same base fields from roadmap section 8: id, created_at, updated_at and deleted. Ids are made with crypto.randomUUID() and never change. Times are UTC ISO strings.
- Added shared helpers to create, update and soft delete any record. Updates always refresh updated_at, and deleting only marks the record, so nothing is really lost and deletions can sync later.
- Added typed helpers for each kind of record in `src/db/typed.ts`, so screens never build raw objects by hand.
- Added `src/domain/relationships.ts` with all fifteen relationship types, their reverse and their labels by gender. One stored row shows both directions.
- Added `src/domain/names.ts` to normalise names and text. It folds case, removes accents from Latin letters only, squeezes spaces, and keeps Devanagari words whole.
- Added the fictional sample data from roadmap section 16.1: eight people, six contexts, nine memberships and five relationships. All names are invented. Meera has the nicknames "Mera" and "मीरा".
- Settings now has a Storage card. It asks the browser to keep the app data and shows the answer in plain words, with the space used.
- Settings now has a Developer tools card, marked "Test data only". It shows the count of every kind of record, a "Load sample data" button and a "Delete sample data" button.
- The delete button now says "Delete sample data" instead of "Delete all data". It only touches the fictional sample records, so your own people are safe even if you tap it by mistake.
- "Delete sample data" cannot be done in one tap. A box opens and asks for the word DELETE. Nothing is really erased, the sample records are only marked as deleted.
- "Load sample data" now keeps everything you already have. If a record already uses the same id, it is left alone and never overwritten.
- Added the Airtable mapping rehearsal in `docs/AIRTABLE_MAPPING.md`, using invented column names so no private data is in this public repository.
- Added 87 new tests. All 126 tests pass. Typecheck and build pass.
- Added `dexie@4.4.6` for the database and `fake-indexeddb@6.2.6` so the tests can use a pretend IndexedDB.

Please test
1. Open the app on the phone and tap Settings. Scroll down. You see a Storage card and a "Developer tools" card with a "Test data only" label.
2. Tap "Load sample data". The counts appear: 8 people, 6 contexts, 9 memberships, 5 relationships.
3. Close the app completely, then open it again from the home screen. Tap Settings. The counts are still there, so the data really was saved on the phone.
4. Tap "Delete sample data". A box opens asking for the word DELETE. Type DELETE and tap "Delete sample data". The counts go to zero. Now tap "Load sample data" again. The counts come back to 8, 6, 9 and 5. Nothing of yours was lost either way.
5. Look at the Storage card. It says either "Kept by the browser" or "Not guaranteed". If it says "Not guaranteed", tap "Keep my data" and see if the message changes.

Decisions I made
- Dexie for IndexedDB, because it gives typed tables and transactions with no server.
- Deleting marks records instead of removing them, following the roadmap rule that deletions must be able to sync.
- The delete button needs the word DELETE typed in, so a stray tap can never wipe real records.
- The developer delete button was renamed "Delete sample data" and now only removes records whose id starts with "sample-". That is how the app tells the fictional people from real ones, so real people can never be touched by a test tool.
- The Storage card is on the Settings screen now, not waiting for Phase 12, because data already exists from this phase onwards.
- Accent removal only touches Latin letters. Removing accents from Devanagari would break the combining marks and break Hindi names.
- The sample data uses fixed ids, so the tests can check the same people every time.
- Counts ignore records marked as deleted, so the numbers show what is really in the app.
- A person's name is squeezed into single spaces when the record is built, so "Meera   Joshi" is stored as "Meera Joshi". Names are matched this way in search later on.
- Added a delete helper for capture batches, so every record type has the same create, update and soft delete set.
- A deleted "Me" person is now ignored when the app looks for you, so a deleted Me does not reappear.
- Creating a record now keeps the created_at and updated_at times when they are given, the same way it already kept a given id. This matters for the Airtable import in Phase 11, where old records should keep their real dates.
- Fixed a test that could fail at random. It checked that updated_at changed, but a create and an update inside the same millisecond looked the same. The test now starts from an old date, so it always passes.
- Loading sample data skips any row whose id is already in the database. So an existing record is never overwritten, and a sample record you deleted earlier does not come back by itself.
- Your own people are not affected by "Delete sample data" at all. Only records whose id starts with "sample-" are marked as deleted. A separate full wipe for your own data will come later, with a backup first.

Need from you
- None. The Airtable rehearsal uses invented column names. If you remember the real column names from the old Airtable base, tell me and I will match them before Phase 11.

# Current phase
Phase 8: Optional automatic capture. Coding and mocked verification complete on 29 October 2026: typecheck, all 342 tests across 28 files, production build and all six browser suites pass. Independent PR review is pending. Live provider verification is blocked by absent API credentials and coding-environment network policy; it is not claimed passed. Automatic mode defaults off and Draft it requires a successful Test. All manual acceptance remains a mandatory release blocker. Phase 3–7 data/functionality is preserved. Phase 9 has not started.

# Done
- GitHub account verified.
- Public repository created.
- Roadmap v3 added as docs/ROADMAP.md.
- .clinerules created.
- Phase 1: empty app, design system and live install.
- Rules file renamed to .clinerules and cleaned, so Cline loads it.
- Phase 2: Dexie data layer, domain rules, sample data, Settings developer tools, storage status, Airtable mapping rehearsal.
- Phase 3: people list, profile, editing, atomic quick add with photos and relationship types, and soft delete with 10-second Undo. All 172 tests, typecheck and production build pass locally. Code review and desktop and Android manual tests of core functionality passed, confirmed by Varun on 27 October 2026. Phase 3 is accepted for its verified core functionality, with the three acceptance observations above still outstanding; the earlier commit 8ad341b implemented only part of this phase.

- Phase 4: context picker/creator in Quick add and profiles; live Browse/context/category details; atomic Add relative sheet with reverse labels; first-run Me setup and Settings access; 197 automated tests and both browser suites passed locally; merged in [PR #3](https://github.com/va3un/people-memory/pull/3). Routine phone/UI checks are retained as deferred final-testing observations, not claimed as passed.

- Phase 5: reactive in-memory MiniSearch index, prefix/typo/AND matching, ranked match explanations, local recents and context shortcuts; 231 tests across 22 files and all three browser scripts passed locally; merged in [PR #4](https://github.com/va3un/people-memory/pull/4). Routine phone/UI checks remain deferred.

- Phase 6: full JSON/photo/history backup, CSV ZIP, vCard, validated import preview, conservative merge, protected atomic replacement and 30-day notice; 281 tests across 25 files and all four production browser scripts passed; merged in [PR #5](https://github.com/va3un/people-memory/pull/5). Critical phone recovery acceptance is deferred until coding is complete and remains a mandatory release blocker, not a passed test.

- Phase 7: schema/prompt, local matching, inline review, opt-in surname suggestions, atomic batch save and persistent conflict-aware Undo; 314 tests across 27 files passed; merged in [PR #6](https://github.com/va3un/people-memory/pull/6). Manual capture acceptance remains a mandatory release blocker.

- Phase 8: default-off free-provider settings, explicit consent, provider Test, one-tap Draft it through the existing review pipeline, safe errors/cancel/revocation and copy/paste fallbacks; 342 tests across 28 files and all six browser suites pass. Independent review and live/manual verification remain outstanding.

# Known problems
- Phase 8 independent review is pending. Live provider verification is incomplete: no real API key is configured and the environment policy excludes the provider API hosts. Mocks do not prove real CORS, free-model access or provider behavior; use Mode A until Test succeeds. Every deferred manual acceptance check is a mandatory release blocker under the coding-first workflow below; desktop Chromium automation is not physical-phone or actual-chatbot acceptance.
- Outstanding acceptance observations, not explicitly verified: enlarged system text, under-20-second quick add, and Windows Call/WhatsApp handling. These are not confirmed defects and do not revoke acceptance of the verified Phase 3 core functionality.
- Storage and downloaded exports are unencrypted. JSON backup/export/import is implemented in Phase 6 but is not yet accepted; Dropbox sync remains unavailable. Device settings are excluded from backups. Use fictional test data only; clearing site data or losing the device loses records unless a working downloaded backup exists.
- The previously recorded low-severity serialize-javascript 7.1.2 build-tool advisory remains. Phase 8 adds no dependency and leaves existing versions unchanged. The production build reports a 667 kB JavaScript chunk; build succeeds and offline recovery passes, but physical-phone memory/performance near import limits remains unverified.

# Decisions made
- Phase 8 uses browser fetch to two fixed HTTPS provider origins, header-only device keys, explicit configuration-bound consent and a successful Test gate before drafting. No retry, paid model fallback, background request, new package, schema change or migration.
- Phase 7 uses only local copy/paste mode. Existing filled fields are preserved, notes previewed with opt-out, identities chosen explicitly, and all record/audit writes are transactional. Conflict-aware Undo refuses the whole directory operation if any later edit/link makes it unsafe. No schema, database version or dependency changes.
- Added exact-pinned fflate@0.8.3 to create the roadmap-required four-file CSV ZIP entirely offline without a service. Existing database version, schema and record IDs are unchanged.
- JSON merge adds missing IDs and retains all existing versions/tombstones. Same-name different IDs require review and stay separate. Replacement requires read-back verification of a fresh safety download and typed REPLACE, with a full-data stale check and one transaction.
- Approved coding-first workflow (29 October 2026): finish coding before manual acceptance; automated tests/typecheck/build and independent review remain mandatory per phase. All deferred manual checks, including critical backup/restore, Dropbox sync and Airtable migration, are mandatory release blockers. Fictional data only until real-data safety checks pass. The earlier reports above retain their historical workflow wording; this current approval supersedes their manual-test timing.
- Added minisearch@7.2.0 for the roadmap-required local in-memory Phase 5 prefix/typo search index; existing package versions are unchanged.
- Phase 4 uses the existing schema and tables without migrations, wiping records or converting existing ordinary people into Me.
- Context counts include Me when Me is a member and count each active person once; category counts cover assigned categories on ordinary people.
- Follow roadmap v3.
- Free tools and services only.
- Never commit personal data to GitHub.
- Pinned exact package versions, no caret or tilde signs.
- Dexie over raw IndexedDB. fake-indexeddb for tests.
- Deleting marks records, never removes them.
- Accent removal only for Latin letters, so Devanagari stays intact.
