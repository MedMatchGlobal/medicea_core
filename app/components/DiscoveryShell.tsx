'use client';
import {usePathname} from 'next/navigation';
import {MedicineWorkspace} from '../MedicineWorkspace';
export default function DiscoveryShell({originVariantSelectionEnabled=false}:{originVariantSelectionEnabled?:boolean}) {
  const pathname = usePathname();
  return <MedicineWorkspace petMode={pathname === '/pets'} originVariantSelectionEnabled={originVariantSelectionEnabled} />;
}
