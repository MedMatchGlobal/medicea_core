import {bareEquivalentSearch} from '@/app/lib/bare-equivalent-search';
import {withMembership} from '@/lib/membership/meter';
export const maxDuration=60;
export const POST=withMembership(bareEquivalentSearch,'text');
