import Script from "next/script";
import { Suspense } from "react";
import { LanguageProvider } from "./LanguageProvider";

// ✅ Import the global CSS from *this* folder
import "./globals.css";

import GATracker from "./ga-tracker";
import MembershipAccess from './components/MembershipAccess';
import {membershipPreviewEnabled} from '@/lib/membership/config';
import {connectedTravelEnabled} from './lib/travel-connected';
import {modelTestConfiguration} from './lib/openaiClient';

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
  const modelTest=modelTestConfiguration();
  const originalTravel=connectedTravelEnabled();
  return (
    <html lang="en">
      <head>
        {/* Google Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap"
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
        {modelTest.enabled && <aside className="model-test-banner" aria-label="Model test version">
          <strong>{originalTravel?(process.env.MEDICEA_ORGANISED_LEAFLET==='false'?'Dev · Leaflet baseline 19 Oct 12:09 BST · 5af3e82':'Dev · Organised human leaflet prompt test · v1'):'Model test · '+modelTest.revision}</strong>
          <span>Research: {originalTravel?'gpt-6.1-sol (original matching prompts)':modelTest.researchModel} · Medicine summaries: {modelTest.informationModel}</span>
          <span>{originalTravel?'Medicine matching retains Production prompts. Dev leaflets use 11 sections and a separate price lookup. The leaflet appears while prices finish. AI outputs remain unverified.':modelTest.matchingMode==='prompt-test'?'Source-assisted origin lookup · 10-country pilot · Equivalent suggestions remain unverified.':'Official-source pilot · 10-country coverage.'} An empty result is valid.</span>
          <a href="https://medicea.global" target="_blank" rel="noopener noreferrer">Open current version for comparison ↗</a>
        </aside>}
        <Suspense fallback={null}>
          <GATracker />
        </Suspense>
        <LanguageProvider><MembershipAccess enabled={membershipPreviewEnabled()}>{children}</MembershipAccess></LanguageProvider>
      </body>
    </html>
  );
}
