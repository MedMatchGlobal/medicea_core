import {redirect} from 'next/navigation';
import {membershipPreviewEnabled} from '@/lib/membership/config';
import LegacyTerms from './LegacyTerms';
export const dynamic='force-dynamic';
export default function TermsPage(){
 if(membershipPreviewEnabled())redirect('/membership/information#terms');
 return <LegacyTerms/>;
}
