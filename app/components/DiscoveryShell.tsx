'use client';
import {usePathname} from 'next/navigation';
import {MedicineWorkspace} from '../MedicineWorkspace';
export default function DiscoveryShell({sourceOriginMode=false,travelDemo=false,originIdentificationMode=false}:{sourceOriginMode?:boolean;travelDemo?:boolean;originIdentificationMode?:boolean}) {
  const pathname = usePathname();
  return <MedicineWorkspace originIdentificationMode={originIdentificationMode} petMode={pathname === '/pets'} sourceOriginMode={sourceOriginMode} travelDemo={travelDemo}/>;
}
