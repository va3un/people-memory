# Optional automatic capture (Phase 8)

Copy/paste Smart Capture works without any API key, including offline after installation. Automatic capture is off by default. It requires your own free provider account/key, an editable model ID, explicit sharing consent and a successful provider Test. There is no app backend, SDK dependency, paid plan requirement or automatic fallback to a paid model.

## Verification status

Coding and mocked automated/browser checks are complete. A live provider call has **not** been verified: this coding environment has no configured API key and its enforced network policy does not allow the provider API hosts. Mocked replies do not establish real CORS, account eligibility, model availability or free-tier access. Keep using copy/paste until Test succeeds in a browser/network that can reach the chosen provider. Independent PR review and the deferred real-provider/manual tests remain mandatory release blockers.

Do not paste an API key into this document, the repository, an issue, a PR or this chat. Enter it only in the app's device-only Settings when doing the deferred fictional-data verification. Never add a payment method, buy credits, link billing or upgrade to complete a test. If free access is unavailable, wait or use copy/paste.

## Settings and request flow

1. Open Settings, Optional automatic capture. Choose OpenRouter or Gemini. Enter a free API key and a model ID currently available free to that account. Model names are not pinned/defaulted because provider availability changes.
2. Confirm the free account has no payment method, purchased credits or linked billing. Enable automatic capture and Save provider settings. Saving/opening settings makes no API call. Keys are masked in the form and stored unencrypted in IndexedDB deviceSettings only, alongside configuration/consent/verification metadata. They are excluded from full JSON backups, CSV/vCard and sync. A device/browser reset does not recover the key from a directory backup.
3. Tap Test. Before the first external request, read the exact sharing notice and the displayed fictional test passage. Cancel sends nothing. Explicit agreement sends only extraction instructions and that fixed fictional passage. Test must receive a bounded valid schema-1 capture answer before the saved configuration is marked verified; it creates no people, contexts, relationships or capture batch. Test proves a request and valid response for those settings, not the factual accuracy of future AI answers.
4. In Add, enter a fictional passage and tap Draft it. Only your passage and the Phase 7 instructions are sent. Saved people, photos, Me, contexts and device settings are not included. Matching and Me-context resolution happen locally after the response. The same parser, editable review, conservative batch save and conflict-aware Undo are used as copy/paste. Nothing is saved until you tap Save in review.
5. Provider/model/key/free-account/enablement changes clear consent and verification. Reload saved provider settings resolves stale form edits. Remove provider key and permission deletes this app's saved configuration and returns automatic mode to off. Pending requests are aborted/discarded when permission changes. Removal does not revoke the key at the provider or recall information already sent.

The one-time notice is bound to the saved provider configuration; every subsequent request still needs an explicit Test or Draft it tap. There are no requests on page load, save, reconnect, focus or typing. Cancel and a 45-second timeout abort pending requests; late results are discarded. One request can run per app page at a time, without automatic retries. Copy/paste remains visible after every error.

## Free-only restrictions and privacy

OpenRouter accepts only `openrouter/free` or a current model ID ending exactly in `:free`. Requests contain one model, no model fallback array, no plugins/tools and disabled provider fallback. Paid/auto routing model IDs are rejected. Gemini accepts a model identifier, not a URL; use a model actually offered on the free tier of a project with billing disabled. This app cannot independently inspect an account's billing configuration, so the free-account confirmation is necessary and is not a remote billing guarantee. Provider pricing, limits and terms can change.

Only fixed HTTPS OpenRouter and Gemini endpoints are allowed. Keys use Authorization or x-goog-api-key headers, never URL query parameters or prompt bodies. Requests omit browser credentials/referrers, disable caching and refuse redirects. Production CSP allows only these two external API origins for connections. No third-party scripts, fonts or analytics were added. Provider error bodies, browser exceptions and reflected key content are not shown or logged. Responses are bounded to 512 KiB, extracted capture JSON to 256 KiB, and requested output to 8,192 tokens. Truncation, invalid JSON/refs/versions, empty answers and oversized responses cannot bypass local review.

Quota/credit-required responses offer waiting or copy/paste, never upgrading. Model errors offer editing the model and re-testing. Network/browser/provider blocking or rejected authorization invalidates verification, leaving copy/paste available until another successful Test. Partial/failed requests never write directory records. Cancellation cannot make a provider forget a passage already received.

## Automated checks and release blockers

`npm run typecheck`, `npm test`, `npm run build` and browser suites for Phases 3–8 use fictional fixtures only. The Phase 8 script intercepts provider requests; it checks both wire formats, consent cancellation with zero requests, no-key/off behavior, no directory/key in payloads, quota/bad-JSON/blocked errors, no retries, shared review/save, cancellation/late answers, cross-tab revocation and offline copy/paste. These are mocked-provider tests, not a successful live call.

All manual acceptance remains deferred until coding is complete and blocks release: actual free-key/model/CORS verification with fictional Sanket text, one-tap review/save/Undo, no-key and cancelled-consent checks, physical-phone UI/offline behavior, critical backup/restore, later Dropbox sync and Airtable migration safeguards. Use fictional data until real-data safety checks pass. Phase 9 adds separate optional Dropbox sync/recovery; its actual-service checks are also unverified release blockers. Deployment is not part of this work.

## Official references checked 29 October 2026

- [OpenRouter free-model routing](https://openrouter.ai/docs/guides/routing/routers/free-router) and [free catalog](https://openrouter.ai/collections/free-models): free-only IDs, availability and routing.
- [OpenRouter limits](https://openrouter.ai/docs/api-reference/limits): quotas and credit/rate-limit responses. This app does not purchase credits to increase limits.
- [Gemini generateContent REST guide](https://ai.google.dev/gemini-api/docs/generate-content/get-started): the documented stateless REST interface is used without an SDK or stored conversation.
- [Gemini billing](https://ai.google.dev/gemini-api/docs/billing) and [pricing](https://ai.google.dev/gemini-api/docs/pricing): only certain models/accounts have free access; linking billing changes the tier. No specific model is promised to remain free.
