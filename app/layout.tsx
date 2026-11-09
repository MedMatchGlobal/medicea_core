import Script from "next/script";
import { Suspense } from "react";
import { LanguageProvider } from "./LanguageProvider";

// ✅ Import the global CSS from *this* folder
import "./globals.css";
import "./riviera.css";

import GATracker from "./ga-tracker";
import MembershipAccess from './components/MembershipAccess';
import EmergencyHelp from './components/EmergencyHelp';
import {membershipPreviewEnabled} from '@/lib/membership/config';

export const metadata = {
  title: "medicéa",
  description: "Global drug matching for safe travel and relocation.",
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

const GA_ID = "G-0T2C9SV02B";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600;700&family=Patrick+Hand&display=swap"
          rel="stylesheet"
        />

        {/* Google Analytics Scripts */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { send_page_view: false });
          `}
        </Script>
      </head>
      <body>
        <Suspense fallback={null}>
          <GATracker />
        </Suspense>
        <LanguageProvider><MembershipAccess enabled={membershipPreviewEnabled()} accountHref={process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='design/riviera-one-page'?'https://medicea-core-git-feature-google-17fe5b-medmatchglobals-projects.vercel.app/membership':undefined}>{children}</MembershipAccess><EmergencyHelp /></LanguageProvider>
      </body>
    </html>
  );
}
