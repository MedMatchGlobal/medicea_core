import { LanguageProvider } from "./LanguageProvider";

// ✅ Import the global CSS from *this* folder
import "./globals.css";
import "./riviera.css";

import MembershipAccess from './components/MembershipAccess';
import EmergencyHelp from './components/EmergencyHelp';
import {membershipPageEnabled, membershipPreviewEnabled} from '@/lib/membership/config';

export const metadata = {
  title: "medicéa",
  description: "Global drug matching for safe travel and relocation.",
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };


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

      </head>
      <body>
        <LanguageProvider><MembershipAccess enabled={membershipPreviewEnabled()} accountHref={membershipPageEnabled()?'/membership':undefined}>{children}</MembershipAccess><EmergencyHelp /></LanguageProvider>
      </body>
    </html>
  );
}
