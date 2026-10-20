# Owner-verified working Dev freeze

Sergio confirmed on 20 October 2026 that the restored leaflet and equivalent searches work and requested a complete freeze before further price work.

- Frozen commit: `933511cd5115a507c9a04f846640eb5c813e4938`.
- Named checkpoint: `medicea-dev-locked-20261020`.
- Owner-verified deployment: https://medicea-core-b4octdy5f-medmatchglobals-projects.vercel.app/
- Working branch: `feature/travel-pack-preview` — leave at this commit.
- Separate investigation branch: `investigation/price-only-20261020`.
- Application code matches the 11:55 BST checkpoint `cc2a7855218c0749c30f88db372b9ddf792ff94b`.

The Git commit preserves the full source tree; the named tag provides a recovery reference. The existing 10:00 BST leaflet prompt backup remains separately preserved. The immutable deployment URL is the link for testing the frozen version, rather than a branch alias which can follow future pushes.

`node scripts/check-dev-lock.cjs` checks all protected application files against the frozen commit, including untracked application additions. `--price-only` allows only the isolated price module to differ. No leaflet generation, equivalence, UI, model, source-validation or research-limit changes are permitted by this freeze. The guard and owner instructions are repository safeguards; they do not change GitHub access controls or Vercel settings.

Any future price patch must be reviewed separately and must not be deployed to the working Dev branch without Sergio's explicit approval. No price code changed when creating this freeze.
