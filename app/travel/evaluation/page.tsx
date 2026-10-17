import {notFound} from 'next/navigation';
import {travelPreviewEnabled} from '../../lib/travel-demo';
import {connectedTravelEnabled} from '../../lib/travel-connected';
import Evaluation from './preview';
export const dynamic='force-dynamic';
export const metadata={title:'Owner search evaluation · medicéa',robots:{index:false,follow:false}};
export default function Page(){if(!travelPreviewEnabled()||!connectedTravelEnabled())notFound();return <Evaluation/>;}
