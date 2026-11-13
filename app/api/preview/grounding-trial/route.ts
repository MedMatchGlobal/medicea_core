import {groundingTrial} from '@/app/lib/grounding/trial';
import {withMembership} from '@/lib/membership/meter';
export const maxDuration=75;
export const POST=withMembership(groundingTrial,'text');
