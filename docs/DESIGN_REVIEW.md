# Phase 10 design review

Implementation review against every requirement in roadmap Section 11. The roadmap is unchanged.
Browser measurements use disposable fictional data in production Chromium, not a real Android or
Windows acceptance session. All manual checks below remain mandatory release blockers.

| Section 11 requirement | Implementation / automated evidence |
| --- | --- |
| Mobile first, one hand, sunlight, calm/photo-first | Single-pane phone flow; prominent photos and legible source clues; no custom fonts or external assets. Actual comfort/sunlight assessment remains manual. |
| 11.1 four bottom items, raised central Add, blur | Five-track grid places Add at the physical centre with Search spanning two tracks; all four named actions remain. Safe-area padding and soft blurred surface. Bounds measured at 320–1440px. |
| 11.2 eight light/dark colour tokens | Exact roadmap values retained; OS theme followed. Explicit light/dark scopes exist only for design specimens and their portalled modals. |
| System font; title 28/34 semibold, body 16/24 | System stack; rem-based title/body; smaller Settings body text enlarged. No fixed-height text buttons. |
| Caption 13/18; section labels 12 uppercase/tracking | Shared scalable caption class and rem-based section labels. |
| 4px spacing, 16px page sides | Consistent 4px steps; retained physical page padding plus safe-area insets. |
| Card radius 20; sheet top radius 28; rounded chips | Shared tokens unchanged. |
| Exact light card shadow; dark border only | Original light shadow retained, dark shadow disabled; design gallery demonstrates both at once. |
| Photo or initials in eight hashed soft colours | Existing hash retained; nonshrinking avatars; photo-first search and profile retained, relatives gain local photo/initial previews. Eight distinct colour specimens. |
| Motion 150–200ms ease-out | 150ms colour/tap/list transitions; 180ms sheet/dialog entrance. |
| Respect reduce motion | Existing global reduced-motion override retained and measured on open sheets. |
| Targets >=48px; body >=16px | Shared controls and inline links have physical minimum hit areas; native checkbox/radio labels provide full targets. Toasts expand rather than scaling older controls below 48px. Browser bounds checked after font enlargement. |
| Follow system text/theme | Rem typography, growing controls, wrapping labels, hints and long category/clue text. OS theme changes checked; 200% root-text emulation is not a passed system-text phone test. |
| Bottom sheets for pickers | Context/relative pickers retained as sheets. Visible close action, keyboard trap/return, Escape, scrolling within viewport and background scroll lock. Confirmations remain dialogs. |
| Friendly empty state: one line, one action | Search no-match/new-directory messages simplified; existing Browse/profile empty actions retained. Wide unselected profile offers one search action. |
| 11.3 Search title/focused pill | Search remains home; focused on opening/returning; clear button and recents/context shortcuts retained. |
| Results: 56px avatar, name, accent why, category | Existing hierarchy retained; clues wrap instead of truncating; category captions scale. |
| Profile photo/name/nickname/née/category | Large local photo, original name fields and a category chip. Heading receives focus when a profile loads. |
| Profile Call/WhatsApp/Copy; four sections; edit/link actions | Actions/handlers preserved. Relatives and contexts now precede How I know them and Notes in roadmap order. Delete, ten-second Undo and safety handlers unchanged. |
| Add default capture, quick form, photo/context/related, save/another, more details | Existing implementation preserved; native select controls grow with text. Regression suites exercise both Add routes, optional capture and saving. |
| Review per 10.7 | Existing review, local resolution, privacy, atomic saving and conflict-aware Undo retained; Phase 7/8 regressions. |
| Browse contexts/categories with counts; member roles/Add here | Existing live counts and membership actions retained; long names/count rows wrap. Phase 4/5 regressions. |
| Settings order: Sync, Backup, Capture, Me, Storage, About/version | Reordered presentation, preserving every control and safeguard; developer fixtures remain explicitly marked test data only. |
| Hidden design page: every component in both themes | Side-by-side scoped specimens: tokens/type, cards, real local vector-image cropping, eight initials colours, chips, all button variants/sizes, disabled/invalid fields, labelled checkbox, keyboard tabs/empty states, sheet, confirmation and toast/Undo. No example writes data. |
| 11.4 wide search/results left, profile right | Shared directory route at >=64rem keeps search mounted/query intact while selecting profiles; mobile renders only the active screen. 1024/1440px bounds and focus/query persistence checked. |

## Reproduce automated browser checks

Run `npm run typecheck`, `npm test`, then the production Pages build:

```sh
GITHUB_ACTIONS=true GITHUB_REPOSITORY=va3un/people-memory npm run build
python scripts/check-phase10-browser.py
```

Also run every existing `scripts/check-phase3-browser.py` through `check-phase9-browser.py` against
the same build. These are free local Python Playwright/Chromium tests; no real providers or Dropbox
accounts are contacted. The Phase 10 suite measures responsive bounds/hit areas and checks themed
components, contrast, keyboard access, reduced motion, two-pane persistence, photos, and all-store
preservation including Blob bytes (excluding expected device-local view timestamps). Screenshot
artifacts are written under `/tmp`, not into this public repository. Existing privacy/CSP and
backup/restore/sync/browser regressions remain necessary; visual checks alone cannot establish safety.

## Mandatory manual release blockers (not passed)

- Use Android for a full day and record irritations; review screenshots against Section 11. Include
  sunlight, one-handed use, keyboard/assistive technology, actual enlarged system text, OS theme,
  installed/offline use, orientation/keyboard/safe areas, native photo/file pickers and downloads.
- Test installed Windows/Edge or Chrome, actual two-pane ergonomics and keyboard operation,
  Call/WhatsApp handling, under-20-second Quick Add, and native vCard interoperability.
- Complete every earlier deferred UI and safety checklist, especially real-device JSON/photo
  backup → restore equality, typed replacement confirmation, failure recovery and device-only
  settings protection. Keep independent recovery copies; use separate fictional profiles.
- Complete actual free-provider and Dropbox service/multi-device conflict/photo/retry/recovery
  checks. Public App-key setup and private authorization are still unavailable here. Mocked network
  results do not establish live service success; live sync remains disabled until configured.
- Future Airtable migration/real-data safety checks remain deferred blockers. Phase 11 has not
  started. Use fictional data only until the real-data safety checks pass. Local storage, exports
  and Dropbox content remain unencrypted; working offline alone is not a verified backup.
