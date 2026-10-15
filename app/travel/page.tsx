import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {travelPreviewEnabled} from '../lib/travel-demo';
import TravelDemo from './preview';
import './travel.css';
export const dynamic='force-dynamic';
export const metadata={title:'Travel demonstration · medicéa',robots:{index:false,follow:false}};
export default function Page(){if(!travelPreviewEnabled())notFound();return <Suspense fallback={null}><TravelDemo/></Suspense>;}
