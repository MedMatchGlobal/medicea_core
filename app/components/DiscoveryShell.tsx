'use client';
import {usePathname} from 'next/navigation';
import {MedicineWorkspace} from '../MedicineWorkspace';
export default function DiscoveryShell({sourceOriginMode=false}:{sourceOriginMode?:boolean}) {
  const pathname = usePathname();
  return <MedicineWorkspace petMode={pathname === '/pets'} sourceOriginMode={sourceOriginMode} />;
}
