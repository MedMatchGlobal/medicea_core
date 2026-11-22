import {headers} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {membershipPageEnabled,membershipPreviewEnabled,membershipOrigin} from '@/lib/membership/config';
import {canonicalMembershipUrl,currencyForCountry} from '@/lib/membership/presentation';
import MembershipPreview from './preview';
export const dynamic='force-dynamic';
export const metadata={title:'Membership test preview · medicéa',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{checkout?:string|string[]}>}){
 if(!membershipPageEnabled())notFound();
 const requestHeaders=await headers();
 const configuredOrigin=process.env.MEDICEA_MEMBERSHIP_ORIGIN ? membershipOrigin() : undefined;
 const destination=canonicalMembershipUrl(configuredOrigin,requestHeaders.get('host'),(await searchParams).checkout);
 if(destination)redirect(destination);
 return <MembershipPreview billingEnabled={membershipPreviewEnabled()} currency={currencyForCountry(requestHeaders.get('x-vercel-ip-country'))}/>;
}
