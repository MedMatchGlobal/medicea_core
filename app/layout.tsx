import Script from "next/script";
import { Suspense } from "react";

// ✅ Import the global CSS from *this* folder
import "./globals.css";

import GATracker from "./ga-tracker";

export const metadata = {
  title: "medicéa",
  description: "Global drug matching for safe travel and relocation.",
};

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
      <body style={{ overflow: "scroll" }}>
        <Suspense fallback={null}>
          <GATracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
