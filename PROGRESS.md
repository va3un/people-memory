# Latest report
Phase 2 is built. The app now has a real database in the phone, sample data you can load, and Settings that shows how much data is stored and whether the browser will keep it.

What was done
- Added Dexie as the database. All main data now lives in IndexedDB on the phone, never in localStorage. Seven tables exist: people, contexts, memberships, relationships, photos, capture batches and device settings.
- Every record has the same base fields from roadmap section 8: id, created_at, updated_at and deleted. Ids are made with crypto.randomUUID() and never change. Times are UTC ISO strings.
- Added shared helpers to create, update and soft delete any record. Updates always refresh updated_at, and deleting only marks the record, so nothing is really lost and deletions can sync later.
- Added typed helpers for each kind of record in `src/db/typed.ts`, so screens never build raw objects by hand.
- Added `src/domain/relationships.ts` with all fifteen relationship types, their reverse and their labels by gender. One stored row shows both directions.
- Added `src/domain/names.ts` to normalise names and text. It folds case, removes accents from Latin letters only, squeezes spaces, and keeps Devanagari words whole.
- Added the fictional sample data from roadmap section 16.1: eight people, six contexts, nine memberships and five relationships. All names are invented. Meera has the nicknames "Mera" and "मीरा".
- Settings now has a Storage card. It asks the browser to keep the app data and shows the answer in plain words, with the space used.
- Settings now has a Developer tools card, marked "Test data only". It shows the count of every kind of record, a "Load sample data" button and a "Delete all data" button.
- "Delete all data" cannot be done in one tap. A box opens and asks for the word DELETE. Nothing is really erased, every record is only marked as deleted.
- Added the Airtable mapping rehearsal in `docs/AIRTABLE_MAPPING.md`, using invented column names so no private data is in this public repository.
- Added 40 new tests. All 89 tests pass. Typecheck and build pass.
- Added `dexie@4.4.6` for the database and `fake-indexeddb@6.2.6` so the tests can use a pretend IndexedDB.

Please test
1. Open the app on the phone and tap Settings. Scroll down. You see a Storage card and a "Developer tools" card with a "Test data only" label.
2. Tap "Load sample data". The counts appear: 8 people, 6 contexts, 9 memberships, 5 relationships.
3. Close the app completely, then open it again from the home screen. Tap Settings. The counts are still there, so the data really was saved on the phone.
4. Tap "Delete all data". A box opens asking for the word DELETE. Type DELETE and tap "Delete everything". The counts go to zero.
5. Look at the Storage card. It says either "Kept by the browser" or "Not guaranteed". If it says "Not guaranteed", tap "Keep my data" and see if the message changes.

Decisions I made
- Dexie for IndexedDB, because it gives typed tables and transactions with no server.
- Deleting marks records instead of removing them, following the roadmap rule that deletions must be able to sync.
- The delete button needs the word DELETE typed in, so a stray tap can never wipe real records.
- The Storage card is on the Settings screen now, not waiting for Phase 12, because data already exists from this phase onwards.
- Accent removal only touches Latin letters. Removing accents from Devanagari would break the combining marks and break Hindi names.
- The sample data uses fixed ids, so the tests can check the same people every time.
- Counts ignore records marked as deleted, so the numbers show what is really in the app.

Need from you
- None. The Airtable rehearsal uses invented column names. If you remember the real column names from the old Airtable base, tell me and I will match them before Phase 11.

# Current phase
Phase 2: Data layer, sample data and storage status

# Done
- GitHub account verified.
- Public repository created.
- Roadmap v3 added as docs/ROADMAP.md.
- .clinerules created.
- Phase 1: empty app, design system and live install.
- Rules file renamed to .clinerules and cleaned, so Cline loads it.
- Phase 2: Dexie data layer, domain rules, sample data, Settings developer tools, storage status, Airtable mapping rehearsal.

# Known problems
- None.

# Decisions made
- Follow roadmap v3.
- Free tools and services only.
- Never commit personal data to GitHub.
- Pinned exact package versions, no caret or tilde signs.
- Dexie over raw IndexedDB. fake-indexeddb for tests.
- Deleting marks records, never removes them.
- Accent removal only for Latin letters, so Devanagari stays intact.
