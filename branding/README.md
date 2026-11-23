# Owner-supplied branding

On 23 November 2026 the owner selected **Medicea Logo_A.jpg**, with the blue/teal
wordmark, registered mark, “Your Health. Without Borders.” tagline, arrow and
capsule, for use throughout medicéa.

The matching **Medicea Logo.svg** in the same supplied `New Logo` folder is used
as the source. It preserves the artwork as supplied, including original colours
and the registered mark. The SVG viewBox removes unused canvas without redrawing
the design. Full lockup: `public/brand/medicea-logo.svg`; inline wordmark crop:
`public/brand/medicea-wordmark.svg`; small app/browser icon crop:
`public/brand/medicea-icon.svg` (the supplied capsule).

`scripts/render-brand-assets.cjs` exports browser/native PNG and ICO assets by
rendering these SVGs. It also copies the assets to the separate admin console.
It requires Playwright and installed Chrome; set MEDICEA_PLAYWRIGHT_PATH if the
runtime provides Playwright outside this repository.

This updates release source assets and previews. It does not upload a Google Play
release, replace external store-listing graphics, or change live Stripe branding.
