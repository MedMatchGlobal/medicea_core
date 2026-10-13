import {notFound} from 'next/navigation';
import {membershipPreviewEnabled} from '@/lib/membership/config';
import InformationContent from './InformationContent';
export const dynamic='force-dynamic';
export const metadata={title:'Account information · medicéa',robots:{index:false,follow:false}};
export default function Information(){if(!membershipPreviewEnabled())notFound();return <InformationContent/>;}
