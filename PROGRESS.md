# Latest report
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
Phase 3: People, photos and quick add. Accepted for verified core functionality on 27 October 2026 after successful code review and desktop and Android manual tests, confirmed by Varun. Enlarged system text, under-20-second quick add and Windows Call/WhatsApp handling remain outstanding acceptance observations. Phase 4 has not started.

# Done
- GitHub account verified.
- Public repository created.
- Roadmap v3 added as docs/ROADMAP.md.
- .clinerules created.
- Phase 1: empty app, design system and live install.
- Rules file renamed to .clinerules and cleaned, so Cline loads it.
- Phase 2: Dexie data layer, domain rules, sample data, Settings developer tools, storage status, Airtable mapping rehearsal.
- Phase 3: people list, profile, editing, atomic quick add with photos and relationship types, and soft delete with 10-second Undo. All 172 tests, typecheck and production build pass locally. Code review and desktop and Android manual tests of core functionality passed, confirmed by Varun on 27 October 2026. Phase 3 is accepted for its verified core functionality, with the three acceptance observations above still outstanding; the earlier commit 8ad341b implemented only part of this phase.

# Known problems
- Outstanding acceptance observations, not explicitly verified: enlarged system text, under-20-second quick add, and Windows Call/WhatsApp handling. These are not confirmed defects and do not revoke acceptance of the verified Phase 3 core functionality.
- Storage is unencrypted and local to this browser. Backup/export and Dropbox sync remain later phases. Use fictional test data only; clearing browser data or losing the device loses records.
- One low-severity npm advisory remains in build tooling: serialize-javascript 7.1.2 through Workbox. No dependency versions were changed in this phase.

# Decisions made
- Follow roadmap v3.
- Free tools and services only.
- Never commit personal data to GitHub.
- Pinned exact package versions, no caret or tilde signs.
- Dexie over raw IndexedDB. fake-indexeddb for tests.
- Deleting marks records, never removes them.
- Accent removal only for Latin letters, so Devanagari stays intact.
