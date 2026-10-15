import DiscoveryShell from '../components/DiscoveryShell';
import {modelUpgradeEnabled,modelTestConfiguration} from '../lib/openaiClient';
export default function DiscoveryLayout({children}: {children: React.ReactNode}) {
  return <><DiscoveryShell sourceOriginMode={modelUpgradeEnabled()&&modelTestConfiguration().matchingMode==='prompt-test'} />{children}</>;
}
