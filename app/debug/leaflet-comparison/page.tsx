import {notFound} from 'next/navigation';
import {travelSolEnabled} from '@/app/lib/openaiClient';
import Comparison from './Comparison';
export const dynamic='force-dynamic';
export default function Page(){if(!travelSolEnabled())notFound();return <Comparison/>;}
