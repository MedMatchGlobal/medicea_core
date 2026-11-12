import {notFound} from 'next/navigation';
import {claudePreviewEnabled} from '@/app/lib/claude-preview';
import {bareEquivalentPrompt} from '@/app/lib/bare-equivalent-search';
import BareEquivalentTest from './test';
export const dynamic='force-dynamic';
export default function Page(){
 if(!claudePreviewEnabled())notFound();
 return <BareEquivalentTest prompt={bareEquivalentPrompt}/>;
}
