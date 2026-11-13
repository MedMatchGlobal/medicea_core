import type {CareLocationError} from '../lib/care-location';
const copy={
 en:{retry:'Try again',pending:'Finding your device location…',ready:'Using your device location.',denied:'Location permission was denied. Allow location access, or untick the box and enter a town or address.',timeout:'Your location request timed out. Try again, or enter a town or address above.',unavailable:'Your device location is unavailable. Enter a town or address above, or try again.'},
 it:{retry:'Riprova',pending:'Ricerca della posizione del dispositivo…',ready:'Posizione del dispositivo in uso.',denied:'Accesso alla posizione negato. Consenti l’accesso oppure deseleziona la casella e inserisci una città o un indirizzo.',timeout:'Tempo scaduto. Riprova oppure inserisci una città o un indirizzo sopra.',unavailable:'Posizione non disponibile. Inserisci una città o un indirizzo sopra, oppure riprova.'},
};
export function careLocationCopy(lang:string){return copy[lang as keyof typeof copy]||copy.en;}
export default function CareLocationStatus({enabled,pending,error,coordinates,lang,onRetry}:{enabled:boolean;pending:boolean;error:CareLocationError|null;coordinates:string;lang:string;onRetry?:()=>void}){
 if(!enabled)return null;const t=careLocationCopy(lang);
 return <div><p role={error?'alert':'status'} aria-live="polite" className="search-note">{pending?t.pending:error?t[error]:coordinates?t.ready:t.pending}</p>{error&&onRetry&&<button type="button" className="clear-search" onClick={onRetry}>{t.retry}</button>}</div>;
}
