# Legacy GPT-6.1 Sol comparison — 21 October 2026

The owner requested an isolated development identical to the tested legacy deployment, changing only GPT-4o to GPT-6.1 Sol.

Vercel deployment `vh9351WZiGbGRjaitnVB7is1pf7w` confirms that `medicea-core-mllvlbrdc-medmatchglobals-projects.vercel.app` was built from `48eff0c4967544f1dd9a5e3c17a163e6f403cd2c`, on `investigation/price-only-20261020`. The new branch `experiment/legacy-sol-model-only` starts from that exact commit, excluding the later uncapped-price patch.

Only `app/lib/openaiClient.ts` differs among application/configuration/dependency files. Prompts, routes, UI, original navigation, matching, text formatting, price generation, validation, caches, request deadlines and credential failover are untouched. Existing non-GPT-4o pinned models remain unchanged. This branch does not enable the research-based leaflet, source matching, new price lookup or Travel experiment.

The transport override activates only in Vercel Preview on this exact new branch. It maps `gpt-4o` to `gpt-6.1-sol`. A live one-word compatibility probe established:

- Keeping the legacy temperature returns HTTP 400, `unsupported_value`, parameter `temperature`.
- Removing temperature while retaining the original seed returns HTTP 200 from `gpt-6.1-sol`.
- No explicit reasoning effort is added; Sol uses its default.
- Where a legacy GPT-4o request specifies `max_tokens`, the same numeric budget uses Sol's `max_completion_tokens` parameter.

These are API compatibility adjustments for the requested model swap. There is no prompt rewrite, new search restriction, timeout extension or additional workflow.

## Verification

- 220 tests pass, including the protected prompt fixture and new model-only/branch-isolation tests.
- Production build and TypeScript checks pass.
- The legacy freeze check for a different experiment was not run as an acceptance check: it intentionally forbids this newly authorised transport change. A dedicated regression check instead verifies that only the transport application file differs from the exact legacy deployment commit.
- Live handler tests use fixed public UK/Italian medicine examples and the unchanged legacy deadlines. Results are reported separately; passing offline tests does not guarantee provider latency or price accuracy.

The original legacy deployment, frozen researched Dev deployment, and price-only investigation remain separate and unchanged.

Official compatibility reference: https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6.1-sol
