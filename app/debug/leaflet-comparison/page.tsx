import {notFound} from 'next/navigation';
import {leafletComparisonEnabled} from '@/app/lib/leaflet-comparison';
import Comparison from './Comparison';
export const dynamic='force-dynamic';
export default function Page(){if(!leafletComparisonEnabled())notFound();return <Comparison/>;}
