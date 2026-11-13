import {notFound} from 'next/navigation';
import {claudePreviewEnabled} from '@/app/lib/claude-preview';
import {trialPrompt} from '@/app/lib/grounding/trial';
import Trial from './trial';
export const dynamic='force-dynamic';
export default function Page(){if(!claudePreviewEnabled())notFound();return <Trial prompt={trialPrompt}/>;}
