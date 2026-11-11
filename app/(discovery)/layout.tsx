import DiscoveryShell from '../components/DiscoveryShell';
export default function DiscoveryLayout({children}: {children: React.ReactNode}) {
  return <><DiscoveryShell originVariantSelectionEnabled={process.env.VERCEL_ENV==='preview'||process.env.NODE_ENV==='development'} />{children}</>;
}
