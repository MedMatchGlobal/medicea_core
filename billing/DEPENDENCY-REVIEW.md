# Dependency advisory exposure review — 23 November 2026

This is a bounded source/build review. It does not suppress scanner findings,
assert that the whole product is vulnerability-free, or authorize public launch.

## Remediation already applied

Both web apps use Next.js 15.5.29 and the compatible PostCSS 8.5.33 security patch.
The owner console npm audit reports zero findings. Removed the unused legacy
Capacitor asset generator (including its vulnerable nested tar/tooling tree) and
unused AI SDK. The custom SVG branding renderer remains the asset workflow.
Compatible dependency fixes were applied without force/major framework, Prisma
or provider SDK migrations. No medical prompt, model setting or provider request
routing was changed.

## Remaining findings and observed reachability

| Advisory path | Observed use | Assessment limits |
| --- | --- | --- |
| Prisma CLI -> @prisma/config -> deepmerge-ts / Effect | Prisma CLI is development/build tooling. Runtime uses @prisma/client with parameterized billing SQL. No application import of the CLI/config/merge/schema packages was found. | Build-time exposure remains; malformed/untrusted local configuration must not be processed. A supported toolchain migration or targeted vendor-supported fix remains maintenance work. |
| OpenAI SDK -> Zod | The SDK is development-only and app/lib/openaiClient.ts imports it with import type. Actual requests use the existing plain-fetch transport and the unchanged preview routing. No app import of Zod was found. | Type-only use does not remediate an installed development package. Do not begin executing the old SDK/schema helper without reviewing/upgrading it. |

An AST scan over app/, lib/ and scripts/ found only the type-only OpenAI import
among these package names. A separate check of 52 Next.js server file-trace
manifests found none of node_modules/prisma, @prisma/config, deepmerge-ts, Effect,
OpenAI SDK or Zod in those traces. This supports an inference that the specific
flagged installed package paths are not shipped in those server functions.
It is not a proof about every bundled/transformed library or future release.

The app's npm report can still attribute optional-peer/development tool paths to
runtime dependency graphs. Keep the actual advisory report and trace evidence;
do not describe that report as zero findings. Review any newly reachable path,
SDK use or toolchain upgrade before public launch. No approval for accepting an
unrelated production risk is implied by this protected-preview work.

Primary advisory references:
- https://github.com/advisories/GHSA-ggr8-5vv4-36mx
- https://github.com/advisories/GHSA-7589-6fvf-x4pw
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- https://github.com/vercel/next.js/releases/tag/v15.5.29
