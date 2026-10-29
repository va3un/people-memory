# Smart Capture copy/paste mode (Phase 7)

Use fictional passages only until the real-data safety checks pass. Smart Capture is the default Add screen; Use the form instead opens the existing quick form. Add person here from a context still opens that form with its context selected. No provider, API key, account, automatic request or paid tool is needed by the app.

## Draft and review

Enter up to 5,000 characters. Read the privacy notice before Copy prompt. Copy includes only instructions and your passage, not saved people, Me, contexts or device settings. You choose whether to paste it into a chatbot you trust. The app itself sends nothing. If clipboard permission is unavailable, select/copy the visible prompt manually. Paste the chatbot's JSON answer and tap Read it.

Answers use roadmap schema 1. The local parser accepts fenced JSON or prose surrounding the first complete JSON object and ignores unknown fields. It refuses broken JSON, future versions, invalid relationship types, missing/duplicate references, blank names and oversized/deeply nested answers. It never repairs missing facts by inventing them. Maximum answer size is 256 KiB, with up to 100 people/contexts and 300 memberships/relationships each. Review does not write directory data.

Each person card is editable and can be skipped. Normalized full names, nicknames and maiden names, including Unicode and close spelling matches, produce possible matches. No match is automatically chosen, even for an exact name. Explicitly choose Use existing or Create new. Editing a name rechecks candidates locally. Separate draft people cannot be assigned to one existing identity in the same batch. Existing people never have filled fields replaced: the card previews the actual result, including optional appended notes. Empty arrays can be filled; existing arrays are retained. Notes can be deselected.

Contexts match normalized names and kind. “My school/college/society” resolves only from Me's active memberships: one match is proposed with a guessed badge, several require a picker, none requires choosing or naming the context. You can optionally add that context to Me. Existing contexts are reused without renaming. Unused contexts are not created. Skipping a person or context skips dependent links.

Relationship sentences use the existing gender-aware domain labels. Change either endpoint/type or exclude the link. Reverse views are display-only; identical/reverse duplicate links reuse one record. Check all uncertain facts and inferred genders before saving.

## Names and assumptions

Surname suggestions are off by default in Settings. Turning them on only offers a possible husband surname and maiden surname when both spouse roles are supported by the draft. Use surname suggestion is a separate opt-in; Revert restores the prior draft name and maiden field. Children never receive a local surname suggestion. A maiden name from an AI answer is excluded until explicitly confirmed. A proposed full name absent from the passage also requires explicit confirmation, even if the AI ignored the prompt's surname rule. Guessed fields and locally resolved Me contexts are visible during review. Marriage alone establishes neither a surname change nor a maiden name.

## Save and Undo

Save writes all people, contexts, memberships, relationships and the capture audit batch in one IndexedDB transaction. It fills only empty existing fields and appends selected new notes. The raw passage and before/after snapshots stay on this device and are included in full JSON backups; no device setting is included. No photos are changed by capture. Stale reviews are refused rather than applied to changed data. Refresh review re-reads the original answer and resets review choices. Save errors keep the draft and roll back every write, allowing retry. A successful review cannot be saved twice.

The toast offers Undo, and Capture history keeps it available after navigation/reload. Created records are soft-deleted, not removed. Fills are restored only when their current fields still match the post-capture values; unrelated later fields and local view history are preserved. A created record that was edited, or a created person/context used by any later record, blocks the entire directory Undo. The batch is marked undo_conflict and the current directory stays intact. Keep current data or Review people manually in Search; no conflict button forces an overwrite. A write failure during Undo rolls back the entire operation. Already undone batches cannot be undone again.

Full JSON backup/restore preserves capture history and its Undo snapshots. Imported history with missing/mismatched provenance requires manual review rather than unsafe deletion.

## Verification and release gates

Automated tests cover the roadmap's five golden examples and safety cases; production Chromium checks exercise clipboard/privacy, real review/edit/skip, late-save failure and retry, live search, persistent safe/conflicting Undo, surname opt-in/revert and offline operation. All fixtures are fictional. Earlier Phase 3–6 browser suites remain required regressions.

Under the approved coding-first workflow, independent PR review is required per phase. All manual acceptance tests wait until coding is complete and remain mandatory release blockers. This includes an actual chatbot copy/paste Sanket rehearsal, phone UI/offline checks, critical backup/restore, Dropbox sync and Airtable migration safeguards. Automation does not mark these manual checks as passed. No personal data may be used until the real-data safety checks pass. Phase 8 automatic capture and deployment are not part of this change.
