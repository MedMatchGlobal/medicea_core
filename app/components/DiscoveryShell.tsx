'use client';
import {usePathname} from 'next/navigation';
import {MedicineWorkspace} from '../MedicineWorkspace';
export default function DiscoveryShell() {
  const pathname = usePathname();
  return <MedicineWorkspace petMode={pathname === '/pets'} />;
}
