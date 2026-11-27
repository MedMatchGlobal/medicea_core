import {notFound} from 'next/navigation';
import {previewToolsEnabled} from '@/app/lib/ai-config';
import {trialPrompt} from '@/app/lib/grounding/trial';
import Trial from './trial';
export const dynamic='force-dynamic';
export default function Page(){if(!previewToolsEnabled())notFound();return <Trial prompt={trialPrompt}/>;}
