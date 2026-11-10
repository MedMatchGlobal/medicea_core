import {notFound} from 'next/navigation';
import {membershipPageEnabled} from '@/lib/membership/config';
import MembershipPreview from './preview';
export const dynamic='force-dynamic';
export const metadata={title:'Membership test preview · medicéa',robots:{index:false,follow:false}};
export default function Page(){if(!membershipPageEnabled())notFound();return <MembershipPreview/>;}
