# Owner search evaluation

The Travel Preview includes `/travel/evaluation`, an English-only owner console. Unlock `/travel` first. It uses the same signed session, exact-branch and configuration gates; Production returns 404. Merely opening or reloading the console performs no medicine research. Results are public fixed fixtures stored only in this tab session and downloadable as JSON. This does not modify My medicines or saved comparisons.

## Controlled baseline

Run twelve sequential trials: three repeats of each of two fixed public cases through each path, interleaved by repeat and case. The cases are Co Efferalgan Italy 500 + 30 → UK (film-coated origin selected explicitly in the experiment), and Co-codamol UK 8/500 tablets → Italy (strength negative control). Arbitrary medicines, patient fields and caller-defined prompts cannot be supplied. The endpoint has an eighteen-trial/hour per-instance backstop in addition to existing owner request limits. These are not distributed billing caps.

The Production baseline invokes the original equivalent-search handler inside Preview. An AsyncLocalStorage context disables model migration for that request only, preserving original prompt payloads, GPT-4o model, temperature and seed. It does not call the Production website, change environment variables or switch other requests. Its legacy ten-second provider attempt remains in place. Trials stop on provider errors or ambiguous timeouts without automatic key retries, bounding speculative duplicate charges; this failure policy differs from normal Production failover and must be considered when comparing error rates.

The experimental arm uses the existing source-origin lookup, selects the fixture formulation, then invokes the current experimental candidate handler with the signed origin. Each trial starts cold. Existing prompts, models and composition checks are unchanged. Ambiguous/unconfirmed origin selection is reported as a trial failure, not automatically substituted.

## What is measured

- Full trial elapsed time, each provider request duration, status and finish reason.
- Returned input, output, cached and reasoning tokens, and web-search call count. Missing usage is unknown, not zero; token counts do not include a final dollar/tool-fee bill.
- Production's filtered raw list and the experiment's accepted list.
- Experimental generated candidates, ingredient/strength/form descriptions and existing filter rejection reasons. This observes the filter without loosening it.
- Whether the known UK Zapain/Co-Codamol reference is mentioned; whether the 500/8 negative control mentions Co-Efferalgan. These are discovery flags requiring manual review, not clinical pass/fail criteria or an exhaustive reference set.

References: manufacturer SmPC on emc for [Zapain/Co-Codamol 30/500](https://www.medicines.org.uk/emc/product/100530/smpc) and [Co-codamol 8/500 tablets](https://www.medicines.org.uk/emc/product/5958/smpc). Additional expected products need independent source review before defining a coverage score. Brand aliases and registrations must not be counted as distinct products without checking them.

Aggregate latency alone is insufficient: inspect each fixture separately and include failed trials. Three repeats provide an initial diagnostic, not a statistical reliability guarantee. Do not promote an experiment based on a longer list or one successful response. No public or clinical release is authorized by this test.

## Validation

Unit coverage checks actual original prompt/model payloads, concurrent request isolation, usage extraction, explicit-only fixed cases, candidate rejection diagnostics, authentication/input bounds and Production/flag-off exclusion. Mocked browser checks cover the twelve-trial plan, no automatic paid requests, result download/persistence and phone/desktop layout. Live results must be reviewed separately; successful mocked tests are not live efficacy evidence.
