People memory app: project roadmap, version 3
Revised 22 October 2026 for Varun Nagwekar. This file supersedes version 2 after Varun approves it for use. Version 2 remains archived and unchanged.
Keep one copy in the ChatGPT project, one at `D:\Dropbox\People Memory App\docs\`, and one in the code repository as `docs/ROADMAP.md`.
What changed from version 2:
Retained Claude's core vision, tech stack, eleven core product milestones, one-phase Cline workflow, and Phase 0 manual setup. Phase numbering 0 through 13 is unchanged.
Tightened privacy: distinguish no app account from third-party sign-in; disclose unencrypted local and Dropbox storage, and require explicit consent before sharing passages with any external chatbot or API.
Added real-data Airtable mapping rehearsal with redacted or fictional rows before Phase 11, without advancing the full migration.
Added no-loss sync safeguards: deterministic conflict handling, protected recovery copies, account/device tests, and no silent deletion of conflicting edits.
Added early persistent-storage request and backup reminders; support import/export as disaster recovery, not as an implicit guarantee of permanent browser data.
Fixed first-run timing, relationship wording, surname assumptions, safer import/undo behavior, PWA update behavior, and test acceptance criteria.
Updated free-tier caveats from official service documentation. Specific promoted models are not guaranteed to remain free.
Open-source license is now an explicit Phase 0 choice: recommend MIT; repository can remain public without a license temporarily, but is not open-source until a license is added.
Source separation: Product goals and phase structure originate in v2 (Claude's proposal). V3 safeguards are review recommendations based on engineering risk and official vendor/browser documentation linked in section 7.6. No outside source establishes that any vendor will remain free forever.
---
1. How this project runs
1.1 Roles
Varun: decides what he wants, tests on his phone, answers the few big questions.
Cline with a free model: writes and tests the code, commits to Git, and writes a short report.
ChatGPT: planning, design review, and help when something big goes wrong. It is not a relay between Varun and Cline.
1.2 The normal loop (one phase at a time)
Varun opens a new Cline chat and types: `Run Phase N of docs/ROADMAP.md.`
Cline reads this file, `.clinerules` and `PROGRESS.md`, then does the whole phase without asking for plan approval.
Cline commits after each finished task, runs the tests, pushes to GitHub, and checks that the deploy worked.
Cline writes a report at the top of `PROGRESS.md` with four short parts: What was done, Please test (five checks at most, with exact taps), Decisions I made, Need from you (only if blocked).
Approved coding-first testing workflow (29 October 2026): finish coding before manual acceptance testing. Automated tests, typecheck, production build and independent pull-request review remain required for every phase. Varun authorizes the next coding phase in a new chat after those checks and review.
Defer all manual acceptance tests until coding is complete, including routine phone/UI checks and critical backup/restore, Dropbox sync and Airtable migration tests. Record every deferred check in `PROGRESS.md` as a mandatory release blocker, never as a passed test. Deferral does not block coding-phase progression after its automated checks and independent review.
All deferred manual tests must pass before release. This includes successful backup restoration, the required actual-service multi-device sync and conflict/recovery checks, and Airtable real-data migration verification and safeguards in the applicable phases. Automated mocks alone do not replace these release checks. Use fictional data only until the real-data safety checks pass; do not import or expose personal records to complete coding.
Deferral changes only the timing of manual acceptance. All other roadmap requirements, data-safety safeguards, actual-service verification and review requirements remain unchanged. Stop and report dependencies that genuinely require Varun's action.
1.3 When ChatGPT is used
Kickoff, once.
Design review: Varun pastes a phone screenshot and asks "review against section 11".
Escalations: Varun pastes Cline's "Need from you" text. ChatGPT answers with exactly one of: APPROVED, FIX (one short instruction to paste into Cline), or DECISION NEEDED (at most three options, recommendation first).
1.4 When Cline must stop and ask Varun
Only these cases. Everything else, Cline decides, logs under "Decisions I made", and continues.
A decision is missing and it changes the data model, privacy, or cost.
Varun must do something himself (create the Dropbox app, paste an API key, test on the phone).
The same error persists after three different fixes.
Anything asks for a credit card, a payment method, or a paid plan.
An action could destroy real data.
1.5 Rules for ChatGPT
This file is the source of truth. If Varun asks for something that conflicts with it, say so. Change the file only after he approves, and show him the changed section.
Anything Varun must do by hand is given one step at a time. Wait for confirmation of each step.
Assume no coding knowledge. Say what each action does before asking for it.
Check current facts (free tiers, model availability) with web search. The dated facts in section 7.6 were checked on 22 October 2026 and can change.
No em dashes and no tildes in anything Varun will paste or publish.
---
2. The problem
Varun has trouble remembering people's names across family, school, college, office, housing societies and other circles. He does not need a contacts app or a family tree. He needs a "who is this?" finder: type any clue (a spouse's name, a child's name, a company, a school, a society, a city) and get the person back with a photo to confirm.
The app must answer questions like these:
"Who is Chetana's husband?"
"Who are the parents of this child at my daughter's school?"
"Who did I work with at Lionbridge?"
"Who lives in Akashganga or Shanti Sagar Society?"
"Who are my wife's relatives in Borli?"
"I remember the spouse, parent or child's name, but not this person's name."
Why the Airtable version failed, and what the app does instead:
Airtable pain point	What the app does instead
Search needed a formula that copied names from linked records, updated by hand	The app builds its search index automatically
Family links were confusing	One "add relative" action. The reverse link is worked out automatically
Too many fields, tags, groups and roles	Three concepts: People, Contexts, Relationships
Schema changes and formulas were hard on mobile	The structure is fixed and designed for the phone
Data entry felt like a chore	Quick add, and Smart capture from a typed or dictated paragraph
Vendor dependence	Data lives on the phone and can be exported as plain files; optional Dropbox syncing still depends on Dropbox availability
---
3. Goals and non-goals
Goals for version 1
Find a person from any partial clue in under 5 seconds, on a phone.
Add people with almost no effort: a 20-second quick form, or a paragraph of text or dictation that the app turns into drafts (Smart capture).
Show why each result matched, for example "Husband of Meera Joshi".
Work fully offline. Sync is an extra, never a requirement.
Keep phone and Windows PC in sync through Varun's own Dropbox.
Be maintainable for many years with minimal updates; future Android/browser compatibility is a goal, not a guarantee.
Let Varun export everything in open formats at any time.
Be free and open source, with no app-specific user account or own server, no tracking, and no cost. Optional Dropbox sync needs a Dropbox account; building needs GitHub and Cline/free-model access; optional automatic AI may require a provider account.
Look modern and slick, and feel calm and quick.
Non-goals for version 1
No iPhone testing, no Play Store release.
No social media imports, no email or calendar reading.
No sharing with other users. This is one person's private tool.
No AI that runs without Varun asking. Smart capture always ends in a review screen.
---
4. Research summary
Project	What it is	What we borrow
Monica (monicahq.com)	Open-source personal CRM, PHP and Laravel, needs a server. Version 3 expected before the end of 2026	Data ideas: relationships, notes, life events
Contrack (arvarik/contrack)	Self-hosted personal CRM on one SQLite file, semantic search, daily backups	Search beyond exact names, simple backups
Clay, Dex, Covve	Commercial personal CRMs with polished mobile design	Card layouts, photo-first design
Known Names, MemoPer, FaceCards, Namerick	Name-memory apps, mostly iPhone only or quiz-style	Save a person in seconds, store where you met them
Notepak (clintharris/notepak)	Local-first PWA, SQLite in the browser, syncs through the user's own Google Drive	Proof that the architecture works with no backend
PunchIn (PunchIn-App/punchin)	Offline PWA that syncs one file through Drive or OneDrive app folders and merges changes	Pull, merge, push sync pattern
As far as I could find, none of these search by relatives, workplace, school and society together, and none sync to a Windows app. None turn a typed paragraph into linked profiles. That is the gap this app fills.
Cline may read these repositories for patterns. Check each project's licence before copying any code.
---
5. Big decisions
5.1 An installable web app (PWA), not a native Android app
A PWA is a website that installs on the home screen and opens like an app. It works offline once installed.
Future Android versions: it runs inside Chrome, which updates itself. Native apps are tied to the rules of the Android version they were built for and can break or get blocked over time.
One codebase for Android and Windows. Edge or Chrome installs it on Windows in its own window.
No Play Store, no developer account.
Web apps are the easiest thing for free AI models to build well.
Trade-offs: the app must be opened once from a web address to install. Browsers can clear a site's data when the phone is very short on space. The app requests persistent browser storage early, offers sync to Dropbox, and provides one-tap export. Browser storage may still be lost if the user clears site data, changes browsers, or loses the device; no protection is absolute.
5.2 Local-first data
Each device keeps a full copy in the browser's IndexedDB database. Search and edits never wait for the internet. Sync runs on supported foreground triggers when online and authorized; background execution cannot be relied on once the browser or PWA is closed.
5.3 Sync through Varun's own Dropbox
The app talks to Dropbox directly. No server of ours sits in between. Dropbox supports OAuth with PKCE for apps with no server, and it can give a long-lived refresh token so Varun stays signed in. An "App folder" Dropbox app can only see its own folder.
Privacy limits: Dropbox sync data and photos are not end-to-end encrypted by this app in v1. The local browser database and ordinary exported backups are also unencrypted. Dropbox and anyone with access to the Dropbox account, unlocked device, or downloaded backup may be able to read them. App-folder permission limits what the app can reach, not who can access the files. Do not store information you would not be comfortable putting in your own Dropbox account. Optional user-managed encryption stays a later idea rather than rushing bespoke cryptography into v1.
5.4 Tech stack (all free and open source)
Part	Choice
Language	TypeScript
UI	React with Vite
Styling	Tailwind CSS, with shadcn/ui style components copied into the repo, lucide-react icons, sonner for toasts
Local database	Dexie (over IndexedDB)
Search	MiniSearch
Offline and install	vite-plugin-pwa
Navigation	React Router in hash mode
Validation	zod, for Smart capture data
Tests	Vitest
Hosting	GitHub Pages (needs a public repository, so no personal data may ever be committed)
Rules: pin exact versions (no caret or tilde signs) and commit the lock file. No app backend and no app login system. Third-party sign-in for Dropbox and AI providers is optional. No fonts, scripts or images loaded from other websites at runtime, except explicitly approved Dropbox and optional AI API requests. Use system fonts. Any new package needs a one-line reason in `PROGRESS.md`.
5.5 Plan for "works for many years without updates"
Nobody can promise ten years. This plan makes any failure gentle.
No native code. The app depends only on the browser; compatibility and storage guarantees can change with browser versions.
Only long-stable browser features: IndexedDB, service workers, fetch, canvas, the install manifest.
Everything works offline once installed.
Data is plain JSON that can be read without the app.
Export in open formats: JSON (full backup), CSV, vCard.
Dropbox code lives in `src/sync/` and AI code in `src/capture/`, so either can be replaced or removed without touching the rest. The app works fully without them.
The finished build is a folder of static files that any free host can serve.
A monthly manual export reminder and a yearly five-minute check: open the app, export a backup, test a restore on a safe test dataset.
`docs/REBUILD.md` explains how to rebuild the app from scratch.
Honest weak points: Chrome on a very old phone can stop updating, and Dropbox or an AI provider could change their rules. Export and restore cover both.
---
6. Free-only rulebook
Varun pays nothing, ever. Allowed services and current, changeable limits (verify again when each service is first used):
Service	Used for	Free limit to respect
GitHub Free	Repository, Actions, Pages, Codespaces	Codespaces: 120 core hours and 15 GB-month per month. On a 2-core machine that is 60 hours. With no payment method on the account, use is blocked at the limit instead of billed
Dropbox Basic	Sync and backups	2 GB, far more than needed
Cline account	Free coding models	Rotating limited-time promotions with a usage quota. IDE/CLI free promotions are not the same as a guaranteed permanent model
OpenRouter	Free coding models and, optionally, Smart capture	Free models are rate limited: free account is currently 50 requests per day in total; availability and terms change
Google AI Studio (Gemini API)	Optional Smart capture	Certain models have rate-limited free API access without billing; availability varies by account, model and region; free-tier content may be used to improve Google products
Bolt.new	Optional design comparison at the end	1M tokens a month and 300K a day on the free plan
Rules:
Never add a credit card or payment method to GitHub, Dropbox, OpenRouter, Google Cloud, Bolt or Cline.
If a free quota runs out, wait for it to reset or switch to another free route. Never upgrade.
If any service asks for payment, stop and tell Varun.
Free access must be checked from the actual signed-in account. Do not claim specific promotional models, daily limits, billing eligibility, or browser API permissions are guaranteed.
Third-party services may change requirements; no-card confirmation means the documented free path does not require a card, not that every signup flow will always behave identically.
AI model usage is optional to the app's core functions: manual quick add, browsing, search, backup, and import always work without any AI provider.
---
7. Workspace, Git and models
7.1 Where development happens
Default: GitHub Codespaces, a full VS Code in the browser running on GitHub's servers. No installs on the PC, and Cline, Node and Git all live there. Free quota is in section 6. A Codespace stops after a period of inactivity, so Varun should stop it when done (Codespaces menu, Stop) to save hours.
Fallback: local development on the Windows PC. Use it if Cline cannot sign in or cannot use the free model inside Codespaces, or if the Codespaces hours run out. See Appendix C.
Phone testing: every push to `main` deploys to GitHub Pages in a minute or two, and the installed app shows an "Update ready, tap to refresh" message. A Codespace can also expose its dev server on a public HTTPS port for quick looks.
7.2 Repository
Name: `people-memory`. Public (required for free GitHub Pages). It contains code and docs only, never real people data, photos, API keys or exports.
Single branch, `main`. Cline commits after every finished task with a plain message such as `phase 4: add relative sheet`. Cline pushes only when typecheck, tests and build all pass.
At the end of each approved phase: tag `phase-N-done`. At the end of phase 12: tag `v1.0.0`. Rolling back means returning to the last good tag.
GitHub Actions runs typecheck, tests and build on every push, and deploys to Pages only when everything passes.
`.devcontainer/devcontainer.json` lists the Cline extension (`saoudrizwan.claude-dev`) so it installs automatically in every new Codespace.
Dependabot and automatic updates stay off. The app is meant to stay frozen.
7.3 Dropbox folder on the PC
`D:\Dropbox\People Memory App\` holds documents and backups, never the code repository (Dropbox would sync tens of thousands of files in `node_modules` and can damage `.git`).
```text
D:\Dropbox\People Memory App\
  docs\       roadmap versions, notes
  backups\    exports from the app, one per month
  design\     screenshots, Bolt.new experiments
```
The app's own sync folder is separate: Dropbox creates `Apps\<app name>\` automatically, and the Dropbox desktop app can mirror it to the PC when syncing is enabled and there is adequate local space.
7.4 Models for Cline (free)
Initial preferred model: MiniMax M3.1 Flash, only if it is still explicitly tagged FREE inside Cline. As of the original v2 check on 22 October 2026:
The OpenRouter free listing ends on 22 October at 12:00 UTC (which may already have passed when you read this), after which the model costs $0.15 per million input tokens and $0.60 per million output tokens.
Cline offers it free as a rotating, limited-time promotion with a usage quota. In Cline, sign in with a Cline account, set the provider to Cline, and choose the model tagged FREE (model ID `cline-free/minimax-m3.1-flash`). It works in the IDE extension, not through the Cline API. No end date was published.
That promotional listing may expire, and a model ID is never authorization to spend money. The plan must survive the model changing. Rules:
Fallback order: (a) any Cline model tagged FREE, (b) an OpenRouter model marked free, (c) a Gemini Flash model through a free Google AI Studio key.
Never switch to a paid route. If all free routes are limited, wait for the reset.
Every phase can be resumed by a different model. `PROGRESS.md` and Git hold the state, and each phase is a checklist.
Use one model for a whole task if possible. Router options that pick a different model each time give less predictable results.
Smart capture inside the app must not depend on the model Varun uses to build it (section 10).
7.5 Cline settings
Auto-approve: reading files, editing files in the project, and safe commands. Leave everything else on manual approval.
Use Act mode. Do not require plan approval.
Start a new chat for each phase.
On a rate-limit error: wait and retry. Do not change to a paid model.
7.6 Vendor facts and verification links (reviewed 22 October 2026)
Fact	Source type
MiniMax M3.1 Flash released 19 October 2026, list price $0.15 and $0.60 per million tokens, free windows on OpenRouter (ends 22 October 12:00 UTC) and Ollama Cloud (ends 22 October 23:59 UTC)	OpenRouter listing and news posts
Cline FREE-tagged rotating promotion, quota applies, IDE and CLI only	Cline offer listing
Codespaces: 120 core hours and 15 GB-month free on personal accounts	GitHub docs
Gemini API free tier covers current Flash models, rate limited, content may be used to improve Google products, EEA, UK and Switzerland users must use paid	Google pages and summaries
Bolt free plan: 1M tokens a month, 300K a day	Bolt pricing, reported by several sites
Dropbox PKCE flow gives refresh tokens with `token_access_type=offline`, no app secret needed	Dropbox authorization documentation
Public GitHub repository can use Pages with GitHub Free	GitHub Pages documentation
Codespaces personal free allowance: 120 core-hours, 15 GB-month; without billing, access stops at quota	GitHub Codespaces documentation
Dropbox Basic free storage: 2 GB	Dropbox Basic FAQ
OpenRouter free-plan request limit shown as 50 per day, subject to change	OpenRouter pricing
Cline free promotions rotate and apply to IDE/CLI, not API	Cline free models
Gemini free model availability, privacy and billing conditions depend on tier, model and region	Gemini pricing, Gemini billing
Bolt free usage: 1M tokens/month and 300K/day, subject to change	Bolt pricing
Browser local storage may be evicted unless persistent storage is granted; user clearing site data still deletes it	MDN storage documentation
Note on old model claim: The MiniMax model's precise promotional expiry and future Cline availability in the v2 snapshot are historical claims, not promises. On Phase 0 day, inspect the Cline model selector rather than following any stale offer. No paid fallback.
---
8. Data model
Every record has: `id` (UUID, never changed), `created_at`, `updated_at` (UTC ISO strings), `deleted` (true or false, records are marked deleted so deletions can sync), and optionally `source_batch_id` (set when created by Smart capture, used for undo).
8.1 Person
Field	Notes
`full_name`	Required. The current name, for example "Tarika Bobhate"
`maiden_name`	Optional, for example "Gupta". Searchable. Shown as "née Gupta"
`display_name`	The name Varun uses day to day. Defaults to first name
`nicknames`	List. Include spelling variants and Devanagari spellings
`gender`	male, female, other, unknown. Used only to pick labels such as Father or Mother
`category`	Free text with suggestions: Family, Relative, Friend, School parent, Colleague, Neighbour, Other
`phones`, `email`, `city`	Optional
`how_i_know`	Short text, for example "School and college friend"
`notes`	Long text
`birthday`	Optional. Month and day required, year optional
`is_me`	True for exactly one person: Varun. Created in first-run setup. Hidden from normal search
`last_viewed_at`	Local only, not synced
8.2 Context
One table for organizations, schools, colleges, societies, groups and places.
Field	Notes
`name`	Required, for example "Fr. Agnel School", "ICLES College", "Lionbridge"
`kind`	organization, school, college, society, group, place
`city`, `notes`	Optional
8.3 Membership
`person_id`, `context_id`, `role` (free text such as Student, Parent, Resident, Colleague, Teacher), `period` (optional text such as "1996 to 2002"), `notes`.
8.4 Relationship
Each row means: person A is the TYPE of person B. Example: A = Anil, B = Meera, type = spouse means "Anil is the spouse of Meera".
Type	Reverse	Labels (by gender of person A)
spouse	spouse	Husband, Wife, Spouse
parent	child	Father, Mother, Parent
child	parent	Son, Daughter, Child
sibling	sibling	Brother, Sister, Sibling
grandparent	grandchild	Grandfather, Grandmother, Grandparent
grandchild	grandparent	Grandson, Granddaughter, Grandchild
uncle_aunt	nephew_niece	Uncle, Aunt
nephew_niece	uncle_aunt	Nephew, Niece
cousin	cousin	Cousin
parent_in_law	child_in_law	Father-in-law, Mother-in-law
child_in_law	parent_in_law	Son-in-law, Daughter-in-law
sibling_in_law	sibling_in_law	Brother-in-law, Sister-in-law
friend	friend	Friend
colleague	colleague	Colleague
other	other	Related, with a note
Only one row is stored for each relationship. The reverse is derived. All label logic lives in `src/domain/relationships.ts` with tests.
8.5 Photo
Separate table keyed by person ID. Shrink to at most 600 px on the long side, JPEG quality 0.8, so each photo is roughly 30 to 80 KB.
8.6 Capture batch
One row per Smart capture save: `id`, `created_at`, `raw_text`, `created_ids` (by table), `before_snapshots` (previous values of any existing record that was edited), `after_snapshots` or changed-field fingerprints for conflict-safe undo, `status` (saved, undone or undo_conflict). It powers "Undo this capture". If an existing record changed after the capture, Undo must ask rather than silently overwrite those later edits.
8.7 App settings (this device only, never synced, never exported by default)
Smart capture provider, API key, model name, and the surname setting (section 10.5). Stored in IndexedDB. Provider keys and Dropbox tokens are sensitive device-local credentials, excluded from exports, logs and sync; protect against accidental display and never put them in a URL. This does not provide secure hardware-backed secret storage.
8.8 First-run setup: the "Me" profile
On first launch after Phase 4 adds the Me feature, ask for Varun's name, then optionally add his schools, colleges, workplaces and societies as contexts linked to Me. Before Phase 4, development uses only fictional sample data and does not require a Me profile. Existing people added in Phase 3 are preserved when first-run setup appears. Smart capture uses these contexts to understand phrases like "my school".
---
9. Search design
Search is the most important feature. Spend the most testing time here.
9.1 What is searchable for each person
full name, maiden name, display name, nicknames
phone numbers (digits only)
city, category, `how_i_know`, notes
names of their contexts and their role in each (for example "Lionbridge Colleague")
names of directly related people with the relationship label from their side, for example "husband of Meera Joshi"
one step out only. Do not add relatives of relatives
The index is built in memory when the app opens and updated after each change. It is never stored in the database.
9.2 Matching
Ignore case, accents and extra spaces; do not strip or corrupt Devanagari code points.
Match the start of words ("lion" finds Lionbridge).
Tolerate small typos ("Mera" finds "Meera").
Work with Devanagari and other scripts.
Several words narrow the result: "meera husband".
Rank: close name match, then nickname or maiden name, then related person, then context, then notes.
The Me person is hidden from results.
9.3 Show why it matched
Each result has one short line explaining the match: "Husband of Meera Joshi", "Colleague at Lionbridge", "Lives in Sagar Heights Society (Resident)", "Matched nickname: Chetna". This line makes the app a memory aid and not a database.
9.4 Empty search
Show recently viewed people, recently added people, and shortcut chips for the most used contexts.
---
10. Smart capture
Varun types or dictates a passage. The app drafts people, links and contexts. He reviews, edits and confirms. Nothing is saved until he taps Save, and every save can be undone without erasing subsequent unrelated edits; unsafe undo shows a review instead of silently overwriting newer data.
Example input:
> Sanket Bobhate is my friend from school, we also studied in college together. His wife's name is Tarika Gupta and their daughter's name is Kiara.
Expected draft:
Sanket Bobhate: male, category Friend, "School and college friend".
Tarika Gupta: female, wife of Sanket. If the opt-in surname suggestion is enabled, suggest "Tarika Bobhate" and possible maiden name "Gupta", both visibly assumed.
Kiara: female (stated by "daughter"), child of Sanket and of Tarika. Do not invent a surname unless Varun explicitly confirms one.
Fr. Agnel School and ICLES College: found from Varun's own Me profile, because he said "my school" and "college together". Sanket is added to each as Student.
Sanket is a friend of Varun.
10.1 Input
Smart capture is the default view of the Add tab: one large text box that says "Tell me about someone", and a link "Use the form instead".
Dictation needs nothing special. Wispr Flow, Fireflies Talk and the phone's keyboard voice typing all type into any text box.
Allow up to 5,000 characters. Show a count.
10.2 Two ways to extract (both ship)
Mode A: copy and paste. No API key or built-in cost; availability depends on whatever chatbot Varun chooses. The app builds a ready prompt (instructions plus Varun's passage plus the JSON format). Before copying, show: "This passage may contain private information about other people. Only paste it into an external chatbot if you are comfortable sharing it with that service." Varun taps Copy, pastes into a chatbot he trusts, and pastes the answer back. The app reads the JSON and continues. Build this first.
Mode B: automatic. In Settings, Varun pastes a free API key (Gemini or OpenRouter) and chooses a model name. One tap then does the same job inside the app. It is off by default. Show this notice before the first external request, with explicit consent: "Your passage may contain other people's information. It will be sent to the selected AI provider and may be used to improve its models under its terms. Your saved directory is not sent." If the provider blocks calls from a browser or rejects the model name, show a clear message and offer Mode A. Model names change often, so the model name is an editable setting and not hard-coded.
10.3 What is sent to the AI
Only the passage and instructions are sent to the selected external service when Varun initiates capture. The app never sends the saved directory or Me profile as a separate payload. Important: anything Varun types in the passage, including personal information about existing contacts, is sent. Local matching to existing people and schools happens on the device. No automatic capture without user action.
10.4 The JSON format (schema version 1)
```json
{
  "schema": 1,
  "people": [
    {"ref":"p1","full_name":"Sanket Bobhate","maiden_name":null,"gender":"male","gender_source":"stated","nicknames":[],"category":"Friend","how_i_know":"School and college friend","notes":"","phones":[],"city":null,"assumed":[]},
    {"ref":"p2","full_name":"Tarika Gupta","maiden_name":null,"gender":"female","gender_source":"stated","nicknames":[],"category":"Relative","how_i_know":"Sanket's wife","notes":"","phones":[],"city":null,"assumed":[]},
    {"ref":"p3","full_name":"Kiara","maiden_name":null,"gender":"female","gender_source":"stated","nicknames":[],"category":"Relative","how_i_know":"Sanket and Tarika's daughter","notes":"","phones":[],"city":null,"assumed":[]}
  ],
  "contexts": [
    {"ref":"c1","name":null,"kind":"school","same_as_me":true},
    {"ref":"c2","name":null,"kind":"college","same_as_me":true}
  ],
  "memberships": [
    {"person":"p1","context":"c1","role":"Student","period":null},
    {"person":"p1","context":"c2","role":"Student","period":null}
  ],
  "relationships": [
    {"a":"p1","b":"p2","type":"spouse"},
    {"a":"p3","b":"p1","type":"child"},
    {"a":"p3","b":"p2","type":"child"},
    {"a":"p1","b":"ME","type":"friend"}
  ],
  "uncertain": ["Kiara's surname was not stated", "Tarika's maiden name was not stated"]
}
```
Rules in the prompt:
`ME` means Varun. Use it in relationships.
Use only the relationship types in section 8.4.
Do not invent facts. If something is guessed, list it in the person's `assumed` array or in `uncertain`.
If the text says "my school", "my college", "my society" or similar without a name, output a context with `name` null and `same_as_me` true, with the right `kind`.
Apply the surname setting (10.5).
Return JSON only.
10.5 Surname setting
"When a married woman is named with a different surname from her husband, optionally suggest her husband's surname as a possible current name and keep the given surname as a possible maiden name." Default: off because marriage does not establish a name change or maiden name. The app puts the on or off value in the prompt; surname changes remain a review-time opt-in even if an AI ignores the prompt. When enabled, proposed changes are suggestions, never silently substituted facts; flag both assumed current surname and assumed maiden name in review, with one-tap revert. For a child, do not assume surname by default.
10.6 Local resolution (on the device, after the AI step)
Validate the JSON with zod. Be forgiving: strip code fences, find the first JSON object, ignore unknown fields.
Match each drafted person to existing people by normalized name, maiden name and nickname. A close match becomes "Possible match: use existing, or create new".
Match each drafted context to existing contexts by normalized name.
For a context with `same_as_me`, find Varun's contexts of that kind. If exactly one, use it. If several, show a picker. If none, ask Varun to name it, and offer to add it to his Me profile.
Create the reverse view of relationships only for display. Store one row.
Mark every guessed value (gender from a name, surname change, surname for a child, resolved "my school") with a small "guessed" badge.
10.7 Review screen
One card per person, each field editable inline, with a toggle to include or skip the whole card.
A list of contexts (matched or new) and memberships.
Relationships shown as plain sentences, for example "Sanket Bobhate is the husband of Tarika Bobhate", each with edit and remove.
A "Possible matches" strip when something looks like an existing person. Never auto-merge uncertain identities based on fuzzy name matching.
Bottom bar: "Save 3 people and 5 links" and "Discard". After saving, a toast offers Undo for the whole batch.
10.8 Safety rules
Smart capture can add new records, fill empty fields on existing people, and append to notes. It Never overwrites a filled field. For notes, preview appended text and allow deselection.
Undo soft-deletes records created by the batch, unless another later operation has changed or linked to them. It restores only fields still matching the post-capture version; later user edits and synced changes are never silently overwritten. If unsafe, present a conflict with options to keep current data or review manually. Test this.
10.9 Cost and difficulty, honestly
The AI call is the easy part. The work is in the resolver, the review screen and undo. That is why Phase 7 is the largest phase. The review screen is the safety net for any AI mistake.
---
11. Screens and design system
Mobile first. Design for one hand, bright sunlight and a quick glance. The look: calm, modern, soft, photo-first. Think of Apple Contacts, Things and Linear on a phone, with a little warmth.
11.1 Navigation
Bottom bar with four items: Search (home), Add (a raised round accent button in the centre), Browse, Settings. The bar has a soft blurred background.
11.2 Design tokens
Token	Light	Dark
Background	#FAFAFA	#0B0B0F
Surface (cards)	#FFFFFF	#16161D
Text	#18181B	#F4F4F5
Muted text	#71717A	#A1A1AA
Border	#E4E4E7	#27272A
Accent	#4F46E5	#818CF8
Accent soft background	#EEF2FF	#1E1B4B
Danger	#DC2626	#F87171
Type: system UI font. Page title 28/34 semibold, body 16/24, caption 13/18, section labels 12 uppercase with letter spacing in muted text.
Spacing on a 4 px grid. Page side padding 16. Cards radius 20. Bottom sheets radius 28 at the top. Chips fully rounded.
Cards in light mode: border plus a soft shadow (0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)). In dark mode: border only.
Avatars: photo, or initials on one of eight soft colours chosen by a hash of the name, so the same person always gets the same colour.
Motion: 150 to 200 ms ease-out for sheets, taps and list changes. Respect "reduce motion".
Tap targets at least 48 px. Body text at least 16 px. Follow the phone's font size and light or dark mode.
Use bottom sheets instead of full-page dialogs for pickers.
Friendly empty states with one line and one action.
11.3 Screens
Search (home): big title, pill search box focused on open. Result cards: 56 px avatar, name, the "why it matched" line in accent colour, small category chip. Empty search shows recent people and context chips.
Person profile: large photo, name, nickname and "née" name, category. Actions: Call, WhatsApp, Copy number. Sections: Family and relatives (tappable cards such as "Wife: Meera Joshi"), Known through (contexts with roles), How I know them, Notes. Buttons: Edit, Add relative, Add to a context.
Add: Smart capture box by default (section 10), with a link to the quick form. Quick form: photo, name, "How do I know them?" (pick a context or type a line), optional "Related to". Buttons: Save, Save and add another. A "More details" fold-out holds phone, city, birthday, notes, nicknames.
Review (after Smart capture): section 10.7.
Browse: tabs Contexts and Categories, with counts. Context detail lists members with roles and has "Add person here".
Settings: Sync, Backup (export JSON, CSV, vCard, import), Smart capture settings, About you (Me profile), Storage status, About with version.
A hidden `#/design` page showing every component in light and dark, for design review.
11.4 Windows layout
On wide screens, use two columns: search and results on the left, profile on the right. The mobile layout is the priority.
---
12. Sync design (Dropbox)
Inside the app's own folder (`/Apps/<app name>/`): `data.json` (everything except photos and device-only settings, including records marked deleted) and `photos/<person id>.jpg`.
How a sync works:
Download `data.json` and note its revision (`rev`).
Merge with local data. For each record ID, compare local and remote updates with a stable tie-break rule. Keep device-local last-synced record fingerprints to detect concurrent changes against a common baseline; never sync that device-local bookkeeping as ordinary contact records. For non-conflicting records, keep the newer `updated_at`, but remember that device clocks may differ. When the same record was edited independently on both devices since the last successful sync, do not silently discard one version: keep one active version, preserve the losing version in a local recoverable conflict copy, and show a "Review sync conflicts" notice with both versions. A deletion competing with a concurrent edit needs the same recovery treatment. A tie must resolve deterministically using stable device/change IDs, never random arrival order. This is still record-level merging, not an expensive full collaborative editor.
Save the merged result locally.
Upload the merged file using Dropbox's update-only-if-revision-matches mode. If Dropbox says it changed meanwhile, repeat from step 1, up to 3 times; if unresolved, keep local edits intact and show a retryable error.
Upload new or changed photos. Download missing photos.
When it runs: on app open, about 5 seconds after an edit, when the app returns to the foreground, and on "Sync now". Offline: skip quietly and retry later.
Rules:
Ordinary updates merge per record; concurrent edits are preserved for manual review. Newest timestamp alone is not sufficient to guarantee no data loss.
The merge is a plain function with automated tests. Mistakes here lose data.
Never replace local data with an empty remote file. If the remote file is missing, upload. If local is empty and remote has data, download.
Before the first sync on a device that already has data, make a recoverable local snapshot inside IndexedDB and invite the user to download a JSON backup. Browsers cannot reliably save a file silently to a chosen folder.
Sign-in uses PKCE with `token_access_type=offline`. No app secret in the code. The Dropbox App key is not secret.
Never claim that the remote copy is safe until the Dropbox revision upload succeeds. Show last successful sync, unsynced changes and actionable errors.
Preserve tombstones long enough to sync deletions across dormant devices; do not garbage-collect tombstones in v1.
Protect against malformed remote JSON, unsupported future schema versions, missing or corrupt photo downloads and mid-sync failures. Keep the previous valid local state and allow retry.
Avoid duplicate auto-sync requests racing each other. One sync cycle at a time per device.
Photos use a manifest or deterministic hashes to detect changes and deletions; do not reupload every photo on every sync.
---
13. Backup and export
Built before Smart capture and sync, because both write a lot of data.
Export JSON: all data and photos (photos as base64 text). This is the full backup.
Export CSV: people, contexts, memberships and relationships as separate files in one ZIP.
Export vCard: people with phone numbers.
Import JSON: validate format/version and content, preview counts and duplicates, ask whether to merge or replace (default merge). Before replace, require a successful downloadable backup and explicit typed confirmation. Do not accept malformed or oversized imports that could corrupt the database.
A small notice in Settings if the last confirmed downloaded export is more than 30 days old. No pop-ups. Keep a "Backup now" button visible while sync is unconfigured.
Exports never include the API key.
Suggested habit: save the monthly export into `D:\Dropbox\People Memory App\backups\`.
---
14. Build phases
Each phase has Tasks, Cline self-checks, and Phone checks. Test with fictional data until the Phase 11 import has been reviewed. Do not ask Varun to clear real data as a casual phone check. Cline works through the tasks in order, commits after each, and ticks it off in `PROGRESS.md`. Apply the coding-first testing workflow in section 1.2: automated tests, typecheck, production build and independent PR review are required for every phase. Defer all manual Phone checks, including critical backup/restore, Dropbox sync and Airtable migration acceptance, until coding is complete; retain them as mandatory release blockers and never mark unverified checks as passed. Use fictional data only until real-data safety checks pass. All deferred manual checks must pass before release. Do not start a phase until the previous phase has passed its required automated checks and independent review and Varun authorizes progression.
Phase 0: Accounts and workspace (Varun, guided by ChatGPT one step at a time)
Create a GitHub account if needed. Do not add a payment method. Already completed.
Create the public repository `people-memory` with a README. Already completed.
In the repository, add: `docs/ROADMAP.md` (this approved v3 text, not v2), `.clinerules` (section 15), `PROGRESS.md` (headings: Latest report, Current phase, Done, Known problems, Decisions made), and `.devcontainer/devcontainer.json` that installs the Cline extension and uses Node LTS. Add an MIT `LICENSE` after Varun confirms the choice, otherwise flag that the public repo is not yet open-source. Never put actual private profiles or photos in the public repo.
In repository settings, set Pages source to GitHub Actions.
Open a Codespace on the repository.
In the Codespace, sign in to Cline, set the provider to Cline, and pick a model tagged FREE. If sign-in does not work inside the browser Codespace, try the Cline provider with an OpenRouter free model and an API key, or switch to the local fallback (Appendix C).
Turn on Cline auto-approve for reading and editing files inside the repository and reviewed safe commands only. Never auto-approve permission changes, secrets, publishing private data, destructive commands, or spending.
Create the Dropbox folder structure from section 7.3 and save this file in `docs\`.
Test: ask Cline "Reply with the text of the first heading in docs/ROADMAP.md".
Done when: Cline answers correctly from inside the Codespace and the roadmap is v3. The repository may already exist, so never recreate or overwrite it blindly.
Phase 1: Empty app, design system and live install
Tasks:
Scaffold Vite, React and TypeScript in the repository root. Add Tailwind, React Router (hash mode), vite-plugin-pwa, Vitest, zod, lucide-react and sonner. Pin exact versions.
Add shadcn/ui style building blocks as local files: Button, Input, Sheet or Drawer, Dialog, Tabs, Chip, Avatar, Card, Toast.
Implement the design tokens from 11.2 as CSS variables with light and dark modes.
Build the bottom navigation and four placeholder screens (Search, Add, Browse, Settings).
Build the hidden `#/design` page showing all components.
PWA: name "People", icons (generate simple placeholder icons with a script), standalone display, offline caching, and an "Update ready, tap to refresh" toast.
Show the app version (from `package.json`) in Settings.
GitHub Actions: install, typecheck, test, build, deploy to Pages on `main`. Set the Vite base path from the repository name.
Fill in `PROGRESS.md` and write the first report.
Self-checks: typecheck, tests and build pass. The Actions run is green (use the `gh` command). The Pages address responds.
Phone checks: open the Pages address, install from the Chrome menu if offered (otherwise use Add to Home screen), open from the home screen, open it again in airplane mode after the first online load, and look at `#/design` in light and dark mode. Check that no update loop or empty screen occurs.
Phase 2: Data layer
Tasks:
Dexie database with the tables in section 8 (people, contexts, memberships, relationships, photos, capture batches, device settings).
Typed helpers to create, update and soft-delete each type. Updates always refresh `updated_at`. IDs use `crypto.randomUUID()`.
`src/domain/relationships.ts` with types, reverses and labels, plus tests.
`src/domain/names.ts` that normalizes text (case, accents, spaces, works with Devanagari), plus tests.
Settings (developer section): "Load sample data" using section 16.1, "Delete all data" with confirmation, and counts of records. Mark dangerous tools "Test data only" and prevent one-tap wiping of real records. Request and display persistent storage permission here, not only in Phase 12.
Unit tests for create, update, soft delete.
Self-checks: all tests pass.
Phone checks: load fictional sample data, close the app, reopen, and the counts are still there. Check persistent storage status and document fictional Airtable field mapping requirements.
Phase 3: People, photos and quick add
Tasks:
Quick add form (11.3 item 3) with the camera or gallery photo picker and image shrinking.
Person profile and Edit person screens. Delete with a 10 second Undo.
Initials avatars with hashed colours.
The Search tab shows a plain list of all people for now, newest first.
Keep implementation files under 250 lines when practical; do not split simple test/config/data files merely to meet an arbitrary line count.
Phone checks: add a fictional test person with a photo or placeholder in under 20 seconds, then reopen the app and see them. Do not enter real personal data before backup/export and privacy review are ready.
Phase 4: Contexts, relationships and the Me profile
Tasks:
Context picker and creator inside Quick add and the profile.
Browse screen and Context detail screen.
"Add relative" sheet: choose a person (or create one) and a relationship type. Store one row and show the reverse automatically.
First-run setup for the Me profile (8.8). Use a fictional Me identity for development until real-data onboarding; never wipe records created in Phase 3.
Profile sections for Family and relatives and Known through.
Self-checks: adding "Anil is the spouse of Meera" shows Husband on Meera's page and Wife on Anil's, with one stored row.
Phone checks: run the first-run setup, add a relative, add a context.
Phase 5: Search
Tasks:
MiniSearch index as in section 9, built in memory.
Matching rules (9.2) and the "why it matched" line (9.3).
Empty-search recents and context chips (9.4).
Vitest tests for every scenario marked Search in section 16.2.
Self-checks: all search tests pass.
Phone checks: try five real searches from the list in section 2.
Phase 6: Backup, export and import
Tasks: the four exports and the import in section 13, the 30-day notice, and a test that exports sample data, wipes, imports, and compares for equality.
Self-checks: the round-trip test passes.
Phone checks: export the fictional test dataset, clear test data only, import, and confirm every person, photo and relationship returned. Confirm import refuses bad JSON and replace asks for a backup.
Phase 7: Smart capture, copy and paste mode
Tasks:
zod schema for the JSON in 10.4, and a forgiving parser.
`src/capture/prompt.ts` that builds the prompt (10.4 rules and 10.5 setting).
Add tab: Smart capture box as the default, copy button, paste box, "Read it" button.
Resolver (10.6) with tests using the golden examples in 16.3 as mocked AI answers.
Review screen (10.7) with inline edits, include or skip toggles, guessed badges and possible matches.
Save as one batch, with Undo (10.8).
Settings: surname rule toggle.
Self-checks: the golden tests pass, including the Sanket example resolving "school" and "college" from the Me profile, and an undo test that restores everything.
Phone checks: do the Sanket example with a real chatbot using the copy and paste route, review, save, undo, save again, and find Sanket by searching "Tarika".
Phase 8: Smart capture, automatic mode
Tasks:
Provider settings: Gemini or OpenRouter, API key, editable model name, and a "Test" button. Keys stay in device settings only.
One-tap "Draft it" that sends the prompt from Phase 7 and feeds the answer to the same parser.
Clear errors for: no key, quota used up, model not found, request blocked, bad JSON. Each offers the copy and paste route.
The one-time privacy notice (10.2).
Verify with a real call that the browser is allowed to reach the provider. If it is blocked, report it and keep Mode A only.
Self-checks: tests with mocked responses and mocked errors pass.
Phone checks: with a working free key, and only fictional text, the Sanket example works in one tap. With no key, the app suggests copy and paste. Canceling consent sends nothing.
Phase 9: Dropbox sync
This is the hardest phase for a beginner, so Varun's part is small and clearly marked. Do Appendix B first.
Tasks, in order:
Dropbox sign-in with PKCE and an offline refresh token, and "Connected as <name>" in Settings.
Upload and download `data.json` with the revision check.
The merge function with tests: both sides edited, one side deleted, empty remote, empty local, same-time edits, device clock skew, invalid remote file, lossless conflict recovery, interrupted upload, token expiry and repeat-sync idempotence.
Photo sync, the triggers from section 12, and "last synced" display.
Phone checks: add a fictional person on the phone, tap Sync now on the PC, and the person and photo appear. Edit the same test person differently on both devices offline, sync both, and confirm the conflict is recoverable rather than silently erased. Verify delete versus edit and photo deletion on test records.
Phase 10: Polish and Windows layout
Tasks: walk through section 11 line by line and fix tap sizes, dark mode, empty states, motion, and spacing; build the two-column wide layout; review the `#/design` page.
Phone checks: use the app for a full day and write down a short list of irritations. Paste screenshots into ChatGPT for a design review against section 11.
Phase 11: Import from Airtable
Earlier dependency: In Phase 2, Cline documents an example mapping using fictional Airtable column names and redacted headers if available, noting any unmapped relationship direction or attachment fields in `PROGRESS.md`. This is a schema rehearsal, not a real data import; resolve incompatible requirements before building full import.
Varun exports each Airtable table as a CSV. Tasks: an import screen that maps columns, shows a preview, flags possible duplicates, and imports. Organizations, Groups, School and Society columns become Contexts with the right `kind`. For Relationships rows, show a preview with a "flip direction" switch, and ask Varun to check one known row. Airtable attachment URLs may expire, so download the actual images while accessible rather than assuming the URLs will remain usable. Never place exports or photos in the public repository. Keep an untouched original export until restore is verified.
Done when: Varun's real data is in the app and the example questions in section 2 get right answers.
Phase 12: Hardening and version 1.0
Tasks:
Confirm persistent storage has been requested (beginning in Phase 2 once data exists) and show the result in Settings; if denied, show a clear backup reminder.
Write `docs/REBUILD.md` and `docs/YEARLY_CHECK.md` in plain language.
Confirm that after the initial app installation/update, the core app makes no third-party network calls; optional Dropbox and user-triggered AI requests are the only data-bearing service calls. Hosting and update checks from GitHub Pages are expected and must not upload contacts.
Zip the final build and attach it to a GitHub Release.
Run the full checklist in section 16 on the phone and the PC.
Tag `v1.0.0`.
Done when: on a spare device, Varun can clear the app's data, reconnect Dropbox, and get everything back.
Phase 13 (optional, after 1.0): Bolt.new comparison
Goal: see how another tool styles the same app, and borrow good ideas.
Use the free Bolt plan. Do not upgrade. Free limits are 1M tokens a month and 300K a day, so keep the prompt short and ask for a front-end mockup only.
Paste the prompt from Appendix A with sample data. No real people data.
Save screenshots into `D:\Dropbox\People Memory App\design\`.
Compare with the real app and note what looks better.
Ask ChatGPT to turn the good ideas into small design changes, and give them to Cline as normal tasks. Do not move code from Bolt into the repository.
---
15. Cline rules file
Save this as `.clinerules` in the repository root.
```text
PROJECT
An offline-first "people memory" web app (PWA) for one user, Varun. The source code is public but users' stored people data is private. He is not a programmer. Explain results in plain, short language.

HOW TO RUN
- When told "Run Phase N of docs/ROADMAP.md": read docs/ROADMAP.md, PROGRESS.md and this file, then do every task of that phase in order, without asking for plan approval.
- If PROGRESS.md shows a half-finished phase, continue it instead of restarting.
- Commit after every finished task with a plain message. Push only when typecheck, tests and build all pass. Check that the GitHub Actions run succeeds.
- At the end, write the report at the top of PROGRESS.md: What was done, Please test (5 checks at most with exact taps), Decisions I made, Need from you (only if blocked).

WHEN TO STOP AND ASK (only these)
1. A missing decision that changes the data model, privacy, or cost.
2. Varun must act himself (Dropbox app, API key, phone test).
3. The same error persists after three different fixes.
4. Anything asks for a credit card, payment method or paid plan.
5. An action could destroy real data.
Everything else: decide, log it under Decisions I made, and continue.

CODE RULES
- TypeScript, React, Vite, Tailwind, Dexie, MiniSearch, zod, Vitest. No own backend, no own server, no app accounts. Optional third-party accounts may be used for sync and AI.
- Any new package needs a one-line reason in PROGRESS.md. Pin exact versions (no caret or tilde signs).
- Keep implementation files under 250 lines where sensible; do not add comments to JSON files (JSON does not permit them). Add one plain-English purpose comment to source files where syntax permits.
- Dates are UTC ISO strings. IDs are UUIDs. Main data lives in IndexedDB through Dexie, never localStorage.
- Never hard-delete ordinary records. Use the deleted flag; explicit test-data reset and confirmed replace-import are exceptional operations requiring confirmation.
- Do not change the data model in section 8 without stopping to ask.
- System fonts only. Load nothing from other websites.
- Dropbox code stays in src/sync/. AI capture code stays in src/capture/. Relationship labels stay in src/domain/relationships.ts.
- API keys and sync refresh tokens live only in device settings, never in the repository, exports, logs, URLs or error reports. Do not mistake IndexedDB for hardware-secure storage.
- The repository is public. Never commit real people data, photos, keys or exports. Use only the fictional sample data.
- Follow the design system in section 11 for every screen.

SAFETY AND COST
- Never add or suggest a paid service. If a free quota runs out, wait or use another free route.
- No destructive commands (delete folders, force push, hard reset) without asking. Never auto-approve a command that can expose secrets or publish real people data.

SELF-CHECK BEFORE FINISHING A TASK
- Typecheck, tests and build pass. The feature works as the phase describes. Tests exist for logic (relationships, search, merge, capture resolver).
```
---
16. Sample data and test scenarios
16.1 Fictional sample data (the Phase 2 "Load sample data" button)
People: Varun Sample (Me, male), Anil Joshi (male), Meera Joshi (female, nicknames "Mera" and "मीरा"), Ketaki Joshi (female), Sunil Joshi (male), Rahul Patil (male), Sneha Patil (female), Dr. Kavita Rao (female).
Contexts: Lionbridge (organization), Sagar Heights Society (society), Fr. Agnel School (school), ICLES College (college), Borli (place), Class 7B parents (group).
Me memberships: Varun Sample at Fr. Agnel School (Student) and at ICLES College (Student).
Other memberships: Rahul and Anil at Lionbridge (Colleague), Meera at Sagar Heights Society (Resident), Sneha at Fr. Agnel School (Parent), Sneha in Class 7B parents (Parent), Dr. Kavita Rao at Fr. Agnel School (Teacher), Sunil at Borli (Resident).
Relationships: Anil spouse of Meera, Ketaki child of Anil, Ketaki child of Meera, Sunil sibling of Anil, Sneha spouse of Rahul.
16.2 Scenarios
No.	Scenario	Expected
1	Search "Meera" (Search)	Meera first, then Anil and Ketaki with lines like "Husband of Meera Joshi"
2	Search "meera husband" (Search)	Anil first
3	Search "Lionbridge" (Search)	Rahul and Anil, "Colleague at Lionbridge"
4	Search "Sagar Heights" (Search)	Meera, "Lives in Sagar Heights Society (Resident)"
5	Search "Mera" (Search)	Meera, through nickname and typo tolerance
6	Search "मीरा" (Search)	Meera
7	Search "7B" (Search)	Sneha, "Parent in Class 7B parents"
8	Search "Borli" (Search)	Sunil
9	Search "Gupta" after the Sanket capture (Search)	Tarika Gupta found by full name (or "née Gupta" only if a reviewed name-change suggestion was accepted)
10	Add a person with only a name and a photo	Saves in under 20 seconds
11	Airplane mode: open, search, add a person	All work
12	Add Anil as spouse of Meera	Husband on Meera, Wife on Anil, one stored row
13	Export, wipe, import	Identical, photos included
14	Add on the phone, sync, open on the PC	Person and photo appear
15	Delete on the PC, sync, open the phone	Gone on the phone
16	Edit one person on both devices offline, sync both	One active version and a visible, recoverable copy of the other; no silent lost edits
17	Clear app data, reconnect Dropbox	Everything synced before clearing returns; unsynced edits cannot be recovered and this limitation is communicated
18	Load 2,000 fake people	Search stays instant
19	Smart capture, Sanket example	Matches 16.3
20	Smart capture, then Undo	Everything created is gone, edited records restored
21	Smart capture with no key set	App offers copy and paste
22	Smart capture mentioning an existing person	Shown as "Possible match", not duplicated
23	Concurrent delete vs edit on different devices	Edited content remains recoverable; no silent permanent loss
24	Smart capture undo after later user edits	Later edits are preserved; conflict is flagged
25	Import invalid or future-version JSON	Refused safely with local data unchanged
26	Clear browser storage before first sync	App explains that unsynced data is not recoverable
27	AI capture cancelled before external request	No passage or directory data leaves the app
28	App offline after first load, with provider unavailable	Local add, search, browse, backup still function
29	Initial fake Airtable mapping rehearsal	Any missing fields or ambiguous relationship directions are documented before Phase 11
16.3 Golden examples for Smart capture tests
Example 1 (the Sanket passage in section 10). Expected default result: people Sanket Bobhate (male, friend), Tarika Gupta (female, surname unchanged), Kiara (female, surname unknown); contexts resolved from Me to Fr. Agnel School and ICLES College; memberships Sanket as Student in both; relationships Sanket spouse of Tarika, Kiara child of Sanket, Kiara child of Tarika, Sanket friend of ME.
Example 2: "Met Rahul Patil at the society meeting, he works at Lionbridge." Expected: existing Rahul matched as a possible match, no duplicate, society context via Me if Varun has one society.
Example 3: "My neighbour Mrs. Deshpande has a son Aditya." Expected: Mrs. Deshpande with gender female, unknown first name flagged in `uncertain`, Aditya as child of her, category Neighbour.
Example 4: a passage mentioning "my school" when Me has two schools. Expected: the review shows a picker.
Example 5: invalid or partly broken JSON with code fences. Expected: parsed where possible, otherwise a clear message.
---
17. Later ideas (not version 1)
Google Drive as a second sync option.
A PIN or fingerprint lock.
Optional encryption of the Dropbox data file.
Birthdays and a "this week" list.
Quiz mode: show a photo, tap to reveal the name.
Phone contact picker where the browser allows it.
More family terms (maternal and paternal relatives, local-language terms).
Last-met date and a short log of meetings.
An in-app microphone button using the browser's speech recognition.
An on-device model for Smart capture, if Android browsers support it well.
A natural-language search box.
---
18. Defaults and open decisions
Decision	Default
App name	"People"
Where to build	Codespaces, with local fallback
Sync	Dropbox
Smart capture	Copy and paste mode first, automatic mode off until Varun adds a key
Wife's surname rule	Off. Optional opt-in suggestion with assumed flags and explicit review
Code visibility	Public repository, no personal data in it
AI provider for automatic mode	Gemini free tier or OpenRouter free model, Varun's choice in Phase 8
Airtable import	Phase 11
---
Appendix A: Bolt.new prompt (Phase 13)
```text
Build a front-end-only mobile web app mockup called "People", a personal directory that helps me remember who people are. No backend, no login. Use sample data.

Screens (bottom navigation: Search, Add, Browse, Settings):
1. Search: large title, pill search box, result cards with a round photo or initials, the person's name, and one line explaining why they matched (for example "Husband of Meera Joshi"). Show recent people when the box is empty.
2. Person profile: big photo, name, family section with tappable relatives (Wife, Daughter), "Known through" section (companies, schools, societies), notes, Call and WhatsApp buttons.
3. Add: one big text box "Tell me about someone", a Draft button, and then a review screen with editable cards for each person found, plus relationship sentences like "Sanket Bobhate is the husband of Tarika Bobhate", with a Save button.
4. Browse: list of schools, colleges, companies and societies with member counts.

Style: modern, calm and slick. Light and dark mode. Accent colour indigo (#4F46E5). Large rounded cards, soft shadows, bottom sheets, smooth 150 ms transitions, system fonts, large tap targets, one-handed use. Use only fictional sample data.
```
Appendix B: Dropbox app setup (Phase 9, Varun does this once)
Sign in at dropbox.com/developers and choose Create app.
Pick Scoped access, then App folder, and give it a unique name.
On the Permissions tab, enable `files.content.read` and `files.content.write`, then save.
On the Settings tab, add two redirect addresses: the app's GitHub Pages address, and `http://localhost:5173` for local testing.
Copy the App key into `src/config.ts` (ChatGPT or Cline will say exactly where). The App key is not secret.
Appendix C: Local fallback on the Windows PC
Install Visual Studio Code, the current LTS version of Node.js, and Git for Windows.
Clone the repository into `C:\Projects\people-memory` (outside Dropbox).
Open the folder in VS Code, install the Cline extension, and sign in.
Everything else in this roadmap works the same. Push to GitHub as usual so the phone still gets updates through Pages.
Appendix D: Short glossary
PWA: a website that installs like an app and works offline.
IndexedDB: the database built into every browser. Dexie makes it easier to use.
Service worker: a small script that lets the app load without internet.
Local-first: the device holds the main copy of the data, and the cloud is only for syncing.
OAuth and PKCE: a safe way to let the app use your Dropbox without your password.
Git, commit, tag: a history of the project. A commit is a save point and a tag is a named save point.
Codespace: a development computer on GitHub that you use through the browser.
Build: turning the source code into the final files that run in the browser.
Merge: combining changes from two devices into one version.

---
Appendix E: V3 acceptance and safety checklist (Cline reads this alongside the applicable phase)
Public repository contains only source, docs, fictional sample fixtures and non-sensitive config. No personal names from real import, images, tokens, exports, screenshots of real profiles or source passages.
An HTTPS-hosted PWA is not a private website: its code can be opened by anybody, while IndexedDB records stay only in the user's browser unless explicitly synced or submitted to an AI service. Browser extensions and local device access remain risks.
Use Content Security Policy where compatible with GitHub Pages, escape user-controlled strings, do not render imported HTML, do not log imported content or AI prompts, and never include credentials in third-party requests other than to their intended provider.
Sync records must be schema-versioned and validated. A newer unsupported schema pauses import/sync rather than discarding fields.
Ensure a successful import/export round trip before any destructive migration, including photos, links, tombstones and Unicode names.
Backups are valuable only if they restore: rehearse backup restore on fictional data and never test wiping real contacts.
Use a single stable production origin for the app once real records exist. Moving from GitHub Pages to another domain creates a different browser database and needs explicit export/import migration.
On a fresh device with Dropbox disconnected, do not imply data from another device is available. Explain local-only, last backed up, and last synced status plainly.
A photo import must not depend on a temporary third-party URL remaining valid. Keep binary image content in a local backup or authorized sync.
Any change to the data model, privacy policy, costs, or phase order still requires Varun's approval. Cline cannot treat this appendix as permission to make new product decisions.
Roadmap status: v3 delivered for Varun to adopt. Copy this exact file as `docs/ROADMAP.md` in GitHub and replace the ChatGPT Project roadmap; keep the v2 file as an archive.
