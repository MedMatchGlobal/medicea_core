import {notFound} from 'next/navigation';
import {previewToolsEnabled} from '@/app/lib/ai-config';
import {bareEquivalentPrompt} from '@/app/lib/bare-equivalent-search';
import BareEquivalentTest from './test';
export const dynamic='force-dynamic';
export default function Page(){
 if(!previewToolsEnabled())notFound();
 return <BareEquivalentTest prompt={bareEquivalentPrompt}/>;
}
