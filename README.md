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

## Separate private vault

The account, authenticator, recovery and fictional-data document/medicine vault now live in the private [medicea-vault repository](https://github.com/MedMatchGlobal/medicea-vault). This core app contains public medicine discovery only; its former /account and /vault routes are removed rather than redirected to a temporary preview host.

Existing Supabase users, MFA factors, records, storage buckets and policies are unchanged. Vault dependencies and security tests are maintained in the standalone project. Remove the private-vault Supabase and beta/recovery environment variables from the core Vercel project after deploying this cutover; retain them in the protected standalone Preview environment.

On 12 October 2026, Sergio verified the standalone protected preview: existing account/MFA and records, exact-limit fictional upload, persistence after refresh, download/open, deletion with an unavailable old URL, and denial of an existing secondary-account document from the primary account. These are user-performed acceptance checks. They do not constitute public-vault or real-health-data release approval.

Verify medicine behavior with `node --test tests/*.cjs` and `npm run build`. Refined prompts and their preservation baseline remain unchanged.
