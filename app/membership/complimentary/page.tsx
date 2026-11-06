import {notFound} from 'next/navigation';
import {membershipPreviewEnabled} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {isMembershipAdmin} from '@/lib/membership/complimentary';
import ComplimentaryManager from './manager';
export const dynamic='force-dynamic';
export const metadata={title:'Complimentary access · medicéa',robots:{index:false,follow:false}};
export default async function Page(){
 if(!membershipPreviewEnabled())notFound();
 const user=await membershipUser(true);
 if(!isMembershipAdmin(user))return <main style={{padding:32}}><h1>Owner access only</h1><p>Sign in with your owner account to manage complimentary access.</p><a href="/membership">Go to your account</a></main>;
 return <ComplimentaryManager/>;
}
