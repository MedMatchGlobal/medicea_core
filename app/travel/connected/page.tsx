import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {travelPreviewEnabled} from '../../lib/travel-demo';
import ConnectedGate from '../ConnectedGate';
import '../travel.css';
export const dynamic='force-dynamic';
export const metadata={title:'Connected test demo · medicéa',robots:{index:false,follow:false}};
export default function Page(){if(!travelPreviewEnabled())notFound();return <Suspense fallback={null}><ConnectedGate/></Suspense>;}
