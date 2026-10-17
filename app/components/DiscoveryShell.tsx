'use client';
import {usePathname} from 'next/navigation';
import {MedicineWorkspace} from '../MedicineWorkspace';
export default function DiscoveryShell({sourceOriginMode=false,travelDemo=false}:{sourceOriginMode?:boolean;travelDemo?:boolean}) {
  const pathname = usePathname();
  return <MedicineWorkspace petMode={pathname === '/pets'} sourceOriginMode={sourceOriginMode} travelDemo={travelDemo}/>;
}
