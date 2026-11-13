import type {CareLocationError} from '../lib/care-location';
const copy={
 en:{pending:'Finding your device location…',ready:'Using your device location.',denied:'Location permission was denied. Allow location access, or untick the box and enter a town or address.',timeout:'Your location request timed out. Untick and tick the box to try again, or enter an address.',unavailable:'Your device location is unavailable. Untick the box and enter a town or address.'},
 it:{pending:'Ricerca della posizione del dispositivo…',ready:'Posizione del dispositivo in uso.',denied:'Accesso alla posizione negato. Consenti l’accesso oppure deseleziona la casella e inserisci una città o un indirizzo.',timeout:'Tempo scaduto. Deseleziona e riseleziona la casella per riprovare, oppure inserisci un indirizzo.',unavailable:'Posizione non disponibile. Deseleziona la casella e inserisci una città o un indirizzo.'},
};
export default function CareLocationStatus({enabled,pending,error,coordinates,lang}:{enabled:boolean;pending:boolean;error:CareLocationError|null;coordinates:string;lang:string}){
 if(!enabled)return null;const t=copy[lang as keyof typeof copy]||copy.en;
 return <p role={error?'alert':'status'} aria-live="polite" className="search-note">{pending?t.pending:error?t[error]:coordinates?t.ready:t.pending}</p>;
}
