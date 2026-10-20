import {normalizeSavedSearch,type SavedSearch} from './saved-searches';
export type SessionSearch={search:SavedSearch;originLeafletVisible:boolean;viewLeaflet:Record<string,boolean>};
export const sessionSearchKey=(pet=false)=>'medicea.current-search.v1.'+(pet?'pets':'human');
export function readSessionSearch(raw:string|null,pet=false):SessionSearch|null{
 try{if(!raw||raw.length>2_000_000)return null;const value=JSON.parse(raw),search=normalizeSavedSearch(value.search,600);if(!search||(search.mode==='pets'||search.mode==='pet-generic')!==pet)return null;
 const viewLeaflet:Record<string,boolean>={};for(const name of Object.keys(search.leaflets))if(value.viewLeaflet?.[name]===true)Object.defineProperty(viewLeaflet,name,{value:true,enumerable:true});
 return {search,originLeafletVisible:value.originLeafletVisible!==false,viewLeaflet};
 }catch{return null;}
}
// The current tab only. Saved searches remain an independent, explicit action.
export function storeSessionSearch(storage:Pick<Storage,'getItem'|'setItem'>,entry:SessionSearch,pet=false){
 const raw=JSON.stringify(entry),clean=readSessionSearch(raw,pet);if(!clean)return null;
 try{storage.setItem(sessionSearchKey(pet),JSON.stringify(clean));return clean;}catch{return null;}
}
export function resultHistoryState(state:any,leaflet?:string){const next={...state,mediceaMedicineResults:true};if(leaflet)next.mediceaMedicineLeaflet=leaflet;else delete next.mediceaMedicineLeaflet;return next;}
export function formHistoryState(state:any){const next={...state};delete next.mediceaMedicineResults;delete next.mediceaMedicineLeaflet;return next;}
