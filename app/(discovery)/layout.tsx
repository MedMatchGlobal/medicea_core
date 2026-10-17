import DiscoveryShell from '../components/DiscoveryShell';
import {modelUpgradeEnabled,modelTestConfiguration} from '../lib/openaiClient';
import {travelPreviewEnabled} from '../lib/travel-demo';
// Preview-only navigation must follow runtime deployment flags, not a cached build.
export const dynamic='force-dynamic';
export default function DiscoveryLayout({children}: {children: React.ReactNode}) {
  return <><DiscoveryShell travelDemo={travelPreviewEnabled()} sourceOriginMode={modelUpgradeEnabled()&&modelTestConfiguration().matchingMode==='prompt-test'} />{children}</>;
}
