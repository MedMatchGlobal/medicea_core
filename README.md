This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

Deployed with new pill-button layout — 15.11.2025.

## Private health preview: scope and verification

The `feature/private-vault-preview` branch remains a fictional-data preview. Its
account, authenticator, recovery/help and vault interfaces support the same 25
languages as the homepage. Generic interface catalogs are stored locally in
`app/health-i18n/catalogs`; there is no runtime translation API call for patient
content. Language selection uses the existing `medicea.lang` preference. Arabic
and Hebrew use right-to-left layouts; email and verification codes stay left to
right. Recovery-code availability remains gated exactly as before localization.

### What the completed checks establish

Sergio supplied mobile screenshots and confirmations on 9 October 2026 for the
`cit9vd019` deployment: medicine save/remove and document upload/delete persist
after refresh; a second account cannot list the first account's medicines or
documents; the original account can download its file; the second account is
denied when opening the original account's copied download URL. These are
user-performed checks, not independently executed live tests. They apply to that
deployment, not automatically to a later commit or every future health feature.

| Feature | Implemented in this branch | Scope of evidence / further work |
| --- | --- | --- |
| Medicine list | Fictional name, strength and notes; save/remove | Persistence and list isolation checked live; action validation and MFA tested automatically |
| Private documents | PDF, JPEG, PNG up to 50 MB after new migration; upload/download/delete | Persistence, owner download and other-account list/direct-link denial checked live |
| Prescription attachment | Uses the ordinary supported-file route | Storage controls apply; no prescribing, dispensing, renewal or clinical validation workflow |
| X-ray attachment | An ordinary JPEG/PNG/PDF within the limit | No DICOM, diagnostic viewer, image interpretation or specialist imaging workflow |
| Appointments | Not implemented in this branch | Fictional prototype exists separately; persistence, ownership, date/time, status and reminder tests still needed |
| Therapies | Not implemented in this branch | Fictional prototype exists separately; courses/sessions, relationships, persistence and access tests still needed |
| Profile and other My Health modules | Not implemented in this branch | Each needs its own data model, authorization, validation, lifecycle and UI tests |

The broader My Health prototype must not be presented as connected private
storage. Localization of the working screens does not make those prototype
features ready. User-entered titles, medicine names, notes, files, email addresses
and authenticator secrets are not translated.

### Verification commands

```bash
node --test tests/backup-authenticator-security.cjs tests/recovery-security.cjs tests/vault-security.cjs tests/medicine-security.cjs tests/document-download-security.cjs tests/health-localization.cjs
node node_modules/next/dist/bin/next build
```

Catalog checks cover all 25 languages, key coverage, placeholders, numeric limits,
support addresses and interpolation. Automated translations still need language
review and mobile layout checks, especially long text and RTL. Native file-picker
labels and browser validation messages follow the user's browser language.

Before real health data/public release, complete fresh-session MFA checks, recovery
planning, live storage/RLS review and broader security testing; resolve remaining
dependency findings and rebuild the patched Android wrapper. Record evidence per
feature and deployment. Privacy/retention, inactivity reminders, erasure with fresh
MFA and an alternative rights-request route, processor/backup handling and legal
review remain release requirements. A test report is not GDPR certification.


### Larger document transfer update

The new 50,000,000-byte upload path uses direct TUS transfers, temporary owner/MFA
reservations, quotas and private streaming downloads. Apply
`supabase/migrations/20261009_large_document_uploads.sql` before testing it.
`LARGE-UPLOAD-RELEASE.txt` records exact deployment steps, same-tab retry scope,
cleanup limits and mandatory provider/browser checks. Existing mobile evidence
does not automatically validate this new path. Run `node --test tests/*.cjs` for
unit, localization and isolated PostgreSQL migration/policy checks.
