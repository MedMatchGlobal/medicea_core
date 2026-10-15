'use client';
import {usePathname} from 'next/navigation';
import {MedicineWorkspace} from '../MedicineWorkspace';
import TravelNav from './TravelNav';
export default function DiscoveryShell({sourceOriginMode=false,travelDemo=false}:{sourceOriginMode?:boolean;travelDemo?:boolean}) {
  const pathname = usePathname();
  return <>{travelDemo&&<div className="travel-discovery-nav"><TravelNav/></div>}<MedicineWorkspace petMode={pathname === '/pets'} sourceOriginMode={sourceOriginMode} /></>;
}
